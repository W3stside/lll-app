/* eslint-disable no-console */
// Starts each week on Monday at 07:00, Lisbon time: every list is cleared and
// signups re-open, like the admin page's "Clear all" then "Enable" - including
// the "Signups are open!" push.
//
// Vercel crons run in UTC and Lisbon switches between UTC and UTC+1, so
// vercel.json calls this at 06:00 and 07:00 UTC. Only a run from 07:00 local
// time acts, and it claims the week first: the other run is a no-op, or a
// retry when the first one failed.
//
// Lists an admin already reset after last week's final kick-off are kept, as
// they may have been set up by hand since, and so are lists an admin already
// re-opened that may hold this week's signups.

import type { NextApiRequest, NextApiResponse } from "next";

import { GAME_TIME_ZONE } from "@/constants/date";
import { isCronAuthorised } from "@/lib/cronAuth";
import client from "@/lib/mongodb";
import {
  claimSignupsReset,
  clearAllSignups,
  getAdmin,
  releaseSignupsReset,
  setSignupsOpen,
} from "@/lib/signups";
import { Collection, type IGame } from "@/types";
import { getUSDayIndex, nowInTimeZone, toTimeZone } from "@/utils/date";
import { notifySignupsOpen } from "@/utils/notifications";
import {
  getLastKickOff,
  getPreviousWeekStart,
  getSignupsResetTime,
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

    // Monday from 07:00 only: a stray call later in the week must never wipe
    // the lists players are signing up to
    if (getUSDayIndex(now) !== 0 || now < getSignupsResetTime(weekStart)) {
      res
        .status(200)
        .json({ skipped: "outside-reset-window", week, localTime });
      return;
    }

    const admin = await getAdmin();
    if (admin === undefined) {
      res.status(500).json({ message: "Admin document not found" });
      return;
    }

    const previous = await claimSignupsReset(admin._id, week);
    if (previous === null) {
      res.status(200).json({ skipped: "already-reset", week, localTime });
      return;
    }

    try {
      const games = await client
        .db("LLL")
        .collection<IGame>(Collection.GAMES)
        .find()
        .toArray();

      // Falls back to midnight when nothing was played last week
      const lastWeekEnd =
        getLastKickOff(games, getPreviousWeekStart(weekStart)) ?? weekStart;
      const lastReset =
        previous.signups_reset_at !== undefined
          ? toTimeZone(previous.signups_reset_at, GAME_TIME_ZONE)
          : undefined;

      // Lists nobody cleared since last week's final kick-off still hold last
      // week's players. With no reset on record, open lists might already hold
      // this week's, so only closed ones are cleared
      const clearLists =
        lastReset !== undefined
          ? lastReset < lastWeekEnd
          : !previous.signup_open;

      if (previous.signup_open && !clearLists) {
        res.status(200).json({ skipped: "already-open", week, localTime });
        return;
      }

      if (clearLists) await clearAllSignups();

      const beforeOpening = await setSignupsOpen(admin._id, true);
      // setSignupsOpen only broadcasts when it re-opens: lists that were open
      // all along were just emptied, so everyone still needs telling
      if (clearLists && beforeOpening?.signup_open === true) {
        await notifySignupsOpen();
      }

      console.log(
        `[signups] Week ${week}: ${clearLists ? "lists cleared, " : ""}signups open`,
      );

      res.status(200).json({
        reset: true,
        cleared: clearLists,
        wasOpen: previous.signup_open,
        week,
        localTime,
      });
    } catch (error) {
      // Hand the claim back so the next run can retry. It won't clear twice:
      // clearAllSignups records the reset once the lists are empty
      await releaseSignupsReset(admin._id, week).catch(
        (releaseError: unknown) => {
          console.error("[signups] Failed to release the claim:", releaseError);
        },
      );
      throw error;
    }
  } catch (error) {
    console.error("[signups] Resetting signups failed:", error);
    res.status(500).json({ message: "Error resetting signups" });
  }
}
