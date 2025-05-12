import { ObjectId } from "mongodb";
import type { NextApiRequest, NextApiResponse } from "next";

import client from "@/lib/mongodb";
import { Collection } from "@/types";
import type { IUser } from "@/types/users";

export default async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const body = req.body as IUser;
    const { _id } = body;

    const result = await client
      .db("LLL")
      .collection<IUser<ObjectId>>(Collection.USERS)
      .deleteOne({
        _id: new ObjectId(_id),
      });

    if (result.acknowledged) {
      res.status(201).json({
        message: "User deleted successfully",
      });
    } else {
      throw new Error("Error deleting user");
    }
  } catch (error) {
    res.status(500).json({ message: "Error deleting user" });
  }
};
