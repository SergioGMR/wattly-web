const CACHE_NAME = 'wattly-v1';
const STATIC_CACHE = 'wattly-static-v1';
const API_CACHE = 'wattly-api-v1';

const STATIC_ASSETS = ['/', '/favicon.svg', '/favicon.ico', '/icon.webp', '/manifest.webmanifest'];

// Install: pre-cache the shell
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_ASSETS)));
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== STATIC_CACHE && key !== API_CACHE && key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
  );
  self.clients.claim();
});

// Fetch strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET
  if (request.method !== 'GET') return;

  // API requests: network-first, cache fallback
  if (url.pathname.startsWith('/api/') || url.hostname.includes('precio-lux-api')) {
    event.respondWith(networkFirstWithCache(request, API_CACHE));
    return;
  }

  // HTML navigation: stale-while-revalidate
  if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(staleWhileRevalidate(request, CACHE_NAME));
    return;
  }

  // Static assets: cache-first
  event.respondWith(cacheFirst(request, STATIC_CACHE));
});

async function networkFirstWithCache(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return (
      cached ||
      new Response(JSON.stringify({ error: 'offline' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      })
    );
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => null);

  return (
    cached ||
    (await fetchPromise) ||
    new Response(offlineHTML(), {
      status: 200,
      headers: { 'Content-Type': 'text/html' },
    })
  );
}

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('', { status: 503 });
  }
}

function offlineHTML() {
  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Wattly — Sin conexión</title>
  <style>
    body { font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f9fafb; color: #1f2937; text-align: center; padding: 1rem; }
    .container { max-width: 24rem; }
    h1 { font-size: 1.5rem; margin-bottom: 0.5rem; }
    p { color: #6b7280; font-size: 0.875rem; line-height: 1.5; }
    button { margin-top: 1rem; padding: 0.5rem 1.5rem; background: #111827; color: white; border: none; border-radius: 0.5rem; font-size: 0.875rem; cursor: pointer; }
    @media (prefers-color-scheme: dark) {
      body { background: #030712; color: #f3f4f6; }
      p { color: #9ca3af; }
      button { background: white; color: #111827; }
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Sin conexión</h1>
    <p>No hay conexión a internet. Cuando vuelvas a estar conectado, recargá la página para ver los precios actualizados.</p>
    <button onclick="location.reload()">Reintentar</button>
  </div>
</body>
</html>`;
}
