import { randomInt } from "crypto";

import { copyToClipboard } from "./copy";
import { computeGameDate, getUSDayIndex } from "./date";

import { DAYS_IN_WEEK_REVERSED } from "@/constants/date";
import { MAX_SIGNUPS_PER_GAME } from "@/constants/signups";
import {
  GameStatus,
  GameType,
  Gender,
  type IUserSafe,
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
    .map(({ day: d, gender, time, address, location, players, type }) => {
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
        .slice(0, MAX_SIGNUPS_PER_GAME[type ?? GameType.STANDARD])
        .map(
          (p) => `
${p.name} (${p.phone})`,
        )
        .join("")}

WAITLIST: ${playersMapped
        .slice(MAX_SIGNUPS_PER_GAME[type ?? GameType.STANDARD])
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

export const sharePaymentsMissingList = async (users: IUserSafe[]) => {
  if (typeof globalThis.window === "undefined") return;

  const text = `
Hi guys - we're missing payments from those in the list below. Please pay one of the game organisers as soon as possible, thanks!

-- PAYMENTS PENDING --
${users
  .map(
    ({ first_name, last_name, phone_number, missedPayments }) => `
${first_name} ${last_name} (@${phone_number})
    PAYMENTS OWED: ${missedPayments
      ?.map(
        ({ date, day }, idx) => `
      ${idx + 1}: ${day}: ${date}      
`,
      )
      .join("")}
`,
  )
  .join("")}`;

  void copyToClipboard(text);
  await navigator.share({
    title: "Payments Pending",
    text,
  });
};

const RANDOM_TOURNEY_SET = {
  "0": new Set<string>(),
  "1": new Set<string>(),
  "2": new Set<string>(),
  "3": new Set<string>(),
} as const;

export const getRandomAvailableTourneyIndex = (
  player: string,
  teams?: { players: string[] }[],
) => {
  const current = teams
    ? (Object.fromEntries(
        teams.map(({ players }, idx) => [idx, new Set(players)]),
      ) as typeof RANDOM_TOURNEY_SET)
    : RANDOM_TOURNEY_SET;

  const flatCurrent = new Set(
    Object.values(current).flatMap((set) => [...set]),
  );

  // Get list of available bucket keys (still under max)
  const availableKeys = Object.entries(current).filter(
    ([, set]) =>
      set.size < MAX_SIGNUPS_PER_GAME[GameType.TOURNAMENT] &&
      !flatCurrent.has(player),
  );

  // Stop early if all are full
  if (availableKeys.length === 0) return undefined;
  else if (availableKeys.length === 1) return Number(availableKeys[0][0]);

  // Return a random available key
  return randomInt(0, availableKeys.length);
};

export const findPlayerInTourney = (
  playerId: string,
  teams: { players: string[] }[],
): number | undefined => {
  return teams.findIndex((team) => team.players.includes(playerId));
};
