import type { NextApiRequest, NextApiResponse } from "next";

import { requireAdmin } from "@/lib/requireAdmin";
import { clearAllSignups } from "@/lib/signups";

export default async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== "PATCH" && req.method !== "PUT") {
    res.status(405).json({ message: "Method not allowed" });
    return;
  }

  try {
    // Admin-only: wipes every signup list and everyone's inbox
    if (!(await requireAdmin(req, res))) return;

    const newGames = await clearAllSignups();

    if (newGames === null) {
      res.status(404).json({ message: "Document not found" });
    } else {
      res.status(200).json(newGames);
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
    res.status(500).json({ message: "Error updating document" });
  }
};
