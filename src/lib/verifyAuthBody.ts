import type { NextApiRequest, NextApiResponse } from "next";

import {
  isValidLogin,
  isValidNewSignup,
  isValidUserUpdate,
} from "../utils/signup";

import type { INewSignup } from "@/types/users";

// eslint-disable-next-line consistent-return
export function verifyAuthBody(
  req: NextApiRequest,
  res: NextApiResponse,
  action: "login" | "register" | "update",
) {
  if (req.method !== "POST") {
    return res.status(405).end();
  }

  const body = req.body as INewSignup;

  if (
    (action === "register" && !isValidNewSignup(body, body.password)) ||
    (action === "login" && !isValidLogin(body, body.password)) ||
    (action === "update" && !isValidUserUpdate(body))
  ) {
    res.status(400).json({ message: "Auth verification: Missing fields" });
    return res.end();
  }
}
