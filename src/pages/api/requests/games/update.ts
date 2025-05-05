import { type WithId, ObjectId } from "mongodb";
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
    const body = req.body as IGame & {
      newPlayerId?: ObjectId;
      cancelPlayerId?: ObjectId;
    };
    const { _id, newPlayerId, cancelPlayerId, ...rest } = body;

    const db = client.db("LLL");
    const collection = db.collection<IGame>(Collection.GAMES);

    const gameIdWrapped = new ObjectId(_id);
    let result: WithId<IGame> | null;
    if (newPlayerId !== undefined || cancelPlayerId !== undefined) {
      result = await collection.findOneAndUpdate(
        { _id: gameIdWrapped },
        // Adding a player
        newPlayerId !== undefined
          ? {
              $addToSet: { players: newPlayerId },
            }
          : // Cancelling a player
            {
              $pull: { players: cancelPlayerId },
            },
        { returnDocument: "after" },
      );
    } else {
      result = await collection.findOneAndUpdate(
        { _id: gameIdWrapped },
        {
          $set: rest,
        },
        { returnDocument: "after" },
      );
    }

    if (result === null) {
      res.status(404).json({ message: "Document not found" });
    } else {
      res.status(200).json(result);
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
    res.status(500).json({ message: "Error updating document" });
  }
};
