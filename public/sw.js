// Served by the app with __VERSION__ replaced by a hash of public/, so any change ships a new worker.
const CACHE = 'awaaz-__VERSION__';
const SHELL = ['/offline', '/css/app.css', '/js/common.js', '/js/sw-register.js', '/icons/icon.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('awaaz-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

// Pages: fresh from the network when it answers quickly, otherwise the last copy we saw.
async function page(request) {
  const cache = await caches.open(CACHE);
  try {
    const response = await withTimeout(fetch(request), 6000);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    return (await cache.match(request)) || (await cache.match('/offline')) || Response.error();
  }
}

// CSS/JS/icons: serve the cached copy instantly and refresh it in the background.
async function asset(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request, { ignoreSearch: true });
  const refresh = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => cached);
  return cached || refresh;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  // Audio, API calls, downloads and admin always go straight to the network.
  if (/^\/(a|api|admin)\//.test(url.pathname) || url.pathname === '/admin' || url.pathname.endsWith('.zip')) return;

  if (request.mode === 'navigate') {
    event.respondWith(page(request));
  } else if (/^\/(css|js|icons)\//.test(url.pathname)) {
    event.respondWith(asset(request));
  }
});
