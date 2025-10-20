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

  const db = client.db("LLL");
  const users = db.collection(Collection.USERS);

  const userId = new ObjectId(_id);
  const user = await users.findOne<INewSignup>({ _id: userId });
  const userWithNumber = await users.findOne<INewSignup>({
    _id: { $ne: userId },
    phone_number,
  });

  if (!user || userWithNumber?._id !== undefined) {
    res.status(401).json({
      message:
        user !== null &&
        userWithNumber?._id?.toString() !== user._id?.toString()
          ? "User with number already exists"
          : "Invalid credentials",
    });
  } else {
    await users.updateOne(
      { _id: user._id },
      {
        $set: {
          first_name,
          last_name,
          phone_number,
          avatarUrl,
        },
      },
    );

    res.status(200).json({
      _id: user._id,
      first_name,
      last_name,
      phone_number,
      avatarUrl,
    });
  }
}
