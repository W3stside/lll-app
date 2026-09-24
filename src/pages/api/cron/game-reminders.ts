/* eslint-disable no-console */
// Reminds each game's confirmed players, the evening before, to drop out while
// it's still free (see lib/gameReminders).
//
// One cron at 19:00 UTC (see vercel.json) lands at 19:00 in Lisbon in winter
// and 20:00 in summer. The hour check only stops a stray manual call from
// reminding at midday, and the per-occurrence claim makes any repeat a no-op.

import type { NextApiRequest, NextApiResponse } from "next";

import { GAME_TIME_ZONE } from "@/constants/date";
import { isCronAuthorised } from "@/lib/cronAuth";
import { runGameReminders } from "@/lib/gameReminders";
import { nowInTimeZone } from "@/utils/date";

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

    const now = nowInTimeZone(GAME_TIME_ZONE);
    const run = await runGameReminders(now);

    res.status(200).json({ ...run, localTime: now.toISOString() });
  } catch (error) {
    console.error("[reminders] Cron run failed:", error);
    res.status(500).json({ message: "Error sending game reminders" });
  }
}
