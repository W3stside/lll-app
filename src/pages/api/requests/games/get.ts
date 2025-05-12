import type { Request, Response } from "express";
import type { ObjectId } from "mongodb";

import client from "@/lib/mongodb";
import { Collection } from "@/types";
import type { IGame } from "@/types/users";

export default async (_: Request, res: Response) => {
  try {
    const signups = await client
      .db("LLL")
      .collection<IGame<ObjectId>>(Collection.GAMES)
      .find({})
      .toArray();

    res.status(201).json(signups);
  } catch (e) {
    res.status(500).json({ message: "Error getting games" });
  }
};
