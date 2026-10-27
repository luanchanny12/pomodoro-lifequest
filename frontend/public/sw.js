const CACHE = "life-quest-v3.1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  // Always bypass ServiceWorker for API calls and non-GET requests
  if (e.request.url.includes("/api/") || e.request.method !== 'GET') {
    return;
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

