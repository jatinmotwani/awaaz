import crypto from 'node:crypto';
import express from 'express';
import { isId, randomId } from '../lib/ids.js';
import { isBot, parseCookies } from '../lib/cookies.js';
import { createZipWriter } from '../lib/zip.js';
import { kebab } from '../lib/text.js';
import { promptById, promptOrder } from '../content/prompts.js';
import { nearbyTowns, townBySlug, towns } from '../content/towns.js';
import { elderPage, townLabel } from '../views/elder.js';
import { homePage } from '../views/home.js';
import { learnPage } from '../views/learn.js';
import { sindhIndexPage, townPage } from '../views/sindh.js';
import { notFoundPage, offlinePage, privacyPage } from '../views/static.js';

const townName = (slug) => townBySlug.get(slug)?.name || slug;

export function pagesRouter(ctx) {
  const { config, repo, storage } = ctx;
  const router = express.Router();
  const send = (res, page, status = 200) => res.status(status).type('html').send(String(page));

  async function findElder(req, res) {
    const elder = isId(req.params.slug) ? await repo.elders.bySlug(req.params.slug) : null;
    if (!elder) send(res.set('X-Robots-Tag', 'noindex'), notFoundPage(ctx), 404);
    return elder;
  }

  // One anonymous random cookie per browser, stored hashed: how many phones opened a page.
  function countView(req, res, elder) {
    if (isBot(req.get('user-agent'))) return;
    let visitor = parseCookies(req.headers.cookie).awz_v;
    if (!/^[a-z2-9]{16}$/.test(visitor || '')) {
      visitor = randomId(16);
      res.append('Set-Cookie', `awz_v=${visitor}; Path=/; Max-Age=31536000; HttpOnly; SameSite=Lax${config.production ? '; Secure' : ''}`);
    }
    const hashed = crypto.createHash('sha256').update(`${config.secret}:${visitor}`).digest('base64url').slice(0, 22);
    repo.views.record(elder.id, hashed).catch((err) => console.error('page view', err.message));
  }

  router.get('/', async (req, res) => {
    const [totals, featured] = await Promise.all([repo.community.totals(), repo.dedications.activeFeatured()]);
    const prefillTown = townBySlug.has(req.query.town) ? req.query.town : null;
    const refCode = isId(req.query.ref) ? req.query.ref : null;
    send(res, homePage(ctx, { totals, featured, prefillTown, refCode, townName }));
  });

  router.get('/e/:slug', async (req, res) => {
    const elder = await findElder(req, res);
    if (!elder) return;
    const clipsByPrompt = new Map();
    for (const clip of await repo.clips.forElder(elder.id)) {
      if (!clipsByPrompt.has(clip.prompt_id)) clipsByPrompt.set(clip.prompt_id, []);
      clipsByPrompt.get(clip.prompt_id).push(clip);
    }
    countView(req, res, elder);
    res.set({ 'X-Robots-Tag': 'noindex', 'Cache-Control': 'no-cache' });
    send(res, elderPage(ctx, { elder, clipsByPrompt }));
  });

  router.get('/e/:slug/learn', async (req, res) => {
    const elder = await findElder(req, res);
    if (!elder) return;
    const wordClips = new Map();
    for (const clip of await repo.clips.forElder(elder.id)) {
      if (clip.prompt_id.startsWith('lafz-')) wordClips.set(clip.prompt_id, clip); // latest take wins
    }
    countView(req, res, elder);
    res.set({ 'X-Robots-Tag': 'noindex', 'Cache-Control': 'no-cache' });
    send(res, learnPage(ctx, { elder, wordClips }));
  });

  // Every recording plus a plain-text index, so the family always has its own copy.
  router.get('/e/:slug/download.zip', async (req, res) => {
    const elder = await findElder(req, res);
    if (!elder) return;
    const clips = (await repo.clips.forElder(elder.id)).sort(
      (a, b) => (promptOrder.get(a.prompt_id) ?? 1e9) - (promptOrder.get(b.prompt_id) ?? 1e9) || a.id - b.id,
    );

    const town = townLabel(elder);
    const index = [
      `${elder.display_name}${town ? ` — ${town}, Sindh` : ''}`,
      `Recorded with ${config.appName} · downloaded ${new Date().toISOString().slice(0, 10)}`,
      '',
    ];

    res.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${kebab(elder.display_name) || 'recordings'}-recordings.zip"`,
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex',
    });
    let aborted = false;
    res.on('close', () => (aborted = !res.writableFinished));
    const zip = createZipWriter(
      (buf) =>
        new Promise((resolve, reject) => {
          if (aborted) return reject(new Error('client went away'));
          if (res.write(buf)) return resolve();
          const done = () => {
            res.off('drain', done);
            res.off('close', done);
            return aborted ? reject(new Error('client went away')) : resolve();
          };
          res.on('drain', done);
          res.on('close', done);
          return undefined;
        }),
    );

    try {
      const seen = new Map();
      for (const clip of clips) {
        const prompt = promptById.get(clip.prompt_id);
        const n = (seen.get(clip.prompt_id) || 0) + 1;
        seen.set(clip.prompt_id, n);
        const position = String((promptOrder.get(clip.prompt_id) ?? 99) + 1).padStart(2, '0');
        const ext = clip.storage_key.split('.').pop();
        const name = `${position}-${clip.prompt_id}${n > 1 ? `-${n}` : ''}.${ext}`;
        await zip.add(name, await storage.get(clip.storage_key), new Date(clip.created_at));
        index.push(`${name}`, prompt ? `  ${prompt.roman}\n  ${prompt.deva}\n  ${prompt.en}` : '', '');
      }
      if (!clips.length) index.push('No recordings yet.');
      await zip.add('index.txt', Buffer.from(index.join('\n'), 'utf8'));
      await zip.finish();
      res.end();
    } catch (err) {
      if (!aborted) console.error('zip download failed', err);
      res.destroy();
    }
  });

  router.get('/a/:clipId', async (req, res) => {
    const clip = isId(req.params.clipId) ? await repo.clips.byPublicId(req.params.clipId) : null;
    if (!clip) return res.status(404).set('X-Robots-Tag', 'noindex').end();
    res.set({ 'X-Robots-Tag': 'noindex', 'X-Content-Type-Options': 'nosniff' });
    return storage.serve(req, res, { key: clip.storage_key, mime: clip.mime });
  });

  router.get('/sindh', async (req, res) => {
    const [counts, featured] = await Promise.all([repo.community.familiesByTown(), repo.dedications.activeFeatured()]);
    send(res, sindhIndexPage(ctx, { counts, featured, townName }));
  });

  router.get('/sindh/:town', async (req, res) => {
    const town = townBySlug.get(req.params.town);
    if (!town) return send(res, notFoundPage(ctx, { message: 'We don’t have that town yet. Pick it from the Sindh map.' }), 404);
    const [counts, dedications] = await Promise.all([repo.community.familiesByTown(), repo.dedications.activeForTown(town.slug)]);
    return send(
      res,
      townPage(ctx, {
        town,
        count: counts.get(town.slug) || 0,
        counts,
        dedications,
        nearby: nearbyTowns(town),
        razorpayEnabled: ctx.razorpay.enabled,
        dedicated: req.query.dedicated === '1',
      }),
    );
  });

  router.get('/privacy', (req, res) => send(res, privacyPage(ctx)));
  router.get('/offline', (req, res) => send(res, offlinePage(ctx)));

  router.get('/robots.txt', (req, res) => {
    res.type('text/plain').send(
      ['User-agent: *', 'Disallow: /a/', 'Disallow: /api/', 'Disallow: /admin', '', `Sitemap: ${config.publicUrl}/sitemap.xml`, ''].join('\n'),
    );
  });

  router.get('/sitemap.xml', (req, res) => {
    const urls = ['/', '/sindh', '/privacy', ...towns.map((t) => `/sindh/${t.slug}`)];
    res.type('application/xml').send(
      `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
        .map((u) => `  <url><loc>${config.publicUrl}${u}</loc></url>`)
        .join('\n')}\n</urlset>\n`,
    );
  });

  return router;
}
