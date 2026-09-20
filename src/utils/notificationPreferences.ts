// Shared by client and server: never import anything server-only here

import { DEFAULT_NOTIFICATION_PREFERENCES } from "@/constants/notifications";
import type { INotificationPreferences } from "@/types";

/** Fills in the defaults for users who never touched their settings. */
export function resolveNotificationPreferences(
  stored: Partial<INotificationPreferences> | undefined,
): INotificationPreferences {
  return { ...DEFAULT_NOTIFICATION_PREFERENCES, ...stored };
}
