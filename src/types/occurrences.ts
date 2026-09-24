import type { ObjectId } from "mongodb";

import type { GameType, IGame } from ".";

export type AttendanceStatus = "no_show" | "present";
export type PaymentStatus = "paid" | "unpaid";

// One week's occurrence of a game. Games are weekly templates whose lists are
// wiped when signups reset, so this is the only record of who played.
export interface IGameOccurrenceDocument {
  _id?: ObjectId;
  // Strings to match how player ids are stored on games
  game_id: string;
  // Lisbon calendar date of the game, "YYYY-MM-DD"
  occurrence: string;
  // The game as it was: it can be edited or deleted later. Games created from
  // the admin form have no number.
  game_number?: IGame["game_id"];
  name?: string;
  day: IGame["day"];
  time: string;
  location: string;
  type?: GameType;
  cancelled: boolean;
  // Final lists, saved when signups reset. Empty until then.
  confirmed: string[];
  waitlist: string[];
  // Recorded by admins, keyed by player id. Missing on rows only created by
  // the other kind of mark, so read them with `?? {}`.
  attendance?: Partial<Record<string, AttendanceStatus>>;
  payments?: Partial<Record<string, PaymentStatus>>;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// PATCH /api/requests/occurrences/update (admins only)
export interface IAttendanceUpdate {
  game_id: string;
  occurrence: string;
  user_ids: string[];
  // null clears the mark
  attendance: AttendanceStatus | null;
}

// PATCH /api/requests/payments/update (admins only)
export interface IPaymentUpdate {
  user_id: string;
  game_id: string;
  // Key of the player's missedPayments entry (a formatDateStr of the game)
  date: string;
  day: IGame["day"];
  time: string;
  // The history row to mark too, when the week is known
  occurrence?: string;
  paid: boolean;
}

// Shape after JSON serialisation into page props or API responses
export interface IGameOccurrence
  extends Omit<
    IGameOccurrenceDocument,
    "_id" | "archivedAt" | "createdAt" | "updatedAt"
  > {
  _id: string;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
