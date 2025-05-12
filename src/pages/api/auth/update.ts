import { ObjectId } from "mongodb";
import type { NextApiRequest, NextApiResponse } from "next";

import client from "@/lib/mongodb";
import { verifyAuthBody } from "@/lib/verifyAuthBody";
import { Collection } from "@/types";
import type { INewSignup } from "@/types/users";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  verifyAuthBody(req, res, "update");

  const { _id, first_name, last_name, phone_number, avatarUrl } =
    req.body as INewSignup;

  try {
    const user = await client
      .db("LLL")
      .collection(Collection.USERS)
      .findOneAndUpdate(
        { _id: new ObjectId(_id) },
        {
          $set: {
            first_name,
            last_name,
            phone_number,
            avatarUrl,
          },
        },
      );

    if (user === null) {
      res.status(401).json({ message: "Invalid credentials" });
    } else {
      res.status(200).json({
        _id: user._id,
        first_name,
        last_name,
        phone_number,
        avatarUrl,
      });
    }
  } catch (error) {
    res.status(500).json({ message: "Error updating user" });
  }
}
