/* eslint-disable no-console */
import type { Response } from "express";
import type { ObjectId } from "mongodb";

import client from "@/lib/mongodb";
import type { Signup } from "@/types/signups";

interface Request {
  body: Signup;
}

export default async (req: Request, res: Response) => {
  try {
    const { first_name, last_name, phone_number } = req.body;

    const db = client.db("LLL");
    const collection = db.collection("wall-of-shame");

    const result = await collection.insertOne({
      first_name,
      last_name,
      phone_number,
    });

    if (result.insertedId as ObjectId | undefined) {
      const insertedDocument = {
        ...req.body, // Include the rest of the document data
        _id: result.insertedId, // Use the insertedId as the document's _id
      };
      res.status(201).json({
        message: "Wall of Shame record created successfully",
        data: insertedDocument,
      });
    } else {
      res.status(500).json({ message: "Error creating Wall of Shame record" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error creating Wall of Shame record" });
  }
};
