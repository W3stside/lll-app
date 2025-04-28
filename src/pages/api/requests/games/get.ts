/* eslint-disable no-console */
import type { Request, Response } from "express";

import clientPromise from "@/lib/mongodb";
import { Collection } from "@/types";

export default async (_: Request, res: Response) => {
  try {
    const client = clientPromise;
    const db = client.db("LLL");
    const signups = await db.collection(Collection.GAMES).find({}).toArray();

    res.status(201).json(signups);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Error getting games" });
  }
};
