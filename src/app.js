import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { createRepo } from './repo.js';
import { adminRouter } from './routes/admin.js';
import { apiRouter } from './routes/api.js';
import { pagesRouter } from './routes/pages.js';
import { paymentsRouter } from './routes/payments.js';
import { errorPage, notFoundPage } from './views/static.js';

const PUBLIC_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');

// A hash of everything in public/: busts caches and names the service worker's cache.
function hashDirectory(dir) {
  const hash = crypto.createHash('sha256');
  const walk = (d) => {
    for (const entry of fs.readdirSync(d, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const full = path.join(d, entry.name);
      if (entry.isDirectory()) walk(full);
      else hash.update(entry.name).update(fs.readFileSync(full));
    }
  };
  walk(dir);
  return hash.digest('hex').slice(0, 10);
}

function securityHeaders(req, res, next) {
  res.set({
    'Content-Security-Policy': [
      "default-src 'self'",
      "script-src 'self' https://checkout.razorpay.com https://*.razorpay.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https:",
      "media-src 'self' blob: https:",
      "connect-src 'self' https://*.razorpay.com",
      'frame-src https://*.razorpay.com',
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
    ].join('; '),
    'X-Content-Type-Options': 'nosniff',
    // Page links are the secret: never leak them to other sites through Referer.
    'Referrer-Policy': 'same-origin',
    'Permissions-Policy': 'microphone=(self), camera=(), geolocation=()',
    'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
  });
  next();
}

export function createApp({ config, db, storage, transcoder, razorpay, repo = createRepo(db) }) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', config.trustProxy);

  const assetVersion = hashDirectory(PUBLIC_DIR);
  const ctx = { config, db, repo, storage, transcoder, razorpay, assetVersion };

  app.use(securityHeaders);

  app.get('/healthz', async (req, res) => {
    await db.query('select 1');
    res.set('Cache-Control', 'no-store').json({ ok: true, version: assetVersion, transcoding: transcoder.available });
  });

  const swSource = fs.readFileSync(path.join(PUBLIC_DIR, 'sw.js'), 'utf8').replaceAll('__VERSION__', assetVersion);
  app.get('/sw.js', (req, res) => {
    res.type('application/javascript').set('Cache-Control', 'no-cache').send(swSource);
  });

  app.get('/manifest.webmanifest', (req, res) => {
    res.type('application/manifest+json').set('Cache-Control', 'public, max-age=3600').send(
      JSON.stringify({
        name: `${config.appName} — Sindhi family voices`,
        short_name: config.appName,
        description: 'Keep your Sindhi elders’ voices, and teach the kids Sindhi in them.',
        start_url: '/?source=pwa',
        scope: '/',
        display: 'standalone',
        background_color: '#fbf6ee',
        theme_color: '#a3212a',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: '/icons/icon.svg', sizes: 'any', type: 'image/svg+xml' },
        ],
      }),
    );
  });

  app.use(
    express.static(PUBLIC_DIR, {
      index: false,
      setHeaders(res, file) {
        // CSS/JS revalidate every time (cheap 304s) because ES module imports can't carry ?v=.
        const long = /\.(png|svg|ico|woff2?)$/.test(file);
        res.set('Cache-Control', long ? 'public, max-age=604800' : 'no-cache');
      },
    }),
  );

  app.use(apiRouter(ctx));
  app.use(paymentsRouter(ctx));
  app.use(adminRouter(ctx));
  app.use(pagesRouter(ctx));

  app.use((req, res) => {
    if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Not found' });
    return res.status(404).type('html').send(String(notFoundPage(ctx)));
  });

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    const status = err.status || err.statusCode || 500;
    let message = 'Something went wrong. Please try again.';
    if (err.type === 'entity.too.large') {
      message = `That file is too big — the limit is ${Math.round(config.audio.maxUploadBytes / 1024 / 1024)} MB.`;
    } else if (err.type === 'entity.parse.failed') {
      message = 'That request was garbled. Please try again.';
    }
    if (status >= 500) console.error(`${req.method} ${req.originalUrl}`, err);
    if (res.headersSent) return res.destroy();
    if (req.path.startsWith('/api/')) return res.status(status).json({ error: message });
    return res.status(status).type('html').send(String(errorPage(ctx)));
  });

  return app;
}
