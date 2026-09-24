/* eslint-disable no-console */
import { timingSafeEqual } from "crypto";
import type { NextApiRequest } from "next";

import { getApiRequester } from "@/lib/requireAdmin";

function _secretsMatch(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Guards the /api/cron routes. Vercel sends `Authorization: Bearer
 * $CRON_SECRET` when the env var is set; any other scheduler can do the same.
 * Admins may also hit a cron route from a logged-in browser to test it.
 */
export async function isCronAuthorised(req: NextApiRequest): Promise<boolean> {
  const secret = process.env.CRON_SECRET;
  const { authorization } = req.headers;

  if (secret === undefined || secret.trim() === "") {
    console.warn("[cron] CRON_SECRET is not set - scheduled runs are rejected");
  } else if (
    authorization !== undefined &&
    _secretsMatch(authorization, `Bearer ${secret}`)
  ) {
    return true;
  }

  const requester = await getApiRequester(req);
  return requester !== null && requester.isAdmin;
}
