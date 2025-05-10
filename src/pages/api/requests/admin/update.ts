/* eslint-disable no-console */
import { ObjectId } from "mongodb";
import type { NextApiRequest, NextApiResponse } from "next";

import client from "@/lib/mongodb";
import { Collection } from "@/types";
import type { IAdmin } from "@/types/admin";

export default async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== "PATCH" && req.method !== "PUT") {
    res.status(405).json({ message: "Method not allowed" });
    return;
  }

  try {
    const body = req.body as IAdmin;
    const { _id, signup_open } = body;

    const db = client.db("LLL");
    const collection = db.collection<IAdmin<ObjectId>>(Collection.ADMIN);

    const result = await collection.findOneAndUpdate(
      { _id: new ObjectId(_id) },
      {
        $set: {
          signup_open,
        },
      },
      { returnDocument: "after" },
    );

    if (result === null) {
      res.status(404).json({ message: "Document not found" });
    } else {
      res.status(200).json(result);
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error updating document" });
  }
};
