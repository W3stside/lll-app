import type { NextApiRequest, NextApiResponse } from "next";

import { isValidNewSignup } from "../utils/signup";

import type { INewSignup } from "@/types/users";

// eslint-disable-next-line consistent-return
export function verifyAuthBody(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).end();
  }

  if (!isValidNewSignup(req.body as INewSignup)) {
    res.status(400).json({ message: "Missing fields" });
    return res.end();
  }
}
