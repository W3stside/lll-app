import { ObjectId } from "mongodb";
import type { NextApiRequest, NextApiResponse } from "next";

import { getUserIdFromApiRequest } from "@/lib/authUtils";
import client from "@/lib/mongodb";
import { Collection, Role } from "@/types";
import type { IUser } from "@/types/users";

/**
 * Sends the 401/403 itself, so callers must stop when this returns false.
 * The role is read from the DB rather than the token: tokens only carry the _id
 * and refresh tokens live 30 days, so a demoted admin must lose access now.
 */
export async function requireAdmin(
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<boolean> {
  const userId = getUserIdFromApiRequest(req.cookies);

  if (userId === null) {
    res.status(401).json({ message: "Not logged in" });
    return false;
  }

  const user = await client
    .db("LLL")
    .collection<IUser>(Collection.USERS)
    .findOne({ _id: new ObjectId(userId) }, { projection: { role: 1 } });

  if (user?.role !== Role.ADMIN) {
    res.status(403).json({ message: "Admins only" });
    return false;
  }

  return true;
}
