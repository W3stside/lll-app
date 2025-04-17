/* eslint-disable no-console */
import type { Request, Response } from "express";

import { MAX_SIGNUPS } from "@/constants/signups";
import clientPromise from "@/lib/mongodb";

export default async (_: Request, res: Response) => {
  try {
    const client = clientPromise;
    const db = client.db("LLL");
    const signups = await db
      .collection("signups")
      .find({})
      .limit(MAX_SIGNUPS)
      .toArray();

    res.status(201).json({
      message: "Signups fetched successfully",
      data: signups,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Error getting signups" });
  }
};
