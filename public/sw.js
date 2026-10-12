// Minimal service worker — exists only to satisfy PWA installability criteria.
// This app is dynamic and per-user (wallet balances, admin data, sessions), so
// it deliberately does NOT cache pages or API responses: a cache-first or
// stale-while-revalidate strategy here would risk showing one user's cached
// data to another, or stale wallet/session state after login/logout.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});
