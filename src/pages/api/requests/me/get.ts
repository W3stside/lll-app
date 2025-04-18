import { ObjectId } from "mongodb";
import type { NextApiRequest, NextApiResponse } from "next";

import client from "@/lib/mongodb";
import { verifyToken } from "@/lib/verifyToken";
import { Collection } from "@/types";
import type { IUser } from "@/types/users";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const { token } = req.cookies;
  if (token === undefined) {
    res.status(401).json({ message: "No token" });
  } else {
    const decoded = verifyToken(token) as Partial<IUser> | null;
    if (decoded === null) {
      res.status(401).json({ message: "Invalid token" });
    } else {
      await client.connect();
      const db = client.db("LLL");
      const user = await db.collection<IUser>(Collection.USERS).findOne({
        _id: new ObjectId(decoded._id),
      });

      res.status(200).json(user);
    }
  }
}
