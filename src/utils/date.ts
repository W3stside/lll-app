import { DAYS_IN_WEEK } from "@/constants/date";
import type { IGame } from "@/types";

export const ONE_WEEK_DAYS = 7;

export const getUSDayIndex = (date: Date): number => {
  const isoDay = date.getDay();
  return isoDay === 0 ? 6 : isoDay - 1;
};

const _getDateFromGameHour = (
  now: Date,
  time: IGame["time"],
  diff: number = 0,
) => {
  const [targetHour, targetMinute] = time.split(":").map(Number);
  return new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + diff,
    targetHour,
    targetMinute,
    0,
    0,
  );
};

const _sumDays = (
  now: Date,
  target: number,
  current: number,
  targetHour: number,
  targetMinute: number,
  getNext: boolean = false,
) => {
  const diff = (target - current + ONE_WEEK_DAYS) % ONE_WEEK_DAYS;
  const tentativeTarget = _getDateFromGameHour(
    now,
    `${targetHour}:${targetMinute}`,
    diff,
  );

  // If same day but time already passed, push to next week
  if (getNext && diff === 0 && tentativeTarget <= now) {
    return ONE_WEEK_DAYS;
  }
  return !getNext ? target - current : diff;
};

/**
 * Wall-clock time of `instant` in the given zone, read as a local Date. Same
 * frame as the dates computeGameDate returns, so the two can be compared
 * directly.
 */
export function toTimeZoneWallClock(instant: Date, timeZone: string): Date {
  return new Date(instant.toLocaleString("en-US", { timeZone }));
}

/** Wall-clock "now" in the given zone, read as a local Date. */
export function nowInTimeZone(timeZone: string): Date {
  return toTimeZoneWallClock(new Date(), timeZone);
}

/**
 * "YYYY-MM-DD" of a wall-clock Date: keys one week's occurrence of a game.
 * Reads the local fields, so a date from computeGameDate gives the Lisbon
 * calendar day in any browser or server timezone.
 */
export function getOccurrenceKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/** Local midnight of an occurrence key, or null unless it's a real date. */
export function parseOccurrenceKey(key: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (match === null) return null;

  const date = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
  );
  // Rejects overflowing dates such as 2026-02-30
  return getOccurrenceKey(date) === key ? date : null;
}

function _dayIndex(day: IGame["day"]): number {
  const index = DAYS_IN_WEEK.indexOf(day);
  if (index === -1) {
    throw new Error("Invalid day of week");
  }
  return index;
}

/** Kickoff of a weekly game in the Monday-to-Sunday week of `wallDate`. */
export function getKickoffInWeekOf(
  day: IGame["day"],
  time: string,
  wallDate: Date,
): Date {
  return _getDateFromGameHour(
    wallDate,
    time,
    _dayIndex(day) - getUSDayIndex(wallDate),
  );
}

/** Earliest kickoff of a weekly game after `wallFrom` (wall-clock frame). */
export function getNextKickoffAfter(
  day: IGame["day"],
  time: string,
  wallFrom: Date,
): Date {
  const daysAhead =
    (_dayIndex(day) - getUSDayIndex(wallFrom) + ONE_WEEK_DAYS) % ONE_WEEK_DAYS;
  const kickoff = _getDateFromGameHour(wallFrom, time, daysAhead);

  return kickoff > wallFrom
    ? kickoff
    : _getDateFromGameHour(wallFrom, time, daysAhead + ONE_WEEK_DAYS);
}

/** "YYYY-MM-DD" of the date's local calendar day. */
export function formatDateKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export function computeGameDate(
  dayOfWeek: IGame["day"],
  time: string,
  timeZone?: string,
  getNext: boolean = false,
): Date {
  const targetDayIndex = DAYS_IN_WEEK.indexOf(dayOfWeek);
  if (targetDayIndex === -1) {
    throw new Error("Invalid day of week");
  }

  const now = timeZone !== undefined ? nowInTimeZone(timeZone) : new Date();

  const currentDayIndex = getUSDayIndex(now);
  const [targetHour, targetMinute] = time.split(":").map(Number);

  const daysToAdd = _sumDays(
    now,
    targetDayIndex,
    currentDayIndex,
    targetHour,
    targetMinute,
    getNext,
  );

  const futureDate = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + daysToAdd,
    targetHour,
    targetMinute,
    0,
    0,
  );

  if (timeZone === undefined) {
    return futureDate;
  }

  // Timezone-adjusted version
  const zoned = new Date(
    new Date(futureDate.toLocaleString("en-US", { timeZone })).toISOString(),
  );

  return new Date(
    zoned.getFullYear(),
    zoned.getMonth(),
    zoned.getDate(),
    targetHour,
    targetMinute,
    0,
    0,
  );
}

const TIME_24_REGEXP = /^([01]\d|2[0-3]):([0-5]\d)$/;
export const isValid24hTime = (str: string) => TIME_24_REGEXP.test(str);

// Create a new Intl.DateTimeFormat object for WET (Western European Time)
const DEFAULT_DATE_OPTIONS: Intl.DateTimeFormatOptions = {
  timeZone: "Europe/Lisbon",
  hour12: false,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  timeZoneName: "short", // To include the timezone offset like +01:00 or UTC
};

export const formatDateStr = (
  dateStr: string,
  options = DEFAULT_DATE_OPTIONS,
) => {
  const dateUTC = new Date(dateStr);

  const formatter = new Intl.DateTimeFormat("en-GB", options);
  return formatter.format(dateUTC);
};
