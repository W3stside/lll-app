import { useCallback, useEffect, useState } from "react";

import {
  type PushSupport,
  getCurrentPushSubscription,
  getNotificationPermission,
  getPushSupport,
  registerServiceWorker,
  subscribeToPush,
  unsubscribeFromPush,
} from "@/utils/push/client";

export type PushStatus =
  | PushSupport
  // Supported, but the user blocked notifications for this site
  | "denied"
  | "loading"
  | "subscribed"
  | "unsubscribed";

async function _resolveStatus(): Promise<PushStatus> {
  const support = getPushSupport();
  if (support !== "supported") return support;
  if (getNotificationPermission() === "denied") return "denied";

  const subscription = await getCurrentPushSubscription();
  return subscription !== null && getNotificationPermission() === "granted"
    ? "subscribed"
    : "unsubscribed";
}

function _toError(error: unknown): Error {
  return error instanceof Error ? error : new Error("Unknown error occurred.");
}

export function usePushNotifications() {
  const [status, setStatus] = useState<PushStatus>("loading");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Never rejects, so it is safe inside `finally` blocks
  const refresh = useCallback(async () => {
    try {
      setStatus(await _resolveStatus());
    } catch (err) {
      setError(_toError(err));
      setStatus("unsupported");
    }
  }, []);

  useEffect(() => {
    // Registering early keeps the app installable and lets the browser pick
    // up service worker updates; it never prompts the user.
    registerServiceWorker()
      .catch((err: unknown) => {
        setError(_toError(err));
      })
      .finally(() => {
        void refresh();
      });
  }, [refresh]);

  const enable = useCallback(async () => {
    setPending(true);
    setError(null);
    try {
      await subscribeToPush();
    } catch (err) {
      setError(_toError(err));
    } finally {
      await refresh();
      setPending(false);
    }
  }, [refresh]);

  const disable = useCallback(async () => {
    setPending(true);
    setError(null);
    try {
      await unsubscribeFromPush();
    } catch (err) {
      setError(_toError(err));
    } finally {
      await refresh();
      setPending(false);
    }
  }, [refresh]);

  return { status, pending, error, enable, disable };
}
