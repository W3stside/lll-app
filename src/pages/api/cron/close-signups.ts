/* eslint-disable no-console */
// Closes signups on Sunday night, like the admin page's "Disable" button. See
// closeSignupsIfDue for the rules.
//
// Vercel crons run in UTC, so vercel.json calls this at 22:59 UTC on Sundays:
// 23:59 in Lisbon in summer and 22:59 in winter, so always on Sunday night.

import type { NextApiRequest, NextApiResponse } from "next";

import { isCronAuthorised } from "@/lib/cronAuth";
import { closeSignupsIfDue } from "@/lib/signups";

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

    res.status(200).json(await closeSignupsIfDue());
  } catch (error) {
    console.error("[signups] Closing signups failed:", error);
    res.status(500).json({ message: "Error closing signups" });
  }
}
