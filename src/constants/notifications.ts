import type {
  INotificationPreferences,
  NotificationPreferenceKey,
} from "@/types";

export const NOTIFICATION_PREFERENCE_KEYS: NotificationPreferenceKey[] = [
  "promoted",
  "cancelled",
  "open_spots",
];

// Opt-out model: every category is on until the user switches it off
export const DEFAULT_NOTIFICATION_PREFERENCES: INotificationPreferences = {
  promoted: true,
  cancelled: true,
  open_spots: true,
};

export const NOTIFICATION_PREFERENCE_LABELS: Record<
  NotificationPreferenceKey,
  string
> = {
  promoted: "You move off the waitlist into a game",
  cancelled: "A game you signed up for is cancelled",
  open_spots: "A game the next day still needs players",
};

// Open spots alert: from 07:30 the day before a game until kick-off
export const OPEN_SPOTS_ALERT_HOUR = 7;
// The push comes from one UTC cron, which lands an hour later in Lisbon during
// summer time - so the route accepts this hour as well
export const OPEN_SPOTS_PUSH_LAST_HOUR = 8;
export const OPEN_SPOTS_ALERT_MINUTE = 30;
// No alert on Sundays for Monday games
export const OPEN_SPOTS_ALERT_EXCLUDED_DAYS = new Set<string>(["Monday"]);
export const OPEN_SPOTS_ALERT_TITLE = "Open spots still available!";

// Per device, like the push prompt: which alerts were dismissed
export const OPEN_SPOTS_DISMISSED_KEY = "lll:open-spots-dismissed";
