/* eslint-disable no-console */
// Starts each week on Monday morning, Lisbon time: every list is cleared and
// signups re-open, like the admin page's "Clear all" then "Enable" - including
// the "Signups are open!" push. See resetSignupsIfDue for the rules.
//
// Vercel crons run in UTC, and on Hobby at most once a day each. This one
// runs at 06:00 UTC on Mondays: 07:00 in Lisbon in summer. In winter that is
// still 06:00 in Lisbon, too early to act, and the daily open-spots cron
// (07:30 UTC) finishes the reset instead.

import type { NextApiRequest, NextApiResponse } from "next";

import { isCronAuthorised } from "@/lib/cronAuth";
import { resetSignupsIfDue } from "@/lib/signups";

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

    res.status(200).json(await resetSignupsIfDue());
  } catch (error) {
    console.error("[signups] Resetting signups failed:", error);
    res.status(500).json({ message: "Error resetting signups" });
  }
}
