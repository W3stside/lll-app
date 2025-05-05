import { ObjectId, type UpdateResult } from "mongodb";
import type { NextApiRequest, NextApiResponse } from "next";

import client from "@/lib/mongodb";
import { Collection } from "@/types";
import type { IGame } from "@/types/users";

export default async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== "PATCH" && req.method !== "PUT") {
    res.status(405).json({ message: "Method not allowed" });
    return;
  }

  try {
    const body = req.body as IGame & { newPlayerId?: ObjectId };
    const { _id, newPlayerId, ...rest } = body;

    const db = client.db("LLL");
    const collection = db.collection<IGame>(Collection.GAMES);

    let result: UpdateResult<IGame>;
    if (newPlayerId !== undefined) {
      result = await collection.updateOne(
        { _id: new ObjectId(_id) },
        {
          $addToSet: { players: newPlayerId },
        },
      );
    } else {
      result = await collection.updateOne(
        { _id: new ObjectId(_id) },
        {
          $set: rest,
        },
      );
    }
    const updatedGame = await collection.findOne({
      _id: new ObjectId(_id),
    });

    if (result.matchedCount === 0) {
      res.status(404).json({ message: "Document not found" });
    } else if (result.acknowledged) {
      res.status(200).json(updatedGame);
    } else {
      throw new Error("Error updating document");
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
    res.status(500).json({ message: "Error updating document" });
  }
};
