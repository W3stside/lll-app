/* eslint-disable no-console */
import { ObjectId } from "mongodb";
import type { NextApiRequest, NextApiResponse } from "next";

import { requireAdmin } from "@/lib/requireAdmin";
import { setSignupsOpen } from "@/lib/signups";
import type { IAdmin } from "@/types/admin";

export default async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== "PATCH" && req.method !== "PUT") {
    res.status(405).json({ message: "Method not allowed" });
    return;
  }

  try {
    // Re-opening signups broadcasts a push to every subscribed device, so an
    // open route would let anyone spam all users by toggling it
    if (!(await requireAdmin(req, res))) return;

    const body = req.body as IAdmin;
    const { _id, signup_open } = body;

    const previous = await setSignupsOpen(new ObjectId(_id), signup_open);

    if (previous === null) {
      res.status(404).json({ message: "Document not found" });
    } else {
      res.status(200).json({ ...previous, signup_open });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error updating document" });
  }
};
