// Shared by the signup page banner and the cron route, so both agree on when a
// game "needs more players". Dates here are Lisbon wall-clock time read as a
// local Date - the frame computeGameDate returns and nowInTimeZone produces.

import { getOpenSpots } from "./games";

import {
  OPEN_SPOTS_ALERT_EXCLUDED_DAYS,
  OPEN_SPOTS_ALERT_HOUR,
  OPEN_SPOTS_ALERT_MINUTE,
  OPEN_SPOTS_ALERT_TITLE,
} from "@/constants/notifications";
import type { IGame } from "@/types";

export function isOpenSpotsAlertDay(day: IGame["day"]): boolean {
  return !OPEN_SPOTS_ALERT_EXCLUDED_DAYS.has(day);
}

/** 07:30 on the day before the game. */
export function getOpenSpotsAlertStart(gameDate: Date): Date {
  return new Date(
    gameDate.getFullYear(),
    gameDate.getMonth(),
    gameDate.getDate() - 1,
    OPEN_SPOTS_ALERT_HOUR,
    OPEN_SPOTS_ALERT_MINUTE,
    0,
    0,
  );
}

/** From 07:30 the day before until kick-off. */
export function isInOpenSpotsAlertWindow(gameDate: Date, now: Date): boolean {
  return now >= getOpenSpotsAlertStart(gameDate) && now < gameDate;
}

/**
 * A game only qualifies while players can still get a confirmed spot: the
 * waitlist filling up is not something to advertise.
 */
export function gameNeedsPlayers(game: IGame): boolean {
  return (
    isOpenSpotsAlertDay(game.day) &&
    game.cancelled !== true &&
    game.hidden !== true &&
    getOpenSpots(game) > 0
  );
}

/** "YYYY-MM-DD" of the game, so one alert is sent per game per week. */
export function getOpenSpotsAlertOccurrence(gameDate: Date): string {
  const month = String(gameDate.getMonth() + 1).padStart(2, "0");
  const day = String(gameDate.getDate()).padStart(2, "0");
  return `${gameDate.getFullYear()}-${month}-${day}`;
}

export function getOpenSpotsAlertKey(gameId: string, gameDate: Date): string {
  return `${gameId}:${getOpenSpotsAlertOccurrence(gameDate)}`;
}

// Same words in the banner and the push, so players recognise it
export function getOpenSpotsAlertCopy(game: Pick<IGame, "day" | "time">): {
  title: string;
  body: string;
} {
  return {
    title: OPEN_SPOTS_ALERT_TITLE,
    body: `${game.day} game at ${game.time} needs more players. Sign up and come play!`,
  };
}
