/* eslint-disable no-console */
// Closes signups once the last game of the week kicks off, like the admin
// page's "Disable" button. The lists themselves stay until the Monday reset,
// so admins can still track payments from them.
//
// Game times live in the DB, and Vercel crons run in UTC, once a day at most
// and only to the hour on Hobby. So vercel.json calls this hourly on Sundays
// from 08:00 to 22:00 UTC: runs before kick-off do nothing, and the first one
// after it claims the week, so later runs never undo an admin re-opening
// signups by hand. A later kick-off is left to the Monday reset.

import type { NextApiRequest, NextApiResponse } from "next";

import { GAME_TIME_ZONE } from "@/constants/date";
import { isCronAuthorised } from "@/lib/cronAuth";
import client from "@/lib/mongodb";
import { closeSignupsForWeek, getAdmin } from "@/lib/signups";
import { Collection, type IGame } from "@/types";
import { nowInTimeZone } from "@/utils/date";
import {
  getLastKickOff,
  getWeekKey,
  getWeekStart,
} from "@/utils/signupsSchedule";

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

    // Never cached: every call re-evaluates the schedule
    res.setHeader("Cache-Control", "no-store");

    const now = nowInTimeZone(GAME_TIME_ZONE);
    const localTime = now.toISOString();
    const weekStart = getWeekStart(now);
    const week = getWeekKey(weekStart);

    const games = await client
      .db("LLL")
      .collection<IGame>(Collection.GAMES)
      .find()
      .toArray();
    const lastKickOff = getLastKickOff(games, weekStart);

    if (lastKickOff === undefined) {
      res.status(200).json({ skipped: "no-games", week, localTime });
      return;
    }

    if (now < lastKickOff) {
      res.status(200).json({
        skipped: "before-last-game",
        week,
        lastKickOff: lastKickOff.toISOString(),
        localTime,
      });
      return;
    }

    const admin = await getAdmin();
    if (admin === undefined) {
      res.status(500).json({ message: "Admin document not found" });
      return;
    }

    const previous = await closeSignupsForWeek(admin._id, week);
    if (previous === null) {
      res.status(200).json({ skipped: "already-closed", week, localTime });
      return;
    }

    console.log(`[signups] Week ${week}: closed at the last kick-off`);

    res
      .status(200)
      .json({ closed: true, wasOpen: previous.signup_open, week, localTime });
  } catch (error) {
    console.error("[signups] Closing signups failed:", error);
    res.status(500).json({ message: "Error closing signups" });
  }
}
