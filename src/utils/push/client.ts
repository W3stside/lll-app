// Browser-only helpers for Web Push. Every function guards against SSR so they
// are safe to import from components rendered on the server.

import type { IPushSubscriptionJSON } from "@/types";

const SW_URL = "/sw.js";
const SUBSCRIBE_API = "/api/push/subscribe";

export type PushSupport =
  // iOS Safari tab: push only exists once added to the Home Screen
  | "ios-needs-install"
  // Browser can do push right now
  | "supported"
  | "unsupported";

function _isBrowser(): boolean {
  return typeof window !== "undefined" && typeof navigator !== "undefined";
}

function _isIos(): boolean {
  // iPadOS 13+ reports itself as "Macintosh", so also check for touch
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.userAgent.includes("Macintosh") && navigator.maxTouchPoints > 1)
  );
}

function _isStandalone(): boolean {
  const nav = navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    nav.standalone === true
  );
}

// VAPID keys are base64url; PushManager wants the raw bytes.
// Backed by an explicit ArrayBuffer (return type inferred) so it satisfies
// BufferSource under newer TS DOM typings.
function _urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i += 1) {
    bytes[i] = raw.charCodeAt(i);
  }
  return bytes;
}

async function _getRegistration(): Promise<ServiceWorkerRegistration> {
  const existing = await navigator.serviceWorker.getRegistration(SW_URL);
  if (existing !== undefined) return existing;

  await navigator.serviceWorker.register(SW_URL, { scope: "/" });
  return await navigator.serviceWorker.ready;
}

// DOM typings mark endpoint/keys as optional on toJSON(), so narrow explicitly
// instead of casting - a subscription without keys can't be pushed to anyway.
function _toSubscriptionJSON(
  subscription: PushSubscription,
): IPushSubscriptionJSON {
  const { endpoint, expirationTime, keys } = subscription.toJSON();
  const p256dh = keys?.p256dh;
  const auth = keys?.auth;

  if (endpoint === undefined || p256dh === undefined || auth === undefined) {
    throw new Error("Browser returned an incomplete push subscription.");
  }

  return { endpoint, expirationTime, keys: { p256dh, auth } };
}

async function _sendToServer(
  method: "DELETE" | "POST",
  body: IPushSubscriptionJSON | { endpoint: string },
): Promise<void> {
  const res = await fetch(SUBSCRIBE_API, {
    method,
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const { message } = (await res.json().catch(() => ({}))) as {
      message?: string;
    };
    throw new Error(
      message ?? `Push subscription request failed (${res.status})`,
    );
  }
}

export function getPushSupport(): PushSupport {
  if (!_isBrowser()) return "unsupported";

  const hasApis =
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window;

  if (hasApis) return "supported";
  if (_isIos() && !_isStandalone()) return "ios-needs-install";
  return "unsupported";
}

export function getNotificationPermission(): NotificationPermission {
  if (!_isBrowser() || !("Notification" in window)) return "default";
  return Notification.permission;
}

export async function getCurrentPushSubscription(): Promise<PushSubscription | null> {
  if (getPushSupport() !== "supported") return null;

  const registration = await navigator.serviceWorker.getRegistration(SW_URL);
  if (registration === undefined) return null;

  return await registration.pushManager.getSubscription();
}

/** Registers the service worker without prompting for permission. */
export async function registerServiceWorker(): Promise<void> {
  if (getPushSupport() !== "supported") return;
  await _getRegistration();
}

/**
 * Must be called from a user gesture (click/tap): Safari and Firefox refuse to
 * show the permission prompt otherwise.
 */
export async function subscribeToPush(): Promise<void> {
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (vapidPublicKey === undefined || vapidPublicKey === "") {
    throw new Error("Notifications are not configured on this server.");
  }
  if (getPushSupport() !== "supported") {
    throw new Error("This browser does not support notifications.");
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error(
      permission === "denied"
        ? "Notifications are blocked. Enable them in your browser settings."
        : "Notification permission was dismissed.",
    );
  }

  const registration = await _getRegistration();
  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: _urlBase64ToUint8Array(vapidPublicKey),
    }));

  // Always re-send: the row may belong to another user who used this device
  await _sendToServer("POST", _toSubscriptionJSON(subscription));
}

/** Removes this device's subscription from the browser and the server. */
export async function unsubscribeFromPush(): Promise<void> {
  const subscription = await getCurrentPushSubscription();
  if (subscription === null) return;

  const { endpoint } = subscription;
  await subscription.unsubscribe();
  await _sendToServer("DELETE", { endpoint });
}
