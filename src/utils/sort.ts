import { DAYS_IN_WEEK } from "@/constants/date";
import type { IGame } from "@/types";

export function sortDaysOfWeek(games: IGame[]) {
  return games.sort(
    (a, b) =>
      DAYS_IN_WEEK.findIndex((d) => d === a.day) -
      DAYS_IN_WEEK.findIndex((d) => d === b.day),
  );
}
