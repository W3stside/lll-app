/* eslint-disable no-console */
import { ObjectId } from "mongodb";
import type { NextApiRequest, NextApiResponse } from "next";

import client from "@/lib/mongodb";
import { Collection } from "@/types";
import type { IUser } from "@/types/users";

export default async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== "PATCH" && req.method !== "PUT") {
    res.status(405).json({ message: "Method not allowed" });
    return;
  }

  try {
    const body = req.body as IUser;
    const {
      _id,
      shame: [shameOne],
      ...rest
    } = body;

    const db = client.db("LLL");
    const collection = db.collection<IUser>(Collection.USERS);

    const result = await collection.updateOne(
      { _id: new ObjectId(_id) },
      {
        $set: rest,
        $push: { shame: shameOne },
      },
    );

    if (result.matchedCount === 0) {
      res.status(404).json({ message: "Document not found" });
    } else if (result.acknowledged) {
      res.status(200).json(result);
    } else {
      res.status(500).json({ message: "Error updating document" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error updating document" });
  }
};
