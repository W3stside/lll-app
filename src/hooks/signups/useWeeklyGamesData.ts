import { useMemo } from "react";

import { MAX_SIGNUPS_PER_GAME } from "@/constants/signups";
import { useGames } from "@/context/Games/context";
import { GameStatus } from "@/types";
import { Gender, type IGame, type IUser } from "@/types/users";
import { copyToClipboard } from "@/utils/copy";
import { groupGamesByDay } from "@/utils/data";
import { computeGameStatus, getLastGame } from "@/utils/games";

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
  const lastGameOfWeek = getLastGame(gamesByDay, gamesContext);

  const filteredGamesByDay = useMemo(
    () => Object.entries(groupGamesByDay(filteredGames)),
    [filteredGames],
  );

  return useMemo(
    () =>
      filteredGamesByDay.flatMap<GameData>(([day, games]) => {
        if (games.length === 0) {
          return [DEFAULT_GAME_DATA];
        }

        const { gameStatus, gameDate } = computeGameStatus(
          games,
          day as IGame["day"],
          lastGameOfWeek,
        );

        const userFullyBooked = games.every((g) =>
          g.players.some((p) => p.toString() === user._id.toString()),
        );

        const adjustedGames = games.filter((g) => g.cancelled !== true);

        const { total: signedUp, capacity } = adjustedGames.reduce<{
          total: number;
          capacity: number[];
        }>(
          (acc, { players = [] }) => ({
            total: acc.total + players.length,
            capacity: [...acc.capacity, MAX_SIGNUPS_PER_GAME - players.length],
          }),
          { total: 0, capacity: [] },
        );
        const gamesFullyCapped = capacity.flatMap((gc) =>
          gc <= 0 ? [gc] : [],
        );

        const openSpots = capacity.reduce(
          (acc, cap) => Math.max(0, cap) + acc,
          0,
        );
        const maxSignups = MAX_SIGNUPS_PER_GAME * adjustedGames.length;

        const shareList = async () => {
          const text = games
            .map(({ day: d, gender, time, address, location, players }) => {
              const playersMapped = players.map((p) => ({
                name: `${usersById[p.toString()].first_name} ${
                  usersById[p.toString()].last_name
                }`,
                phone: usersById[p.toString()].phone_number,
              }));

              return `
GAME: ${d} @ ${time}${gender !== undefined ? ` <${gender === Gender.FEMALE ? "ladies" : "mixed"}>` : ""}
WHERE: ${location} - ${address}
OPEN SPOTS: ${openSpots}

CONFIRMED PLAYERS: ${playersMapped
                .slice(0, MAX_SIGNUPS_PER_GAME)
                .map(
                  (p) => `
${p.name} (${p.phone})`,
                )
                .join("")}

WAITLIST: ${playersMapped
                .slice(MAX_SIGNUPS_PER_GAME)
                .map(
                  (p) => `
${p.name} (${p.phone})`,
                )
                .join("")}

=====================
                `;
            })
            .join("\n");

          void copyToClipboard(text);
          await navigator.share({
            title: `${day} ${gameDate?.toUTCString() ?? ""} games`,
            text,
          });
        };

        return [
          {
            day: day as IGame["day"],
            gameStatus,
            gameDate,
            games,
            signedUp,
            capacity,
            gamesFullyCapped,
            openSpots,
            maxSignups,
            userFullyBooked,
            shareList,
          },
        ];
      }),
    [filteredGamesByDay, lastGameOfWeek, user._id, usersById],
  );
}
