const CACHE_VERSION = "v3.4-deadlines-home";
const STATIC_CACHE = `life-quest-static-${CACHE_VERSION}`;
const API_CACHE = `life-quest-api-${CACHE_VERSION}`;
const STATIC_ASSETS = ["/", "/index.html", "/manifest.json"];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  const expectedCaches = [STATIC_CACHE, API_CACHE];
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => !expectedCaches.includes(k))
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  // Always bypass ServiceWorker for non-GET requests (mutations must reach backend directly)
  if (e.request.method !== "GET") {
    return;
  }

  const url = new URL(e.request.url);

  // 1. API GET Requests -> Network First with 3s Timeout & Cache Fallback
  if (url.pathname.startsWith("/api/")) {
    // Exclude SSE/streaming endpoints or auth refresh if any
    if (url.pathname.includes("/stream") || url.pathname.includes("/health")) {
      return;
    }

    e.respondWith(
      new Promise((resolve) => {
        let didTimeOut = false;
        const timer = setTimeout(() => {
          didTimeOut = true;
          // Fallback to cache on network timeout (> 3s)
          caches.open(API_CACHE).then((cache) =>
            cache.match(e.request).then((cached) => {
              if (cached) resolve(cached);
            })
          );
        }, 3000);

        fetch(e.request)
          .then((networkResponse) => {
            clearTimeout(timer);
            if (networkResponse && networkResponse.status === 200) {
              const resClone = networkResponse.clone();
              caches.open(API_CACHE).then((cache) => cache.put(e.request, resClone));
            }
            resolve(networkResponse);
          })
          .catch(() => {
            clearTimeout(timer);
            // Fallback to cache on network failure (offline)
            caches.open(API_CACHE).then((cache) =>
              cache.match(e.request).then((cached) => {
                if (cached) {
                  resolve(cached);
                } else {
                  resolve(new Response(JSON.stringify({ error: "Offline & no cache available" }), {
                    status: 503,
                    headers: { "Content-Type": "application/json" },
                  }));
                }
              })
            );
          });
      })
    );
    return;
  }

  // 2. Vite Hashed Chunks & Static Assets (/assets/*, /backgrounds/*) -> Cache First (Instant 0-1ms)
  if (url.pathname.startsWith("/assets/") || url.pathname.startsWith("/backgrounds/")) {
    e.respondWith(
      caches.match(e.request).then((cached) => {
        if (cached) return cached;
        return fetch(e.request).then((res) => {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(e.request, clone));
          }
          return res;
        });
      })
    );
    return;
  }

  // 3. Google Fonts & CDN -> Stale While Revalidate
  if (url.hostname.includes("fonts.googleapis.com") || url.hostname.includes("fonts.gstatic.com")) {
    e.respondWith(
      caches.match(e.request).then((cached) => {
        const fetchPromise = fetch(e.request)
          .then((res) => {
            if (res && res.status === 200) {
              const clone = res.clone();
              caches.open(STATIC_CACHE).then((cache) => cache.put(e.request, clone));
            }
            return res;
          })
          .catch(() => cached);
        return cached || fetchPromise;
      })
    );
    return;
  }

  // 4. Navigation HTML request -> Network First with /index.html Cache Fallback
  if (e.request.mode === "navigate") {
    e.respondWith(
      fetch(e.request).catch(() => caches.match("/index.html"))
    );
  }
});

// Push & Notification click events
self.addEventListener("push", (event) => {
  if (!event.data) return;
  try {
    const data = event.data.json();
    const options = {
      body: data.body || "Bạn có thông báo mới từ Pomodoro Focus Hub",
      icon: data.icon || "/favicon.ico",
      badge: "/favicon.ico",
      vibrate: [100, 50, 100],
      data: { url: data.url || "/" },
    };
    event.waitUntil(
      self.registration.showNotification(data.title || "Pomodoro Focus Hub", options)
    );
  } catch (err) {
    console.error("Push event error:", err);
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow("/");
      }
    })
  );
});
