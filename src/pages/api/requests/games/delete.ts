import { ObjectId } from "mongodb";
import type { NextApiRequest, NextApiResponse } from "next";

import client from "@/lib/mongodb";
import { Collection } from "@/types";
import type { IGame, IUser } from "@/types/users";

export default async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { _id } = req.body as IUser;

    const result = await client
      .db("LLL")
      .collection<IGame<ObjectId>>(Collection.GAMES)
      .deleteOne({
        _id: new ObjectId(_id),
      });

    if (result.acknowledged) {
      res.status(201).json({
        message: "Record deleted successfully",
      });
    } else {
      res.status(500).json({ message: "Error deleting record" });
    }
  } catch (error) {
    res.status(500).json({ message: "Error deleting record" });
  }
};
