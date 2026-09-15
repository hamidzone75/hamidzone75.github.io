const CACHE_NAME = "jalali-calendar-v44";
const ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./jalali.js",
  "./holidays.js",
  "./reminders.js",
  "./features.js",
  "./attachments.js",
  "./extras.js",
  "./sounds.js",
  "./manifest.json",
  "./icons/bn-icon-192.png",
  "./icons/bn-icon-512.png",
  "./icons/bn-apple-180.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return (
        cached ||
        fetch(event.request)
          .then((response) => response)
          .catch(() => {
            if (event.request.mode === "navigate") {
              return caches.match("./index.html");
            }
          })
      );
    })
  );
});

self.addEventListener("message", (event) => {
  const data = event.data;
  if (!data || data.type !== "SHOW_NOTIFICATION") return;

  const { title, body, tag, icon } = data.payload || {};
  event.waitUntil(
    self.registration.showNotification(title || "یادآوری", {
      body: body || "",
      icon: icon || "./icons/bn-icon-192.png",
      badge: "./icons/bn-icon-192.png",
      tag: tag || "reminder",
      dir: "rtl",
      lang: "fa",
      renotify: true,
      requireInteraction: false,
      data: { url: "./index.html" }
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || "./index.html";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) {
          client.postMessage({ type: "NOTIFICATION_CLICKED" });
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// Periodic background sync (when browser supports it)
self.addEventListener("periodicsync", (event) => {
  if (event.tag === "reminder-check") {
    event.waitUntil(
      clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
        list.forEach((client) => {
          client.postMessage({ type: "PERIODIC_REMINDER_CHECK" });
        });
      })
    );
  }
});
