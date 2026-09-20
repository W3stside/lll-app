import { useCallback, useMemo, useState } from "react";

import { useUser } from "@/context/User/context";
import type { NotificationPreferenceKey } from "@/types";
import { resolveNotificationPreferences } from "@/utils/notificationPreferences";
import { updateNotificationPreferences } from "@/utils/push/client";

function _toError(error: unknown): Error {
  return error instanceof Error ? error : new Error("Unknown error occurred.");
}

// Preferences live on the user document, so the user context (seeded by SSR
// and refreshed by useClientUser) is the source of truth
export function useNotificationPreferences() {
  const { user, setUser } = useUser();
  // Which key is saving, so only that checkbox shows as busy
  const [pending, setPending] = useState<NotificationPreferenceKey | null>(
    null,
  );
  const [error, setError] = useState<Error | null>(null);

  const preferences = useMemo(
    () => resolveNotificationPreferences(user.notification_preferences),
    [user.notification_preferences],
  );

  const toggle = useCallback(
    async (key: NotificationPreferenceKey) => {
      setPending(key);
      setError(null);
      try {
        const next = await updateNotificationPreferences({
          [key]: !preferences[key],
        });
        setUser((current) => ({ ...current, notification_preferences: next }));
      } catch (err) {
        setError(_toError(err));
      } finally {
        setPending(null);
      }
    },
    [preferences, setUser],
  );

  return { preferences, pending, error, toggle };
}
