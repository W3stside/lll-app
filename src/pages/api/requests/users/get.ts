import type { ObjectId } from "mongodb";
import type { NextApiRequest, NextApiResponse } from "next";

import client from "@/lib/mongodb";
import { Collection } from "@/types";
import type { IUser } from "@/types/users";

export default async (_: NextApiRequest, res: NextApiResponse) => {
  try {
    const users = await client
      .db("LLL")
      .collection<IUser<ObjectId>>(Collection.USERS)
      .find()
      .toArray();

    res.status(201).json(users);
  } catch (e) {
    res.status(500).json({ message: "Error getting users" });
  }
};
