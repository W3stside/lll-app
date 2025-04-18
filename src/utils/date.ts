import { DAYS_IN_WEEK } from "@/constants/date";
import type { IGame } from "@/types/signups";

const ONE_WEEK_DAYS = 7;

export function getNextDate(
  dayOfWeek: IGame["day"],
  time: string,
  timeZone?: string,
): Date {
  const targetDayIndex = DAYS_IN_WEEK.indexOf(dayOfWeek);
  if (targetDayIndex === -1) {
    throw new Error("Invalid day of week");
  }

  const now =
    timeZone !== undefined
      ? new Date(new Date().toLocaleString("en-US", { timeZone }))
      : new Date();

  const currentDayIndex = now.getDay();
  const [targetHour, targetMinute] = time.split(":").map(Number);

  const nextDate = new Date(now);
  nextDate.setHours(targetHour, targetMinute, 0, 0);

  let daysToAdd =
    (targetDayIndex - currentDayIndex + ONE_WEEK_DAYS) % ONE_WEEK_DAYS;

  if (daysToAdd === 0 && nextDate <= now) {
    daysToAdd = ONE_WEEK_DAYS;
  }

  nextDate.setDate(now.getDate() + daysToAdd);

  // Re-apply time if timezone was used (since setDate affects local time)
  if (timeZone !== undefined) {
    const baseDate = new Date(nextDate.toLocaleString("en-US", { timeZone }));
    baseDate.setHours(targetHour, targetMinute, 0, 0);
    return baseDate;
  }

  return nextDate;
}
