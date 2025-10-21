import bcrypt from "bcryptjs";
import type { NextApiRequest, NextApiResponse } from "next";

import { refreshAndSetJwtTokens } from "@/lib/authUtils";
import client from "@/lib/mongodb";
import { verifyAuthBody } from "@/lib/verifyAuthBody";
import { Collection } from "@/types";
import type { INewSignup } from "@/types/users";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  verifyAuthBody(req, res, "login");

  const { phone_number, password } = req.body as INewSignup;

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
      refreshAndSetJwtTokens({ _id: user._id }, res);
      const { password: _, ...simpleUser } = user;
      res.status(200).json({
        message: "Login successful",
        user: simpleUser,
      });
    }
  }
}
