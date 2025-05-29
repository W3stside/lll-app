export const DAYS_IN_WEEK = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;
export const DAYS_IN_WEEK_REVERSED = DAYS_IN_WEEK.toReversed();
export const CANCELLATION_THRESHOLD_MS = 12 * 60 * 60 * 1000;
export const DAYS_IN_WEEK_MAP = DAYS_IN_WEEK.reduce(
  (acc, day) => ({
    ...acc,
    [day]: true,
  }),
  {},
);
