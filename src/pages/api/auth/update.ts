import { ObjectId } from "mongodb";
import type { NextApiRequest, NextApiResponse } from "next";

import { getUserIdFromApiRequest } from "@/lib/authUtils";
import client from "@/lib/mongodb";
import { verifyAuthBody } from "@/lib/verifyAuthBody";
import { Collection } from "@/types";
import type { INewSignup } from "@/types/users";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (!verifyAuthBody(req, res, "update")) return;

  // Always the session user, never the body `_id`: otherwise anyone could
  // rewrite another account's name or phone number
  const sessionUserId = getUserIdFromApiRequest(req.cookies);
  if (sessionUserId === null) {
    res.status(401).json({ message: "Not logged in" });
    return;
  }

  const { _id, first_name, last_name, phone_number, avatarUrl } =
    req.body as INewSignup;

  if (_id !== undefined && _id.toString() !== sessionUserId) {
    res.status(403).json({ message: "You can only update your own account" });
    return;
  }

  const db = client.db("LLL");
  const users = db.collection(Collection.USERS);

  const userId = new ObjectId(sessionUserId);
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
          ? "User with this number already exists"
          : "Invalid credentials",
    });
  } else {
    // The SMS lock proves ownership of one specific number. A new number hasn't
    // been proven, so the account goes back through verification.
    const phoneChanged = phone_number !== user.phone_number;
    const verified = phoneChanged ? false : user.verified;

    await users.updateOne(
      { _id: user._id },
      {
        $set: {
          first_name,
          last_name,
          phone_number,
          avatarUrl,
          ...(phoneChanged ? { verified: false } : {}),
        },
      },
    );

    res.status(200).json({
      _id: user._id,
      first_name,
      last_name,
      phone_number,
      avatarUrl,
      verified,
    });
  }
}
