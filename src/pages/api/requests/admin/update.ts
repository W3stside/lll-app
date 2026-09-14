/* eslint-disable no-console */
import { ObjectId } from "mongodb";
import type { NextApiRequest, NextApiResponse } from "next";

import client from "@/lib/mongodb";
import { requireAdmin } from "@/lib/requireAdmin";
import { Collection } from "@/types";
import type { IAdmin } from "@/types/admin";
import { notifySignupsOpen } from "@/utils/notifications";

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

    const db = client.db("LLL");
    const collection = db.collection<IAdmin>(Collection.ADMIN);

    // "before" so we can tell a real closed -> open transition from a repeat
    // click, and only broadcast once per opening
    const previous = await collection.findOneAndUpdate(
      { _id: new ObjectId(_id) },
      {
        $set: {
          signup_open,
        },
      },
      { returnDocument: "before" },
    );

    if (previous === null) {
      res.status(404).json({ message: "Document not found" });
    } else {
      if (signup_open && !previous.signup_open) {
        await notifySignupsOpen();
      }

      res.status(200).json({ ...previous, signup_open });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error updating document" });
  }
};
