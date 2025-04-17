import type { Response } from "express";
import { ObjectId } from "mongodb";

import clientPromise from "@/lib/mongodb";
import type { Signup } from "@/types/signups";

interface Request {
  body: Pick<Signup, "_id">;
}

export default async (req: Request, res: Response) => {
  try {
    const { _id } = req.body;

    const client = clientPromise;
    const db = client.db("LLL");
    const collection = db.collection("signups");

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
    console.error(error);
    res.status(500).json({ message: "Error deleting record" });
  }
};
