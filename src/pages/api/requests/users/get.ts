/* eslint-disable no-console */
import type { NextApiRequest, NextApiResponse } from "next";

import client from "@/lib/mongodb";
import { requireAdmin } from "@/lib/requireAdmin";
import { Collection } from "@/types";
import type { IUser } from "@/types/users";

export default async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== "GET") {
    res.status(405).json({ message: "Method not allowed" });
    return;
  }

  try {
    // Admin-only: every player's phone number and debts. Password hashes are
    // never sent, not even to admins
    if (!(await requireAdmin(req, res))) return;

    const users = await client
      .db("LLL")
      .collection<IUser>(Collection.USERS)
      .find({}, { projection: { password: 0 } })
      .toArray();

    res.status(200).json(users);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Error getting users" });
  }
};
