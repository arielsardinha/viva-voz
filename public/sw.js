/**
 * VivaVoz - Service Worker para PWA e Suporte Offline
 * Versão do Cache: vivavoz-v1
 */

const CACHE_NAME = 'vivavoz-app-v1';

// Rotas e assets essenciais para pré-cache no App Shell
const PRECACHE_ASSETS = [
  '/',
  '/leituras',
  '/apoiar',
  '/manifest.webmanifest',
  '/icon.svg',
  '/favicon.ico',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Usar Promise.allSettled para garantir que falha em asset opcional não aborte o install
      return Promise.allSettled(
        PRECACHE_ASSETS.map((asset) =>
          cache.add(asset).catch((err) => {
            console.warn(`[VivaVoz SW] Falha ao pré-cachear asset: ${asset}`, err);
          })
        )
      );
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((name) => {
            if (name !== CACHE_NAME) {
              return caches.delete(name);
            }
          })
        );
      })
    ])
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Ignorar métodos que não sejam GET
  if (request.method !== 'GET') {
    return;
  }

  // Ignorar extensões do navegador ou esquemas não-HTTP
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Endpoints de API (/api/*) não devem ser cacheados pelo SW (usam rede direta)
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // Estratégia para navegação HTML (páginas)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(async () => {
          const cachedResponse = await caches.match(request);
          if (cachedResponse) {
            return cachedResponse;
          }
          // Fallback para a página inicial se a rota específica não estiver no cache
          return (await caches.match('/')) || Response.error();
        })
    );
    return;
  }

  // Estratégia Stale-While-Revalidate para assets estáticos (_next, fonts, ícones)
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
