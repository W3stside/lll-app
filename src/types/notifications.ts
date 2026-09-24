import type { ObjectId } from "mongodb";

export type GameNotificationType =
  // Admin moved a confirmed player onto the waitlist
  | "bumped"
  | "cancelled"
  // Waitlisted player got a confirmed spot
  | "promoted"
  // Confirmed player, the evening before, while cancelling is still free
  | "reminder"
  // Admin removed a confirmed player from a game with no waitlist
  | "removed";

// A copy of each game notification a user was sent (push or not), so players
// without push can still see what changed. Only lives until the game is over.
export interface IGameNotificationDocument {
  _id?: ObjectId;
  // Strings to match how player ids are stored on games
  user_id: string;
  game_id: string;
  type: GameNotificationType;
  title: string;
  body: string;
  url: string;
  createdAt: Date;
  readAt: Date | null;
  // TTL index deletes the row at this time: when the game ends
  expiresAt: Date;
}

// Push categories a user can switch off in their profile. Admin actions that
// directly affect them (bumped, removed) and the weekly "signups open" nudge
// are always sent.
export type NotificationPreferenceKey =
  | "cancelled"
  | "open_spots"
  | "promoted"
  | "reminders";

export type INotificationPreferences = Record<
  NotificationPreferenceKey,
  boolean
>;

// Shape after JSON serialisation into page props
export interface IGameNotification
  extends Omit<
    IGameNotificationDocument,
    "_id" | "createdAt" | "expiresAt" | "readAt"
  > {
  _id: string;
  createdAt: string;
  expiresAt: string;
  readAt: string | null;
}
