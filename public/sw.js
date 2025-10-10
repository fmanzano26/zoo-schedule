// Minimal Service Worker para Zoo Schedule
const STATIC_CACHE = "static-v1";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(clients.claim());
});

// Estrategia: 
// - evita interferir con /api o /api/stream (SSE)
// - cachea recursos estáticos
// - deja pasar todo lo demás
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // No tocar APIs ni streams
  if (url.pathname.startsWith("/api") || url.pathname.includes("/api/stream")) {
    return;
  }

  // Navegación -> intenta red, fallback opcional
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(() => caches.match("/"))
    );
    return;
  }

  // Recursos estáticos locales -> cache first
  if (req.method === "GET" && url.origin === self.location.origin) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const cached = await cache.match(req);
        const fetchAndPut = fetch(req).then((res) => {
          if (res && res.status === 200 && res.type === "basic") {
            cache.put(req, res.clone());
          }
          return res;
        });
        return cached || fetchAndPut;
      })
    );
  }
});
