import { computeGameDate, getUSDayIndex } from "./date";

import { DAYS_IN_WEEK_REVERSED } from "@/constants/date";
import { GameStatus } from "@/types";
import type { GamesByDay, IGame } from "@/types/users";

export const computeGameStatus = (
  games: IGame[],
  day: IGame["day"],
  lastGame: IGame | undefined,
) => {
  if (lastGame === undefined) {
    return { gameStatus: GameStatus.PAST, gameDate: undefined };
  }

  const todayIdx = getUSDayIndex(new Date());
  const lastGameDate = computeGameDate(lastGame.day, lastGame.time, "WET");

  const gameDate = computeGameDate(
    day,
    games[games.length - 1].time,
    "WET",
    new Date() > lastGameDate,
  );

  const gameStatus =
    todayIdx > getUSDayIndex(gameDate) && new Date() > gameDate
      ? GameStatus.PAST
      : GameStatus.UPCOMING;

  return { gameStatus, gameDate };
};

export const getLastGame = (gamesByDay: GamesByDay, games: IGame[]) => {
  if (games.length === 1) return games[0];
  for (const day of DAYS_IN_WEEK_REVERSED) {
    const dayGames = gamesByDay[day];
    if (dayGames?.[0] !== undefined) return dayGames[0];
  }
  return undefined; // Default return value if no game is found
};
