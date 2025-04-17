import type { NextApiRequest, NextApiResponse } from "next";

import clientPromise from "../../lib/mongodb";

const SIGNUPS_LIMIT = 20;

export default async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const client = clientPromise;
    const db = client.db("LLL");
    const signups = await db
      .collection("signups")
      .find({})
      .limit(SIGNUPS_LIMIT)
      .toArray();
    res.json(signups);
  } catch (e) {
    console.error(e);
  }
};
