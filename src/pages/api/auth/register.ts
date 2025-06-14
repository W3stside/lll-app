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
    verifyAuthBody(req, res, "register");

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
    if (existingUser) {
      res.status(400).json({ message: "User already exists" });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const createdAt = new Date();
    const newUser = await users.insertOne({
      first_name,
      last_name,
      phone_number,
      password: hashedPassword,
      createdAt,
      shame: [],
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
