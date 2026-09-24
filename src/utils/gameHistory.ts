// Shared by client and server: never import anything server-only here

import { GAME_TIME_ZONE } from "@/constants/date";
import type {
  AttendanceStatus,
  IGame,
  IGameOccurrenceDocument,
  PaymentStatus,
} from "@/types";
import {
  getKickoffInWeekOf,
  getNextKickoffAfter,
  getOccurrenceKey,
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
 * Kickoff a game's current list is for: its first kickoff since signups were
 * last reset. Before any reset was recorded, its kickoff in the week of half a
 * day ago, since lists are reset after Sunday's last game and sometimes just
 * past midnight. Both dates are Lisbon wall-clock time read as a local Date,
 * so the answer is the same on the server and in any browser. Used by the
 * history archive, the reminders and Track payment alike.
 */
export function getListKickoff(
  game: Pick<IGame, "day" | "time">,
  wallNow: Date,
  wallLastReset: Date | undefined,
): Date {
  return wallLastReset !== undefined
    ? getNextKickoffAfter(game.day, game.time, wallLastReset)
    : getKickoffInWeekOf(
        game.day,
        game.time,
        new Date(wallNow.getTime() - HALF_A_DAY_MS),
      );
}

/** Occurrence key of the week a game's current list is for. */
export function getListOccurrenceKey(
  game: Pick<IGame, "day" | "time">,
  now: Date,
  lastResetAt: Date | string | undefined,
): string {
  return getOccurrenceKey(
    getListKickoff(
      game,
      toTimeZoneWallClock(now, GAME_TIME_ZONE),
      lastResetAt !== undefined
        ? toTimeZoneWallClock(new Date(lastResetAt), GAME_TIME_ZONE)
        : undefined,
    ),
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
