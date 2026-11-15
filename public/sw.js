// Minimal service worker — exists to satisfy PWA installability criteria and
// to receive push notifications. This app is dynamic and per-user (wallet
// balances, admin data, sessions), so it deliberately does NOT cache pages or
// API responses: a cache-first or stale-while-revalidate strategy here would
// risk showing one user's cached data to another, or stale wallet/session
// state after login/logout.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Deliberately empty. A registered fetch handler is what makes the app
// installable, but calling respondWith(fetch(event.request)) — which this
// used to do — routes every request for HTML, JS, images and APIs through the
// worker thread and back out again, for no benefit at all. On a phone that is
// a measurable tax on every navigation, and it interferes with streamed
// responses: the shell arrives and the body crawls in behind it.
//
// Returning without calling respondWith() hands the request straight back to
// the browser, which handles it natively.
self.addEventListener("fetch", () => {});

// ── Push ─────────────────────────────────────────────────────────────────────
// A browser can only show a notification from inside the service worker, even
// when every tab is closed — which is the whole point of a reminder.

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    // A push with a non-JSON body shouldn't be swallowed silently; show
    // something rather than nothing.
    payload = { title: "Nirapode", body: event.data ? event.data.text() : "" };
  }

  const title = payload.title || "Nirapode";
  const options = {
    body: payload.body || "",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    // Replaces an earlier notification with the same tag instead of stacking
    // duplicates if a reminder is retried.
    tag: payload.tag || "nirapode",
    renotify: Boolean(payload.tag),
    requireInteraction: false,
    data: { url: payload.url || "/reminders" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "/reminders";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      // Focus a tab that's already open rather than piling up new ones.
      for (const client of clients) {
        if ("focus" in client) {
          client.navigate(target).catch(() => {});
          return client.focus();
        }
      }
      return self.clients.openWindow(target);
    })
  );
});
