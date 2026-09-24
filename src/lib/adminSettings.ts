// Server-only.

import type { WithId } from "mongodb";

import client from "./mongodb";

import { Collection, type IAdmin } from "@/types";

/** The single admin settings document (signups open, last reset). */
export async function getAdminSettings(): Promise<WithId<IAdmin> | undefined> {
  // .at() types the result as possibly undefined, unlike destructuring
  return (
    await client
      .db("LLL")
      .collection<IAdmin>(Collection.ADMIN)
      .find()
      .limit(1)
      .toArray()
  ).at(0);
}
