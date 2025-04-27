/* eslint-disable no-console */
import type { NextApiRequest, NextApiResponse } from "next";

import clientPromise from "@/lib/mongodb";
import { Collection } from "@/types";

const ABSOLUTE_MAX_SIGNUPS_REQUEST = 200;

export default async (_: NextApiRequest, res: NextApiResponse) => {
  try {
    const client = clientPromise;
    const db = client.db("LLL");
    const users = await db
      .collection(Collection.USERS)
      .find({})
      .limit(ABSOLUTE_MAX_SIGNUPS_REQUEST)
      .toArray();

    res.status(201).json(users);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Error getting users" });
  }
};
