// Shared by client and server: never import anything server-only here

import type {
  AttendanceStatus,
  IGameOccurrenceDocument,
  PaymentStatus,
} from "@/types";

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
