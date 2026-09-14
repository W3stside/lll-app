import { useRouter } from "next/router";
import { useCallback, useEffect, useRef, useState } from "react";

const UNREAD_COUNT_API = "/api/notifications/unread-count";
// Posted by public/sw.js whenever a push arrives - keep in sync
const PUSH_RECEIVED_MESSAGE = "push-received";

async function _fetchUnreadCount(signal: AbortSignal): Promise<number> {
  const res = await fetch(UNREAD_COUNT_API, {
    credentials: "same-origin",
    signal,
  });
  if (!res.ok) {
    throw new Error(`Unread count request failed (${res.status})`);
  }

  const { count } = (await res.json()) as { count?: unknown };
  return typeof count === "number" ? count : 0;
}

function _isPushReceivedMessage(event: MessageEvent<unknown>): boolean {
  const { data } = event;
  return (
    typeof data === "object" &&
    data !== null &&
    "type" in data &&
    data.type === PUSH_RECEIVED_MESSAGE
  );
}

/**
 * Unread inbox count for the navbar badge. Refreshed on navigation (so visiting
 * the inbox, which marks everything read, clears it), when the tab regains
 * focus, and when a push arrives while the app is open.
 */
export function useUnreadNotificationsCount(enabled: boolean): number {
  const [count, setCount] = useState(0);
  const { asPath } = useRouter();
  // Only the latest request may set state, so a slow older one can't overwrite
  // a fresher count
  const inFlight = useRef<AbortController | null>(null);

  const refresh = useCallback(() => {
    inFlight.current?.abort();

    if (!enabled) {
      setCount(0);
      return;
    }

    const controller = new AbortController();
    inFlight.current = controller;

    _fetchUnreadCount(controller.signal)
      .then((next) => {
        setCount(next);
      })
      .catch(() => {
        // Badge is a hint: keep the last known value on network/auth errors
      });
  }, [enabled]);

  useEffect(() => {
    refresh();
  }, [refresh, asPath]);

  useEffect(() => {
    if (!enabled) return undefined;

    function _onVisibilityChange() {
      if (document.visibilityState === "visible") refresh();
    }
    function _onServiceWorkerMessage(event: MessageEvent<unknown>) {
      if (_isPushReceivedMessage(event)) refresh();
    }

    const serviceWorker =
      "serviceWorker" in navigator ? navigator.serviceWorker : null;

    document.addEventListener("visibilitychange", _onVisibilityChange);
    serviceWorker?.addEventListener("message", _onServiceWorkerMessage);

    return () => {
      document.removeEventListener("visibilitychange", _onVisibilityChange);
      serviceWorker?.removeEventListener("message", _onServiceWorkerMessage);
      inFlight.current?.abort();
    };
  }, [enabled, refresh]);

  return count;
}
