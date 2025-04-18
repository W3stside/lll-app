import bcrypt from "bcryptjs";
import type { NextApiRequest, NextApiResponse } from "next";

import client from "@/lib/mongodb";
import { setJwtToken } from "@/lib/setJwtToken";
import { verifyAuthBody } from "@/lib/verifyAuthBody";
import { Collection } from "@/types";
import type { INewSignup } from "@/types/users";

const { JWT_SECRET } = process.env;

if (JWT_SECRET === undefined) {
  throw new Error("JWT_SECRET is not defined");
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  verifyAuthBody(req, res);

  const { phone_number, password, _id } = req.body as INewSignup;

  const db = client.db("LLL");
  const users = db.collection(Collection.USERS);

  const user = await users.findOne<INewSignup>({ phone_number });

  if (!user) {
    res.status(401).json({ message: "Invalid credentials" });
  } else {
    const isValid = await bcrypt.compare(password, user.password);

    if (!isValid) {
      res.status(401).json({ message: "Invalid credentials" });
    } else {
      setJwtToken(
        req,
        res,
        {
          first_name: user.first_name,
          last_name: user.last_name,
          phone_number: user.phone_number,
          _id: user._id,
        },
        "User created successfully!",
        { expiresIn: "4Weeks" },
      );
    }
  }
}
