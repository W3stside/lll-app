/* eslint-disable no-console */
import { ObjectId } from "mongodb";
import type { NextApiRequest, NextApiResponse } from "next";

import client from "@/lib/mongodb";
import { requireAdmin } from "@/lib/requireAdmin";
import { Collection } from "@/types";
import type { IUser } from "@/types/users";

export default async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== "DELETE") {
    res.status(405).json({ message: "Method not allowed" });
    return;
  }

  try {
    if (!(await requireAdmin(req, res))) return;

    const body = req.body as IUser;
    const { _id } = body;

    const collection = client.db("LLL").collection<IUser>(Collection.USERS);

    const result = await collection.deleteOne({
      _id: new ObjectId(_id),
    });

    if (result.acknowledged) {
      res.status(201).json({
        message: "User deleted successfully",
      });
    } else {
      res.status(500).json({ message: "Error deleting user" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error deleting user" });
  }
};
