import { useMemo } from "react";

import { MAX_SIGNUPS_PER_GAME } from "@/constants/signups";
import { useGames } from "@/context/Games/context";
import { type IGame, type IUser, GameStatus, GameType } from "@/types";
import { groupGamesByDay } from "@/utils/data";
import { computeGameStatus, getLastGame, shareGameList } from "@/utils/games";

type GameData = {
  day: IGame["day"];
  games: IGame[];
  gameStatus: GameStatus;
  gameDate: Date | undefined;
  signedUp: number;
  capacity: number[];
  gamesFullyCapped: number[];
  openSpots: number;
  maxSignups: number;
  userFullyBooked: boolean;
  shareList: (() => Promise<void>) | undefined;
};

const DEFAULT_GAME_DATA: GameData = {
  day: "Monday",
  games: [] as IGame[],
  gameStatus: GameStatus.UPCOMING,
  gameDate: undefined,
  signedUp: 0,
  capacity: [0],
  gamesFullyCapped: [0],
  openSpots: 0,
  maxSignups: 0,
  userFullyBooked: false,
  shareList: undefined,
};

export function useWeeklyGamesData(
  filteredGames: IGame[],
  user: IUser,
  usersById: Record<string, IUser>,
) {
  const { games: gamesContext, gamesByDay } = useGames();

  return useMemo(() => {
    const lastGameOfWeek = getLastGame(gamesByDay, gamesContext);
    const filteredGamesByDay = Object.entries(groupGamesByDay(filteredGames));

    return filteredGamesByDay.flatMap<GameData>(([day, unadjustedGames]) => {
      if (unadjustedGames.length === 0) {
        return [DEFAULT_GAME_DATA];
      }

      const { gameStatus, gameDate } = computeGameStatus(
        unadjustedGames,
        day as IGame["day"],
        lastGameOfWeek,
      );

      const userFullyBooked = unadjustedGames.every((g) =>
        g.players.some((p) => p.toString() === user._id.toString()),
      );

      const games = unadjustedGames.filter(
        (g) => g.cancelled !== true && g.hidden !== true,
      );

      const {
        total: signedUp,
        capacity,
        maxSignups,
      } = games.reduce<{
        total: number;
        capacity: number[];
        maxSignups: number;
      }>(
        (acc, { players = [], teams, type }) => {
          const tourneyPlayers =
            teams !== undefined
              ? Object.values(teams).flatMap((t) => [...t.players])
              : [];

          const limit = MAX_SIGNUPS_PER_GAME[type ?? GameType.STANDARD];

          return {
            maxSignups: acc.maxSignups + limit,
            total: acc.total + (tourneyPlayers.length || players.length),
            capacity: [
              ...acc.capacity,
              tourneyPlayers.length > 0
                ? limit * 2 - tourneyPlayers.length
                : limit - players.length,
            ],
          };
        },
        { total: 0, capacity: [], maxSignups: 0 },
      );

      const gamesFullyCapped = capacity.flatMap((gc) => (gc <= 0 ? [gc] : []));

      const openSpots = capacity.reduce(
        (acc, cap) => Math.max(0, cap) + acc,
        0,
      );

      return [
        {
          day: day as IGame["day"],
          gameStatus,
          gameDate,
          games: unadjustedGames,
          signedUp,
          capacity,
          gamesFullyCapped,
          openSpots,
          maxSignups,
          userFullyBooked,
          shareList: async () => {
            await shareGameList({
              games,
              usersById,
              openSpots,
              day: day as IGame["day"],
              gameDate,
            });
          },
        },
      ];
    });
  }, [filteredGames, gamesByDay, gamesContext, user._id, usersById]);
}
