import type { ObjectId } from "mongodb";
import type { NextApiRequest, NextApiResponse } from "next";

import client from "@/lib/mongodb";
import { Collection } from "@/types";
import type { Gender, IGame } from "@/types/users";

export default async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const body = req.body as Omit<IGame, "_id">;
    const { gender, ...restGame } = body;

    const result = await client
      .db("LLL")
      .collection(Collection.GAMES)
      .insertOne({
        ...restGame,
        gender: (gender as Gender | "") !== "" ? gender : null,
      });

    if (result.insertedId as ObjectId | undefined) {
      const insertedDocument = {
        ...body, // Include the rest of the document data
        _id: result.insertedId, // Use the insertedId as the document's _id
      };
      res.status(201).json(insertedDocument);
    } else {
      res.status(500).json({ message: "Error creating record" });
    }
  } catch (error) {
    res.status(500).json({ message: "Error creating record" });
  }
};
