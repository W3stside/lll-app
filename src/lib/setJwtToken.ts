import jwt from "jsonwebtoken";
import type { NextApiRequest, NextApiResponse } from "next";

import type { INewSignup } from "@/types/users";

const { JWT_SECRET } = process.env;

if (JWT_SECRET === undefined) {
  throw new Error("JWT_SECRET is not defined");
}

export function setJwtToken(
  _: NextApiRequest,
  res: NextApiResponse,
  user: Partial<INewSignup>,
  successMessage: string,
  signOptions: jwt.SignOptions = { expiresIn: "15m" },
  headerOptions: {
    maxAge: number;
  } = { maxAge: 86400 },
) {
  const token = jwt.sign(user, JWT_SECRET as string, signOptions);

  const isProd = process.env.NODE_ENV === "production";
  res.setHeader(
    "Set-Cookie",
    `token=${token}; HttpOnly; Path=/; Max-Age=${headerOptions.maxAge}; SameSite=Lax;${isProd ? " Secure;" : ""}`,
  );

  res.status(200).json({ message: successMessage });
  return res.end();
}
