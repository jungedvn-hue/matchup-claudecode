// Minimal service worker — required for Android PWA install criteria.
// Network-first passthrough. No offline caching yet (future enhancement).

const VERSION = "v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(fetch(event.request).catch(() => new Response("", { status: 504 })));
});
