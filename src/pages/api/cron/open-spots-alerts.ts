/* eslint-disable no-console */
// Pushes an "open spots" alert for every game tomorrow that still has
// confirmed spots free. Monday games are skipped, so nothing goes out on
// Sundays.
//
// Vercel crons run in UTC and Lisbon switches between UTC and UTC+1. One cron
// at 07:30 UTC (see vercel.json) therefore lands at 07:30 in winter and 08:30
// in summer: late rather than early, so the push never beats the banner. The
// hour check below only stops a stray manual call from alerting at midday, and
// the per-occurrence claim in lib/openSpotsAlerts makes any repeat a no-op.

import type { NextApiRequest, NextApiResponse } from "next";

import { DAYS_IN_WEEK, GAME_TIME_ZONE } from "@/constants/date";
import {
  OPEN_SPOTS_ALERT_HOUR,
  OPEN_SPOTS_PUSH_LAST_HOUR,
} from "@/constants/notifications";
import { isCronAuthorised } from "@/lib/cronAuth";
import client from "@/lib/mongodb";
import { claimOpenSpotsAlert } from "@/lib/openSpotsAlerts";
import { resetSignupsIfDue } from "@/lib/signups";
import { type IAdmin, Collection, type IGame } from "@/types";
import { getUSDayIndex, nowInTimeZone } from "@/utils/date";
import { getOpenSpots } from "@/utils/games";
import { notifyOpenSpots } from "@/utils/notifications";
import {
  gameNeedsPlayers,
  getOpenSpotsAlertOccurrence,
  isOpenSpotsAlertDay,
} from "@/utils/openSpots";

interface IGameResult {
  game_id: string;
  day: IGame["day"];
  time: string;
  openSpots: number;
  outcome: "already-sent" | "error" | "full" | "sent";
  delivered?: number;
}

async function _isSignupOpen(): Promise<boolean> {
  const admin = (
    await client
      .db("LLL")
      .collection<IAdmin>(Collection.ADMIN)
      .find()
      .limit(1)
      .toArray()
  ).at(0);

  return admin !== undefined && admin.signup_open;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "GET" && req.method !== "POST") {
    res.status(405).json({ message: "Method not allowed" });
    return;
  }

  try {
    if (!(await isCronAuthorised(req))) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    // Never cached: every call re-evaluates the lists
    res.setHeader("Cache-Control", "no-store");

    // Also the Monday reset's winter slot: reset-signups runs at 06:00 UTC,
    // which is 07:00 in Lisbon in summer but only 06:00 in winter. It goes
    // first so the alerts below see this week's lists, and is a no-op on
    // other days or once the week's reset has run
    try {
      await resetSignupsIfDue();
    } catch (error) {
      console.error("[signups] Weekly reset failed:", error);
    }

    const now = nowInTimeZone(GAME_TIME_ZONE);
    const localTime = now.toISOString();

    const hour = now.getHours();
    if (hour < OPEN_SPOTS_ALERT_HOUR || hour > OPEN_SPOTS_PUSH_LAST_HOUR) {
      res.status(200).json({ skipped: "outside-alert-hour", localTime });
      return;
    }

    const tomorrow = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1,
    );
    const day = DAYS_IN_WEEK[getUSDayIndex(tomorrow)];
    const occurrence = getOpenSpotsAlertOccurrence(tomorrow);

    if (!isOpenSpotsAlertDay(day)) {
      res.status(200).json({ skipped: "excluded-day", day, localTime });
      return;
    }

    if (!(await _isSignupOpen())) {
      res.status(200).json({ skipped: "signups-closed", day, localTime });
      return;
    }

    const games = await client
      .db("LLL")
      .collection<IGame>(Collection.GAMES)
      .find({ day, cancelled: { $ne: true }, hidden: { $ne: true } })
      .toArray();

    const results: IGameResult[] = [];
    // Sequential on purpose: each send fans out to every device already
    for (const game of games) {
      const base = {
        game_id: game._id.toString(),
        day: game.day,
        time: game.time,
        openSpots: getOpenSpots(game),
      };

      if (!gameNeedsPlayers(game)) {
        results.push({ ...base, outcome: "full" });
        continue;
      }

      try {
        // eslint-disable-next-line no-await-in-loop
        const claimed = await claimOpenSpotsAlert(base.game_id, occurrence);
        if (!claimed) {
          results.push({ ...base, outcome: "already-sent" });
          continue;
        }

        // eslint-disable-next-line no-await-in-loop
        const delivered = await notifyOpenSpots(game);
        results.push({ ...base, outcome: "sent", delivered });
      } catch (error) {
        console.error(
          `[open-spots] Failed for game ${base.game_id} (${game.day} ${game.time}):`,
          error,
        );
        results.push({ ...base, outcome: "error" });
      }
    }

    console.log(
      `[open-spots] ${day} ${occurrence}: ${results.filter(({ outcome }) => outcome === "sent").length}/${results.length} games alerted`,
    );

    res.status(200).json({ day, occurrence, localTime, results });
  } catch (error) {
    console.error("[open-spots] Cron run failed:", error);
    res.status(500).json({ message: "Error sending open spots alerts" });
  }
}
