import type { ObjectId } from "mongodb";
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
    const db = client.db("LLL");
    const collection = db.collection<IGame<ObjectId>>(Collection.GAMES);

    const games = await collection.find({}).toArray();
    const result = await collection.updateMany(
      { _id: { $in: games.map(({ _id }) => _id) } },
      {
        $set: {
          players: [],
        },
      },
    );

    const gamesBulkUpdates = games.map(({ _id, organisers = [] }) => ({
      updateOne: {
        filter: { _id },
        update: {
          $addToSet: {
            players: {
              $each: organisers,
            },
          },
        },
      },
    }));

    const bulkResults = await collection.bulkWrite(gamesBulkUpdates);
    const newGames = await collection.find({}).toArray();

    if (bulkResults.matchedCount === 0) {
      res.status(404).json({ message: "Document not found" });
    } else if (result.acknowledged) {
      res.status(200).json(newGames);
    } else {
      res.status(500).json({ message: "Error updating document" });
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
    res.status(500).json({ message: "Error updating document" });
  }
};
