/* eslint-disable no-console */
import type { NextApiRequest, NextApiResponse } from "next";

import clientPromise from "@/lib/mongodb";
import { Collection } from "@/types";

export default async (_: NextApiRequest, res: NextApiResponse) => {
  try {
    const client = clientPromise;
    const db = client.db("LLL");
    const admin = await db.collection(Collection.ADMIN).find({}).toArray();

    res.status(201).json(admin);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Error getting admin data" });
  }
};
