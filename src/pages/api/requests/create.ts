import type { Response } from "express";
import type { ObjectId } from "mongodb";

import clientPromise from "@/lib/mongodb";

interface Request {
  body: {
    game_id: string;
    first_name: string;
    last_name?: string;
    phone_number: string;
    date: Date;
  };
}

export default async (req: Request, res: Response) => {
  try {
    const { game_id, first_name, last_name, phone_number, date } = req.body;

    const client = clientPromise;
    const db = client.db("LLL");
    const collection = db.collection("signups");

    const result = await collection.insertOne({
      game_id,
      first_name,
      last_name,
      phone_number,
      date,
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
