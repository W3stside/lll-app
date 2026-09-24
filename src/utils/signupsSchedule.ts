// The weekly signups cycle run by the /api/cron routes. Weeks run Monday to
// Sunday, and dates here are Lisbon wall-clock time read as a local Date - the
// frame nowInTimeZone produces.

import { getUSDayIndex } from "./date";

import { DAYS_IN_WEEK } from "@/constants/date";
import { SIGNUPS_RESET_HOUR } from "@/constants/signups";
import type { IGame } from "@/types";

const ONE_WEEK_DAYS = 7;

/** Monday 00:00 of the week `date` falls in. */
export function getWeekStart(date: Date): Date {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate() - getUSDayIndex(date),
  );
}

export function getPreviousWeekStart(weekStart: Date): Date {
  return new Date(
    weekStart.getFullYear(),
    weekStart.getMonth(),
    weekStart.getDate() - ONE_WEEK_DAYS,
  );
}

/** "YYYY-MM-DD" of the week's Monday, so each step runs once per week. */
export function getWeekKey(weekStart: Date): string {
  const month = String(weekStart.getMonth() + 1).padStart(2, "0");
  const day = String(weekStart.getDate()).padStart(2, "0");
  return `${weekStart.getFullYear()}-${month}-${day}`;
}

/** Monday morning: every list is cleared and signups re-open. */
export function getSignupsResetTime(weekStart: Date): Date {
  return new Date(
    weekStart.getFullYear(),
    weekStart.getMonth(),
    weekStart.getDate(),
    SIGNUPS_RESET_HOUR,
  );
}

/**
 * Start of the week whose signups are current at `now`. They only roll over
 * at the Monday reset, so early on Monday the week that just ended counts.
 */
export function getSignupsWeekStart(now: Date): Date {
  const weekStart = getWeekStart(now);
  return now < getSignupsResetTime(weekStart)
    ? getPreviousWeekStart(weekStart)
    : weekStart;
}

/**
 * Kick-off of the week's last game: signups never close before it. Hidden and
 * cancelled games are never played, so they don't count. Undefined when no
 * game is.
 */
export function getLastKickOff(
  games: Pick<IGame, "cancelled" | "day" | "hidden" | "time">[],
  weekStart: Date,
): Date | undefined {
  let lastKickOff: Date | undefined;

  for (const { cancelled, day, hidden, time } of games) {
    const dayIndex = DAYS_IN_WEEK.indexOf(day);
    const [hours, minutes] = time.split(":").map(Number);
    // Skipping malformed rows: an Invalid Date never compares greater, and a
    // bad day would land in the previous week and close signups early
    if (
      cancelled === true ||
      hidden === true ||
      dayIndex === -1 ||
      !Number.isFinite(hours) ||
      !Number.isFinite(minutes)
    ) {
      continue;
    }

    const kickOff = new Date(
      weekStart.getFullYear(),
      weekStart.getMonth(),
      weekStart.getDate() + dayIndex,
      hours,
      minutes,
    );

    if (lastKickOff === undefined || kickOff > lastKickOff) {
      lastKickOff = kickOff;
    }
  }

  return lastKickOff;
}
