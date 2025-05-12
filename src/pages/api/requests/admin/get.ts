/* eslint-disable no-console */
import type { NextApiRequest, NextApiResponse } from "next";

import client from "@/lib/mongodb";
import { Collection } from "@/types";

export default async (_: NextApiRequest, res: NextApiResponse) => {
  try {
    const admin = await client
      .db("LLL")
      .collection(Collection.ADMIN)
      .find({})
      .toArray();

    res.status(201).json(admin);
  } catch (e) {
    res.status(500).json({ message: "Error getting admin data" });
  }
};
