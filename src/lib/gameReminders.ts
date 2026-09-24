/* eslint-disable no-console */
// Server-only. The evening before each game, reminds its confirmed players
// that dropping out is free until 12 hours before kick-off, so anyone who
// can't make it goes while a waitlisted player can still take the spot.

import { getAdminSettings } from "./adminSettings";
import client from "./mongodb";
import { claimGameReminder } from "./openSpotsAlerts";

import {
  CANCELLATION_THRESHOLD_MS,
  DAYS_IN_WEEK,
  GAME_TIME_ZONE,
} from "@/constants/date";
import {
  GAME_REMINDER_EXCLUDED_DAYS_WITHOUT_RESET,
  GAME_REMINDER_HOUR,
  GAME_REMINDER_LAST_HOUR,
} from "@/constants/notifications";
import { Collection, type IGame } from "@/types";
import {
  getNextKickoffAfter,
  getOccurrenceKey,
  getUSDayIndex,
  toTimeZoneWallClock,
} from "@/utils/date";
import { getConfirmedPlayerIds } from "@/utils/games";
import { notifyCancellationReminder } from "@/utils/notifications";

export interface IGameReminderResult {
  game_id: string;
  day: IGame["day"];
  time: string;
  outcome:
    | "already-sent"
    | "error"
    | "no-players"
    | "past-cutoff"
    | "sent"
    | "stale-list";
  players?: number;
  delivered?: number;
}

export type GameRemindersRun =
  | {
      day: IGame["day"];
      occurrence: string;
      results: IGameReminderResult[];
    }
  | {
      skipped: "list-not-live" | "outside-reminder-hour" | "signups-closed";
      day?: IGame["day"];
    };

/**
 * Reminds the confirmed players of every game tomorrow. `now` is Lisbon
 * wall-clock time read as a local Date (see nowInTimeZone).
 */
export async function runGameReminders(now: Date): Promise<GameRemindersRun> {
  const hour = now.getHours();
  if (hour < GAME_REMINDER_HOUR || hour > GAME_REMINDER_LAST_HOUR) {
    return { skipped: "outside-reminder-hour" };
  }

  const admin = await getAdminSettings();
  // Players can't see or drop out of their games while signups are closed
  if (admin === undefined || !admin.signup_open) {
    return { skipped: "signups-closed" };
  }

  const tomorrow = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
  );
  const day = DAYS_IN_WEEK[getUSDayIndex(tomorrow)];
  const occurrence = getOccurrenceKey(tomorrow);

  const lastReset =
    admin.signups_reset_at !== undefined
      ? toTimeZoneWallClock(new Date(admin.signups_reset_at), GAME_TIME_ZONE)
      : undefined;

  if (
    lastReset === undefined &&
    GAME_REMINDER_EXCLUDED_DAYS_WITHOUT_RESET.has(day)
  ) {
    return { skipped: "list-not-live", day };
  }

  const games = await client
    .db("LLL")
    .collection<IGame>(Collection.GAMES)
    .find({ day, cancelled: { $ne: true }, hidden: { $ne: true } })
    .toArray();

  const results: IGameReminderResult[] = [];
  // Sequential on purpose, like the open spots cron: each send fans out to
  // every device of every player already
  for (const game of games) {
    const base = {
      game_id: game._id.toString(),
      day: game.day,
      time: game.time,
    };
    const [hours, minutes] = game.time.split(":").map(Number);
    const kickoff = new Date(
      tomorrow.getFullYear(),
      tomorrow.getMonth(),
      tomorrow.getDate(),
      hours,
      minutes,
    );

    // Lists are reused until signups reset, so if tomorrow isn't this game's
    // first kickoff since then, the list was already played: it's last week's
    if (
      lastReset !== undefined &&
      getNextKickoffAfter(game.day, game.time, lastReset).getTime() !==
        kickoff.getTime()
    ) {
      results.push({ ...base, outcome: "stale-list" });
      continue;
    }

    const cutoff = new Date(kickoff.getTime() - CANCELLATION_THRESHOLD_MS);
    // Early games whose free cancellation already closed this evening
    if (now >= cutoff) {
      results.push({ ...base, outcome: "past-cutoff" });
      continue;
    }

    const players = getConfirmedPlayerIds(game);
    if (players.length === 0) {
      results.push({ ...base, outcome: "no-players" });
      continue;
    }

    try {
      // eslint-disable-next-line no-await-in-loop
      const claimed = await claimGameReminder(base.game_id, occurrence);
      if (!claimed) {
        results.push({ ...base, outcome: "already-sent" });
        continue;
      }

      // eslint-disable-next-line no-await-in-loop
      const delivered = await notifyCancellationReminder(players, game, {
        cutoff,
        now,
      });
      results.push({
        ...base,
        outcome: "sent",
        players: players.length,
        delivered,
      });
    } catch (error) {
      console.error(
        `[reminders] Failed for game ${base.game_id} (${game.day} ${game.time}):`,
        error,
      );
      results.push({ ...base, outcome: "error" });
    }
  }

  console.log(
    `[reminders] ${day} ${occurrence}: ${results.filter(({ outcome }) => outcome === "sent").length}/${results.length} games reminded`,
  );

  return { day, occurrence, results };
}
