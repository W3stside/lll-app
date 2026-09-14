import type { NextApiRequest, NextApiResponse } from "next";

import {
  isValidLogin,
  isValidNewSignup,
  isValidUserUpdate,
} from "../utils/signup";

import type { INewSignup } from "@/types/users";

/**
 * Sends the error response itself, so callers must stop handling the request
 * when this returns false. Sending a response doesn't end the handler, and a
 * register body that failed here used to still insert the user.
 */
export function verifyAuthBody(
  req: NextApiRequest,
  res: NextApiResponse,
  action: "login" | "register" | "update",
): boolean {
  if (req.method !== "POST") {
    res.status(405).end();
    return false;
  }

  const body = req.body as INewSignup;

  if (
    (action === "register" && !isValidNewSignup(body, body.password)) ||
    (action === "login" && !isValidLogin(body, body.password)) ||
    (action === "update" && !isValidUserUpdate(body))
  ) {
    res.status(400).json({ message: "Auth verification: Missing fields" });
    return false;
  }

  return true;
}
