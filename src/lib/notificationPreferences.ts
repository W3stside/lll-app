/* eslint-disable no-console */
// Server-only. Preferences only gate push delivery: the in-app inbox still
// records what happened to a player's game.

import { ObjectId } from "mongodb";

import client from "./mongodb";

import {
  Collection,
  type IUser,
  type NotificationPreferenceKey,
} from "@/types";

function _collection() {
  return client.db("LLL").collection<IUser>(Collection.USERS);
}

// Missing keys mean "on", so only an explicit false opts a user out
function _optedOutFilter(key: NotificationPreferenceKey) {
  return { [`notification_preferences.${key}`]: false };
}

/** Everyone who switched this category off. Throws on DB errors. */
export async function getOptedOutUserIds(
  key: NotificationPreferenceKey,
): Promise<string[]> {
  const users = await _collection()
    .find(_optedOutFilter(key), { projection: { _id: 1 } })
    .toArray();

  return users.map(({ _id }) => _id.toString());
}

/**
 * Drops the users who switched this category off. Never throws: on a DB error
 * everyone is kept, since a missed "you're in" costs more than an unwanted one.
 */
export async function filterUserIdsByPreference(
  userIds: string[],
  key: NotificationPreferenceKey,
): Promise<string[]> {
  if (userIds.length === 0) return userIds;

  try {
    const optedOut = await _collection()
      .find(
        {
          _id: { $in: userIds.map((id) => new ObjectId(id)) },
          ..._optedOutFilter(key),
        },
        { projection: { _id: 1 } },
      )
      .toArray();

    if (optedOut.length === 0) return userIds;

    const optedOutIds = new Set(optedOut.map(({ _id }) => _id.toString()));
    return userIds.filter((id) => !optedOutIds.has(id));
  } catch (error) {
    console.error("[preferences] Failed to read preferences:", error);
    return userIds;
  }
}
