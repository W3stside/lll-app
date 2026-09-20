/* eslint-disable no-console */
import { ObjectId } from "mongodb";
import type { NextApiRequest, NextApiResponse } from "next";

import { NOTIFICATION_PREFERENCE_KEYS } from "@/constants/notifications";
import { getUserIdFromApiRequest } from "@/lib/authUtils";
import client from "@/lib/mongodb";
import {
  Collection,
  type INotificationPreferences,
  type IUser,
  type NotificationPreferenceKey,
} from "@/types";
import { resolveNotificationPreferences } from "@/utils/notificationPreferences";

function _isPreferenceKey(value: string): value is NotificationPreferenceKey {
  return (NOTIFICATION_PREFERENCE_KEYS as string[]).includes(value);
}

// Untrusted JSON: only known keys with boolean values get through, and at
// least one is required so an empty body can't produce an empty $set
function _parseChanges(
  body: unknown,
): Partial<INotificationPreferences> | null {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return null;
  }

  const changes: Partial<INotificationPreferences> = {};
  for (const [key, value] of Object.entries(body)) {
    if (!_isPreferenceKey(key) || typeof value !== "boolean") return null;
    changes[key] = value;
  }

  return Object.keys(changes).length > 0 ? changes : null;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "PATCH") {
    res.status(405).json({ message: "Method not allowed" });
    return;
  }

  // Always the session user: nobody can silence someone else's alerts
  const userId = getUserIdFromApiRequest(req.cookies);
  if (userId === null) {
    res.status(401).json({ message: "Not logged in" });
    return;
  }

  const changes = _parseChanges(req.body);
  if (changes === null) {
    res.status(400).json({ message: "Invalid notification preferences" });
    return;
  }

  try {
    // Dotted paths so untouched keys keep their value
    const $set = Object.fromEntries(
      Object.entries(changes).map(([key, value]) => [
        `notification_preferences.${key}`,
        value,
      ]),
    );

    const user = await client
      .db("LLL")
      .collection<IUser>(Collection.USERS)
      .findOneAndUpdate(
        { _id: new ObjectId(userId) },
        { $set },
        {
          returnDocument: "after",
          projection: { notification_preferences: 1 },
        },
      );

    if (user === null) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    res.setHeader("Cache-Control", "private, no-store");
    res.status(200).json({
      preferences: resolveNotificationPreferences(
        user.notification_preferences,
      ),
    });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Error updating notification preferences" });
  }
}
