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

import { timingSafeEqual } from "crypto";
import type { NextApiRequest, NextApiResponse } from "next";

import { DAYS_IN_WEEK, GAME_TIME_ZONE } from "@/constants/date";
import {
  OPEN_SPOTS_ALERT_HOUR,
  OPEN_SPOTS_PUSH_LAST_HOUR,
} from "@/constants/notifications";
import client from "@/lib/mongodb";
import { claimOpenSpotsAlert } from "@/lib/openSpotsAlerts";
import { getApiRequester } from "@/lib/requireAdmin";
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

function _secretsMatch(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

// Vercel sends `Authorization: Bearer $CRON_SECRET` when the env var is set;
// any other scheduler can do the same. Admins may also hit the route from a
// logged-in browser to test it.
async function _isAuthorised(req: NextApiRequest): Promise<boolean> {
  const secret = process.env.CRON_SECRET;
  const { authorization } = req.headers;

  if (secret === undefined || secret.trim() === "") {
    console.warn(
      "[open-spots] CRON_SECRET is not set - scheduled runs are rejected",
    );
  } else if (
    authorization !== undefined &&
    _secretsMatch(authorization, `Bearer ${secret}`)
  ) {
    return true;
  }

  const requester = await getApiRequester(req);
  return requester !== null && requester.isAdmin;
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
    if (!(await _isAuthorised(req))) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    // Never cached: every call re-evaluates the lists
    res.setHeader("Cache-Control", "no-store");

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
