import type { ObjectId } from "mongodb";
import type { NextApiRequest, NextApiResponse } from "next";

import client from "@/lib/mongodb";
import { Collection, type Gender, type IGame } from "@/types";

export default async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const body = req.body as Omit<IGame, "_id">;
    const { gender, ...restGame } = body;

    const db = client.db("LLL");
    const gamesCollection = db.collection(Collection.GAMES);

    const result = await gamesCollection.insertOne({
      ...restGame,
      gender: (gender as Gender | "") !== "" ? gender : null,
    });

    if (result.insertedId as ObjectId | undefined) {
      const newGame = {
        _id: result.insertedId, // Use the insertedId as the document's _id
        ...body, // Include the rest of the document data
      };
      const updatedGames = await gamesCollection.find().toArray();
      res.status(200).json({ createdGame: newGame, games: updatedGames });
    } else {
      res.status(500).json({ message: "Error creating record" });
    }
  } catch (error) {
    res.status(500).json({ message: "Error creating record" });
  }
};
