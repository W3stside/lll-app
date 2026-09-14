/* eslint-disable no-console */
import type { NextApiRequest, NextApiResponse } from "next";

import { getUserIdFromApiRequest } from "@/lib/authUtils";
import { countUnreadNotifications } from "@/lib/inbox";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "GET") {
    res.status(405).json({ message: "Method not allowed" });
    return;
  }

  const userId = getUserIdFromApiRequest(req.cookies);
  if (userId === null) {
    res.status(401).json({ message: "Not logged in" });
    return;
  }

  try {
    // Per user and changes often: never let a CDN or the browser reuse it
    res.setHeader("Cache-Control", "private, no-store");
    res.status(200).json({ count: await countUnreadNotifications(userId) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error counting notifications" });
  }
}
