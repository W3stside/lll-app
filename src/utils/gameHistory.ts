// Shared by client and server: never import anything server-only here

import { GAME_TIME_ZONE } from "@/constants/date";
import type {
  AttendanceStatus,
  IGame,
  IGameOccurrenceDocument,
  PaymentStatus,
} from "@/types";
import {
  formatDateKey,
  getKickoffInWeekOf,
  parseDateKey,
  toTimeZoneWallClock,
} from "@/utils/date";

const HALF_A_DAY_MS = 12 * 60 * 60 * 1000;

type OccurrenceMarks = Pick<
  IGameOccurrenceDocument,
  "attendance" | "confirmed" | "payments" | "waitlist"
>;

export interface IOccurrencePlayer {
  userId: string;
  // null: marked, but no longer on either list
  list: "confirmed" | "waitlist" | null;
  attendance?: AttendanceStatus;
  payment?: PaymentStatus;
}

export const ATTENDANCE_LABELS: Record<AttendanceStatus, string> = {
  present: "Played",
  no_show: "No-show",
};

/**
 * Kickoff a game's current list is for: its kickoff in the week the lists
 * were last cleared for (IAdmin.signups_lists_week). Before a clear recorded
 * one, the week of half a day ago, as lists are cleared on Sunday night after
 * the last game or on Monday morning. Dates are Lisbon wall-clock time read as
 * a local Date, so the answer is the same on the server and in any browser.
 * Used by the history archive, the reminders and Track payment alike.
 */
export function getListKickoff(
  game: Pick<IGame, "day" | "time">,
  wallNow: Date,
  listsWeek: string | undefined,
): Date {
  const weekDate =
    (listsWeek !== undefined ? parseDateKey(listsWeek) : null) ??
    new Date(wallNow.getTime() - HALF_A_DAY_MS);

  return getKickoffInWeekOf(game.day, game.time, weekDate);
}

/** Occurrence key of the week a game's current list is for. */
export function getListOccurrenceKey(
  game: Pick<IGame, "day" | "time">,
  now: Date,
  listsWeek: string | undefined,
): string {
  return formatDateKey(
    getListKickoff(game, toTimeZoneWallClock(now, GAME_TIME_ZONE), listsWeek),
  );
}

/** Row id in the client's map of occurrences. */
export function getOccurrenceRowKey(gameId: string, occurrence: string) {
  return `${gameId}:${occurrence}`;
}

/** Everyone on the week's game: confirmed, waitlist, then anyone only marked. */
export function getOccurrencePlayers({
  confirmed,
  waitlist,
  attendance = {},
  payments = {},
}: OccurrenceMarks): IOccurrencePlayer[] {
  const onList = new Set([...confirmed, ...waitlist]);
  const markedOnly = [
    ...new Set([...Object.keys(attendance), ...Object.keys(payments)]),
  ].filter((userId) => !onList.has(userId));

  return [
    ...confirmed.map((userId) => ({ userId, list: "confirmed" as const })),
    ...waitlist.map((userId) => ({ userId, list: "waitlist" as const })),
    ...markedOnly.map((userId) => ({ userId, list: null })),
  ].map((player) => ({
    ...player,
    attendance: attendance[player.userId],
    payment: payments[player.userId],
  }));
}

export function summariseOccurrence({
  confirmed,
  attendance = {},
  payments = {},
}: OccurrenceMarks) {
  const statuses = Object.values(attendance);
  const paid = Object.values(payments);

  return {
    confirmed: confirmed.length,
    played: statuses.filter((status) => status === "present").length,
    noShows: statuses.filter((status) => status === "no_show").length,
    paid: paid.filter((status) => status === "paid").length,
    unpaid: paid.filter((status) => status === "unpaid").length,
  };
}

// Spreadsheets run cells starting with these as formulas, and player names
// are typed by players
const FORMULA_START = /^[=+\-@\t\r]/;

function _toCsvCell(value: string): string {
  const safe = FORMULA_START.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
}

export function toCsv(rows: string[][]): string {
  return rows.map((row) => row.map(_toCsvCell).join(",")).join("\r\n");
}
