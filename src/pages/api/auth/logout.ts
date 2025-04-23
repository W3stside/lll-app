import type { NextApiRequest, NextApiResponse } from "next";

import { clearJwtTokens } from "@/lib/authUtils";

export default function handler(_: NextApiRequest, res: NextApiResponse) {
  clearJwtTokens(res);
  res.status(200).json({ message: "Logged out" });
}
