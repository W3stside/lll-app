/* eslint-disable no-console */
import type { ObjectId } from "mongodb";
import type { NextApiRequest, NextApiResponse } from "next";

import clientPromise from "@/lib/mongodb";
import { Collection } from "@/types";
import type { IUser } from "@/types/users";

export default async (_: NextApiRequest, res: NextApiResponse) => {
  try {
    const client = clientPromise;
    const db = client.db("LLL");
    const users = await db
      .collection<IUser<ObjectId>>(Collection.USERS)
      .find({})
      .toArray();

    res.status(201).json(users);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Error getting users" });
  }
};
