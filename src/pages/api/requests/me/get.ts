import { ObjectId } from "mongodb";
import type { NextApiRequest, NextApiResponse } from "next";

import { JWT_REFRESH_SECRET, JWT_SECRET, verifyToken } from "@/lib/authUtils";
import client from "@/lib/mongodb";
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
    const decodedUser = verifyToken<IUser>(
      token,
      JWT_SECRET as string,
      JWT_REFRESH_SECRET,
    );

    await client.connect();
    const db = client.db("LLL");
    const user = await db
      .collection<IUser>(Collection.USERS)
      .findOne(
        { _id: new ObjectId(decodedUser._id) },
        { projection: { password: 0 } },
      );

    res.status(200).json(user);
  }
}
