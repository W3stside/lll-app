/* Service worker for LLL web push notifications.
 * Payload shape mirrors IPushPayload in src/types/push.ts - keep them in sync.
 * Plain JS because Next serves /public as-is (no bundling/TS). */

const DEFAULT_URL = "/signup";
const ICON = "/icons/icon-192.png";

self.addEventListener("install", () => {
  // Activate new versions immediately so push handler fixes ship without
  // waiting for every tab to close
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

function _parsePayload(event) {
  if (event.data === null) {
    return { title: "Lisbon Lowest League", body: "", url: DEFAULT_URL };
  }
  try {
    return event.data.json();
  } catch (err) {
    return {
      title: "Lisbon Lowest League",
      body: event.data.text(),
      url: DEFAULT_URL,
    };
  }
}

self.addEventListener("push", (event) => {
  const payload = _parsePayload(event);

  event.waitUntil(
    Promise.all([
      self.registration.showNotification(payload.title, {
        body: payload.body,
        icon: ICON,
        tag: payload.tag,
        // Re-alert when a newer notification replaces one with the same tag
        renotify: payload.tag !== undefined,
        data: { url: payload.url ?? DEFAULT_URL },
      }),
      // Open tabs refresh their inbox badge. Message type is read by
      // src/hooks/useUnreadNotificationsCount.ts - keep them in sync
      self.clients
        .matchAll({ type: "window", includeUncontrolled: true })
        .then((windowClients) => {
          for (const client of windowClients) {
            client.postMessage({ type: "push-received" });
          }
        }),
    ]),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = new URL(
    (event.notification.data && event.notification.data.url) || DEFAULT_URL,
    self.location.origin,
  ).href;

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        // Reuse an open tab/app window rather than stacking new ones
        for (const client of windowClients) {
          if (new URL(client.url).origin === self.location.origin) {
            // navigate() rejects for windows this worker doesn't control yet
            return client
              .focus()
              .then(() => client.navigate(targetUrl))
              .catch(() => self.clients.openWindow(targetUrl));
          }
        }
        return self.clients.openWindow(targetUrl);
      }),
  );
});

// Browsers can rotate a subscription (expiry, key rotation). Re-subscribe with
// the same VAPID key and tell the server, otherwise the user silently stops
// receiving notifications. Best-effort only: Chrome rarely fires this and the
// POST needs a live session, so usePushNotifications also re-syncs on app load.
self.addEventListener("pushsubscriptionchange", (event) => {
  const oldSubscription = event.oldSubscription;
  const applicationServerKey =
    oldSubscription && oldSubscription.options
      ? oldSubscription.options.applicationServerKey
      : null;

  if (applicationServerKey === null) return;

  event.waitUntil(
    self.registration.pushManager
      .subscribe({ userVisibleOnly: true, applicationServerKey })
      .then((newSubscription) =>
        Promise.all([
          fetch("/api/push/subscribe", {
            method: "POST",
            credentials: "same-origin",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(newSubscription.toJSON()),
          }),
          oldSubscription
            ? fetch("/api/push/subscribe", {
                method: "DELETE",
                credentials: "same-origin",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ endpoint: oldSubscription.endpoint }),
              })
            : Promise.resolve(),
        ]),
      ),
  );
});
