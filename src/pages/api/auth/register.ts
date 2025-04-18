import bcrypt from "bcryptjs";
import type { NextApiRequest, NextApiResponse } from "next";

import { SALT_ROUNDS } from "@/constants/api";
import client from "@/lib/mongodb";
import { setJwtToken } from "@/lib/setJwtToken";
import { verifyAuthBody } from "@/lib/verifyAuthBody";
import { Collection } from "@/types";
import type { INewSignup } from "@/types/users";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  verifyAuthBody(req, res);

  const { first_name, last_name, phone_number, password } =
    req.body as INewSignup;

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

  setJwtToken(
    req,
    res,
    {
      first_name,
      last_name,
      phone_number,
      password: hashedPassword,
      _id: newUser.insertedId,
      createdAt,
    },
    "User created successfully!",
    { expiresIn: "4Weeks" },
  );
}
