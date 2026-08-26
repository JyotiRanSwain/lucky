/* Lucky Diagnostics — Service Worker v1 */
const CACHE = 'ld-v3';
const CATALOG_KEY_PREFIX = 'getTests|getPackages|getCategories|getLocations|getArticles|getFaqs';

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll([
    '/', '/index.html',
    '/css/style.css', '/css/banner.css', '/css/listing.css',
    '/js/config.js', '/js/common.js', '/js/api.js', '/js/cart.js',
    '/images/logo.png'
  ])));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(k => k !== CACHE).map(k => caches.delete(k))
  )));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const req = e.request;
  const url = new URL(req.url);

  // Skip non-GET / non-http
  if (req.method !== 'GET') return;
  if (!url.protocol.startsWith('http')) return;

  // API POSTs → Network-only (mutations must hit server)
  if (url.pathname === '/exec' || url.pathname.endsWith('/exec')) {
    e.respondWith(fetch(req).catch(() => offlineResponse()));
    return;
  }

  // Static assets → Cache-first
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(req);
    if (cached) {
      // Stale-while-revalidate for assets
      fetch(req).then(res => { if (res.ok) cache.put(req, res.clone()); }).catch(() => {});
      return cached;
    }
    try {
      const res = await fetch(req);
      if (res.ok) cache.put(req, res.clone());
      return res;
    } catch (err) {
      return cached || offlineResponse();
    }
  })());
});

function offlineResponse() {
  return new Response(JSON.stringify({ success: false, message: 'You are offline. Check your connection.' }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

// Listen for cache-bust messages from main thread
self.addEventListener('message', e => {
  if (e.data && e.data.type === 'BUST') caches.delete(CACHE);
});