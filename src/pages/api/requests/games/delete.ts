import { ObjectId } from "mongodb";
import type { NextApiRequest, NextApiResponse } from "next";

import clientPromise from "@/lib/mongodb";
import { Collection } from "@/types";
import type { IUser } from "@/types/users";

export default async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { _id } = req.body as IUser;

    const client = clientPromise;
    const db = client.db("LLL");
    const collection = db.collection(Collection.GAMES);

    const result = await collection.deleteOne({
      _id: new ObjectId(_id),
    });

    if (result.acknowledged) {
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
