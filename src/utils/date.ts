import { DAYS_IN_WEEK } from "@/constants/date";
import type { IGame } from "@/types/users";

const ONE_WEEK_DAYS = 7;

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

  const now =
    timeZone !== undefined
      ? new Date(new Date().toLocaleString("en-US", { timeZone }))
      : new Date();

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
