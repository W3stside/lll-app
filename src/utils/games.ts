import { randomInt } from "crypto";

import { copyToClipboard } from "./copy";
import { computeGameDate, getUSDayIndex } from "./date";

import { DAYS_IN_WEEK_REVERSED } from "@/constants/date";
import { MAX_SIGNUPS_PER_GAME } from "@/constants/signups";
import {
  GameStatus,
  Gender,
  type GamesByDay,
  type IGame,
  type IUser,
} from "@/types";

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
    new Date() > lastGameDate ||
    (todayIdx >= getUSDayIndex(gameDate) && new Date() > gameDate)
      ? GameStatus.PAST
      : GameStatus.UPCOMING;

  return { gameStatus, gameDate };
};

export const getLastGame = (gamesByDay: GamesByDay, games: IGame[]) => {
  if (games.length === 1) return games[0];
  for (const day of DAYS_IN_WEEK_REVERSED) {
    const dayGames = gamesByDay[day];
    if (dayGames?.[dayGames.length - 1] !== undefined) {
      return dayGames[dayGames.length - 1];
    }
  }
  return undefined; // Default return value if no game is found
};

interface IShareGameList {
  games: IGame[];
  usersById: Record<string, IUser>;
  openSpots?: number;
  day?: IGame["day"];
  gameDate?: Date;
}

export const shareGameList = async ({
  games,
  usersById,
  openSpots = 0,
  day,
  gameDate,
}: IShareGameList) => {
  if (typeof globalThis.window === "undefined") return;

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

export const randomiseTourneyTeams = (list: string[]) =>
  list.reduce(
    (acc, id) => {
      // Get list of available bucket keys (still under max)
      const availableKeys = Object.entries(acc).filter(
        ([, set]) => set.size < MAX_SIGNUPS_PER_GAME,
      );

      // Stop early if all are full
      if (availableKeys.length === 0) return acc;

      // Pick a random available key
      const randomIndex = randomInt(0, availableKeys.length);
      const [chosenKey] = availableKeys[randomIndex];
      const newSet = new Set(acc[chosenKey as keyof typeof acc]).add(id);

      return {
        ...acc,
        [chosenKey]: newSet,
      };
    },
    {
      "1": new Set<string>(),
      "2": new Set<string>(),
      "3": new Set<string>(),
      "4": new Set<string>(),
    },
  );

export function prepareTourneyGamePlayersList(playersList: string[]) {
  const result = randomiseTourneyTeams(playersList);
  return {
    $addToSet: Object.fromEntries(
      Object.entries(result).map(([teamId, players]) => [
        `teams.${teamId}.players`,
        { $each: [...players] },
      ]),
    ),
  };
}
