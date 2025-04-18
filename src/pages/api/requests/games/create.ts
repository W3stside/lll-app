/* eslint-disable no-console */
import type { Response } from "express";
import type { ObjectId } from "mongodb";

import clientPromise from "@/lib/mongodb";

interface Request {
  body: {
    time: string;
    location: string;
    address: string;
    mapUrl: string;
    speed: "faster" | "mixed" | "slower";
    game_id: string;
    day:
      | "Friday"
      | "Monday"
      | "Saturday"
      | "Sunday"
      | "Thursday"
      | "Tuesday"
      | "Wednesday";
  };
}

export default async (req: Request, res: Response) => {
  try {
    const { game_id, time, location, address, mapUrl, speed, day } = req.body;

    const client = clientPromise;
    const db = client.db("LLL");
    const collection = db.collection("games");

    const result = await collection.insertOne({
      time,
      location,
      address,
      mapUrl,
      speed,
      game_id,
      day,
    });

    if (result.insertedId as ObjectId | undefined) {
      const insertedDocument = {
        _id: result.insertedId, // Use the insertedId as the document's _id
        ...req.body, // Include the rest of the document data
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
