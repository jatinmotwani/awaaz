import crypto from 'node:crypto';
import express from 'express';
import { parseCookies } from '../lib/cookies.js';
import { hashPin, isValidPin, safeEqual } from '../lib/pin.js';
import { rateLimit } from '../lib/rate-limit.js';
import { adminLoginPage, adminPage } from '../views/admin.js';

const COOKIE = 'awz_admin';
const FLASH = {
  hidden: 'Dedication hidden.',
  shown: 'Dedication shown again.',
  reset: 'PIN reset. Tell the family the new PIN.',
  nopage: 'No page with that link.',
  badpin: 'The PIN should be 4 to 8 digits.',
};

// A single-operator dashboard, enabled only when ADMIN_TOKEN is set.
export function adminRouter(ctx) {
  const { config, repo } = ctx;
  const router = express.Router();
  if (!config.adminToken) return router;

  const form = express.urlencoded({ extended: false, limit: '10kb' });
  const session = crypto.createHmac('sha256', config.secret).update(`admin:${config.adminToken}`).digest('base64url');
  const send = (res, page, status = 200) => res.status(status).type('html').set('Cache-Control', 'no-store').send(String(page));
  const signedIn = (req) => {
    const value = parseCookies(req.headers.cookie)[COOKIE];
    return Boolean(value) && safeEqual(Buffer.from(value), Buffer.from(session));
  };
  const guard = (req, res, next) => (signedIn(req) ? next() : res.redirect(303, '/admin'));
  const cookie = (value, maxAge) =>
    `${COOKIE}=${value}; Path=/admin; Max-Age=${maxAge}; HttpOnly; SameSite=Strict${config.production ? '; Secure' : ''}`;

  async function render(req, res, flash) {
    const [totals, pages, dedications] = await Promise.all([repo.admin.totals(), repo.admin.pages(), repo.dedications.recent()]);
    send(res, adminPage(ctx, { totals, pages, dedications, flash }));
  }

  router.get('/admin', async (req, res) => {
    if (!signedIn(req)) return send(res, adminLoginPage(ctx));
    return render(req, res, Object.hasOwn(FLASH, String(req.query.done)) ? FLASH[req.query.done] : '');
  });

  router.post('/admin/login', rateLimit({ windowMs: 15 * 60 * 1000, max: 10 }), form, (req, res) => {
    const token = String(req.body?.token || '');
    if (!safeEqual(Buffer.from(token), Buffer.from(config.adminToken))) {
      return send(res, adminLoginPage(ctx, { error: 'That token is wrong.' }), 401);
    }
    res.set('Set-Cookie', cookie(session, 7 * 24 * 3600));
    return res.redirect(303, '/admin');
  });

  router.post('/admin/logout', (req, res) => {
    res.set('Set-Cookie', cookie('', 0));
    res.redirect(303, '/admin');
  });

  router.post('/admin/dedications/:id/:action', guard, async (req, res) => {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(id) || !['hide', 'show'].includes(req.params.action)) return res.redirect(303, '/admin');
    await repo.dedications.setHidden(id, req.params.action === 'hide');
    return res.redirect(303, `/admin?done=${req.params.action === 'hide' ? 'hidden' : 'shown'}`);
  });

  router.post('/admin/reset-pin', guard, form, async (req, res) => {
    const slug = String(req.body?.slug || '').trim().split('/e/').pop().split(/[/?#]/)[0];
    const pin = String(req.body?.pin || '');
    const elder = slug ? await repo.elders.bySlug(slug) : null;
    if (!elder) return res.redirect(303, '/admin?done=nopage');
    if (!isValidPin(pin)) return res.redirect(303, '/admin?done=badpin');
    await repo.elders.update(elder.id, { pinHash: await hashPin(pin) });
    return res.redirect(303, '/admin?done=reset');
  });

  return router;
}
