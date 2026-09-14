import { useCallback, useEffect, useState } from "react";

import { useUser } from "@/context/User/context";
import {
  type PushSupport,
  getCurrentPushSubscription,
  getNotificationPermission,
  getPushSupport,
  registerServiceWorker,
  subscribeToPush,
  syncPushSubscription,
  unsubscribeFromPush,
} from "@/utils/push/client";

export type PushStatus =
  | PushSupport
  // Supported, but the user blocked notifications for this site
  | "denied"
  | "loading"
  | "subscribed"
  | "unsubscribed";

// Module scope so the banner and the settings panel (two hook instances) share
// it: one sync per logged-in user per page load. Keyed by user so logging in as
// someone else without a reload still moves the device to them.
let _lastSyncedUserId: string | null = null;

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

  const { user } = useUser();
  const userId = user._id !== undefined ? user._id.toString() : null;

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

  // Heals a server copy that drifted from the browser's (see
  // syncPushSubscription). Needs a session, so only runs once logged in.
  useEffect(() => {
    if (
      status !== "subscribed" ||
      userId === null ||
      _lastSyncedUserId === userId
    ) {
      return;
    }

    _lastSyncedUserId = userId;
    // Silent: the UI state is unchanged either way. Clearing the marker lets
    // the next mount retry (e.g. it failed while offline).
    syncPushSubscription().catch(() => {
      _lastSyncedUserId = null;
    });
  }, [status, userId]);

  const enable = useCallback(async () => {
    setPending(true);
    setError(null);
    try {
      await subscribeToPush();
      // subscribeToPush just sent it, so skip the redundant sync
      _lastSyncedUserId = userId;
    } catch (err) {
      setError(_toError(err));
    } finally {
      await refresh();
      setPending(false);
    }
  }, [refresh, userId]);

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
