import { computeGameDate, getUSDayIndex } from "./date";

import { DAYS_IN_WEEK } from "@/constants/date";
import { GameStatus } from "@/types";
import type { GamesByDay, IGame } from "@/types/users";

export const computeGameStatus = (
  games: IGame[],
  day: IGame["day"],
  lastGame: IGame,
) => {
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

export const getLastGame = (gamesByDay: GamesByDay) =>
  gamesByDay[DAYS_IN_WEEK[DAYS_IN_WEEK.length - 1]]?.[
    (gamesByDay[DAYS_IN_WEEK[DAYS_IN_WEEK.length - 1]]?.length ?? 1) - 1
  ] as IGame;
