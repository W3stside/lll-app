import bcrypt from "bcryptjs";
import type { NextApiRequest, NextApiResponse } from "next";

import { SALT_ROUNDS } from "@/constants/api";
import { BANNED_USERS_SET } from "@/constants/blacklist";
import { refreshAndSetJwtTokens } from "@/lib/authUtils";
import client from "@/lib/mongodb";
import { verifyAuthBody } from "@/lib/verifyAuthBody";
import { Collection } from "@/types";
import type { INewSignup } from "@/types/users";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  try {
    if (!verifyAuthBody(req, res, "register")) return;

    const { first_name, last_name, phone_number, password } =
      req.body as INewSignup;

    if (BANNED_USERS_SET.has(phone_number)) {
      throw new Error(
        "This number has been banned from signups due to consistent no-shows and/or other violations.",
      );
    }

    const db = client.db("LLL");
    const users = db.collection<INewSignup>(Collection.USERS);

    const existingUser = await users.findOne({ phone_number });
    // Only register-created accounts that never passed SMS verification carry an
    // explicit `verified: false`. Accounts from before verification existed have
    // no field at all and may hold real history, so they are never replaced.
    if (existingUser !== null && existingUser.verified !== false) {
      res.status(400).json({ message: "User already exists" });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    if (existingUser !== null) {
      // The SMS never arrived (bad format, wrong number...), so let the person
      // retry instead of needing an admin to delete the stuck account. Replace
      // rather than update in place: a session still holding the old _id must not
      // be able to finish verifying onto credentials someone else just set.
      const { deletedCount } = await users.deleteOne({
        _id: existingUser._id,
        verified: false,
      });

      // Verified or replaced by a concurrent request since we read it
      if (deletedCount === 0) {
        res.status(400).json({ message: "User already exists" });
        return;
      }
    }

    const createdAt = new Date();
    const newUser = await users.insertOne({
      first_name,
      last_name,
      phone_number,
      password: hashedPassword,
      createdAt,
      shame: [],
      // Never taken from the request: with replacement above, trusting it would
      // let anyone turn someone else's unfinished signup into a verified account.
      verified: false,
    });

    refreshAndSetJwtTokens({ _id: newUser.insertedId }, res);
    res.status(200).json({
      message: "User created successfully!",
    });
  } catch (error) {
    res.status(400).json({
      message:
        error instanceof Error
          ? error.message
          : "An error occurred while registering, please try again later.",
    });
  }
}
