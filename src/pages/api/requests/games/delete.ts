import { ObjectId } from "mongodb";
import type { NextApiRequest, NextApiResponse } from "next";

import { clearGameNotifications } from "@/lib/inbox";
import clientPromise from "@/lib/mongodb";
import { requireAdmin } from "@/lib/requireAdmin";
import { Collection } from "@/types";
import type { IUser } from "@/types/users";

export default async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== "DELETE") {
    res.status(405).json({ message: "Method not allowed" });
    return;
  }

  try {
    // Admin-only: deletes games
    if (!(await requireAdmin(req, res))) return;

    const { _id } = req.body as IUser;

    const client = clientPromise;
    const db = client.db("LLL");
    const collection = db.collection(Collection.GAMES);

    const result = await collection.deleteOne({
      _id: new ObjectId(_id),
    });

    if (result.acknowledged) {
      // A deleted game's notifications would point at nothing
      await clearGameNotifications(new ObjectId(_id).toString());
      res.status(201).json({
        message: "Record deleted successfully",
      });
    } else {
      res.status(500).json({ message: "Error deleting record" });
    }
  } catch (error) {
    res.status(500).json({ message: "Error deleting record" });
  }
};
