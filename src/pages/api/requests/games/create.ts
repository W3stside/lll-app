/* eslint-disable no-console */
import type { ObjectId } from "mongodb";
import type { NextApiRequest, NextApiResponse } from "next";

import clientPromise from "@/lib/mongodb";
import { Collection } from "@/types";
import type { Gender, IGame } from "@/types/users";

export default async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const body = req.body as Omit<IGame, "_id" | "players">;
    const { game_id, time, location, address, mapUrl, speed, day, gender } =
      body;

    const client = clientPromise;
    const db = client.db("LLL");
    const collection = db.collection(Collection.GAMES);

    const result = await collection.insertOne({
      time,
      location,
      address,
      mapUrl,
      speed,
      game_id,
      day,
      gender: (gender as Gender | "") !== "" ? gender : null,
    });

    if (result.insertedId as ObjectId | undefined) {
      const insertedDocument = {
        _id: result.insertedId, // Use the insertedId as the document's _id
        ...body, // Include the rest of the document data
      };
      res.status(201).json({
        message: "Record created successfully",
        data: insertedDocument,
      });
    } else {
      res.status(500).json({ message: "Error creating record" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error creating record" });
  }
};
