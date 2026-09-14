/* eslint-disable no-console */
import type { NextApiRequest, NextApiResponse } from "next";

import { getUserIdFromApiRequest } from "@/lib/authUtils";
import client from "@/lib/mongodb";
import {
  Collection,
  type IPushSubscriptionDocument,
  type IPushSubscriptionJSON,
} from "@/types";

function _isString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

// Browsers only hand out endpoints on their vendor's push service. Anything else
// is forged, and accepting it would make every broadcast POST from our server to
// an attacker-chosen URL (internal hosts included).
const PUSH_SERVICE_HOST_SUFFIXES = [
  // Chrome, Edge, Brave, Opera, Samsung Internet
  "fcm.googleapis.com",
  "android.googleapis.com",
  // Firefox
  "push.services.mozilla.com",
  // Safari (macOS, iOS home screen apps)
  "push.apple.com",
  // Legacy Edge / Windows
  "notify.windows.com",
];

function _isPushServiceHost(hostname: string): boolean {
  return PUSH_SERVICE_HOST_SUFFIXES.some(
    (suffix) => hostname === suffix || hostname.endsWith(`.${suffix}`),
  );
}

function _isValidEndpoint(value: unknown): value is string {
  if (!_isString(value)) return false;
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      url.port === "" &&
      _isPushServiceHost(url.hostname)
    );
  } catch (err) {
    return false;
  }
}

function _isValidSubscription(body: unknown): body is IPushSubscriptionJSON {
  if (typeof body !== "object" || body === null) return false;

  // Untrusted JSON: any field may be missing, null, or the wrong type
  const { endpoint, keys } = body as {
    endpoint?: unknown;
    keys?: { p256dh?: unknown; auth?: unknown } | null;
  };

  return (
    _isValidEndpoint(endpoint) &&
    keys !== undefined &&
    keys !== null &&
    _isString(keys.p256dh) &&
    _isString(keys.auth)
  );
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const collection = client
    .db("LLL")
    .collection<IPushSubscriptionDocument>(Collection.PUSH_SUBSCRIPTIONS);

  try {
    if (req.method === "POST") {
      const userId = getUserIdFromApiRequest(req.cookies);
      if (userId === null) {
        res.status(401).json({ message: "Not logged in" });
        return;
      }

      const body: unknown = req.body;
      if (!_isValidSubscription(body)) {
        res.status(400).json({ message: "Invalid push subscription" });
        return;
      }

      const now = new Date();
      // Upsert on endpoint: one device = one row. If someone else logs in on
      // the same browser and enables notifications, the device moves to them.
      await collection.updateOne(
        { endpoint: body.endpoint },
        {
          $set: {
            user_id: userId,
            keys: body.keys,
            user_agent: req.headers["user-agent"] ?? null,
            updatedAt: now,
          },
          // endpoint comes from the filter on insert
          $setOnInsert: { createdAt: now },
        },
        { upsert: true },
      );

      res.status(201).json({ message: "Subscribed" });
      return;
    }

    if (req.method === "DELETE") {
      const { endpoint } = (req.body ?? {}) as { endpoint?: unknown };
      if (!_isValidEndpoint(endpoint)) {
        res.status(400).json({ message: "Invalid endpoint" });
        return;
      }

      // Deliberately not auth-gated: this runs during logout, when tokens may
      // already be expired. The endpoint is an unguessable per-device URL, so
      // only the device that owns it can remove it.
      await collection.deleteOne({ endpoint });

      res.status(200).json({ message: "Unsubscribed" });
      return;
    }

    res.status(405).json({ message: "Method not allowed" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error updating push subscription" });
  }
}
