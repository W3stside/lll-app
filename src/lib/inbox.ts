/* eslint-disable no-console */
// Server-only store for the in-app notifications inbox. Rows are deleted when
// their game ends (TTL index on `expiresAt`), when a game is deleted, and when
// signups are reset for the week.

import client from "./mongodb";

import {
  Collection,
  type GameNotificationType,
  type IGame,
  type IGameNotificationDocument,
  type IPushPayload,
} from "@/types";
import { computeGameDate } from "@/utils/date";

// Generous on purpose: computeGameDate returns Lisbon wall-clock time read as
// server time, which lands up to an hour late on a UTC server in summer. Late is
// harmless here (reset wipes everything anyway); early would hide live info.
const GAME_DURATION_MS = 2 * 60 * 60 * 1000;
const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const INBOX_LIMIT = 50;

let _indexesReady: Promise<void> | undefined;

function _collection() {
  return client
    .db("LLL")
    .collection<IGameNotificationDocument>(Collection.NOTIFICATIONS);
}

// Created lazily and idempotently: the repo has no migrations, and createIndex
// is a no-op when the index already exists
async function _ensureIndexes(): Promise<void> {
  if (_indexesReady === undefined) {
    _indexesReady = Promise.all([
      _collection().createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
      _collection().createIndex({ user_id: 1, createdAt: -1 }),
      _collection().createIndex({ game_id: 1 }),
    ])
      .then(() => undefined)
      .catch((error: unknown) => {
        // Retry on the next call instead of caching the failure
        _indexesReady = undefined;
        throw error;
      });
  }

  await _indexesReady;
}

/**
 * When this week's occurrence of the game ends. Games repeat weekly by day and
 * time, so if this week's has already finished the next one is a week later.
 */
function _computeExpiry(game: IGame, now: Date): Date {
  const thisWeekStart = computeGameDate(game.day, game.time, "WET");
  const end = thisWeekStart.getTime() + GAME_DURATION_MS;

  return new Date(end > now.getTime() ? end : end + ONE_WEEK_MS);
}

// MongoDB's TTL sweep runs about once a minute, so reads filter expired rows too
function _activeFilter(userId: string, now: Date) {
  return { user_id: userId, expiresAt: { $gt: now } };
}

/** Never throws: the inbox is a record, it must not fail the triggering request. */
export async function recordGameNotifications(
  userIds: string[],
  game: IGame,
  type: GameNotificationType,
  payload: IPushPayload,
): Promise<void> {
  if (userIds.length === 0) return;

  try {
    await _ensureIndexes();

    const now = new Date();
    const expiresAt = _computeExpiry(game, now);

    await _collection().insertMany(
      userIds.map((userId) => ({
        user_id: userId,
        game_id: game._id.toString(),
        type,
        title: payload.title,
        body: payload.body,
        url: payload.url,
        createdAt: now,
        readAt: null,
        expiresAt,
      })),
    );
  } catch (error) {
    console.error("[inbox] Failed to record notifications:", error);
  }
}

export async function getActiveNotifications(
  userId: string,
): Promise<IGameNotificationDocument[]> {
  return await _collection()
    .find(_activeFilter(userId, new Date()))
    .sort({ createdAt: -1 })
    .limit(INBOX_LIMIT)
    .toArray();
}

export async function countUnreadNotifications(
  userId: string,
): Promise<number> {
  return await _collection().countDocuments({
    ..._activeFilter(userId, new Date()),
    readAt: null,
  });
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  await _collection().updateMany(
    { user_id: userId, readAt: null },
    { $set: { readAt: new Date() } },
  );
}

/** Signups reset: every game's lists start over, so all notifications are stale. */
export async function clearAllNotifications(): Promise<void> {
  try {
    await _collection().deleteMany({});
  } catch (error) {
    console.error("[inbox] Failed to clear notifications:", error);
  }
}

export async function clearGameNotifications(gameId: string): Promise<void> {
  try {
    await _collection().deleteMany({ game_id: gameId });
  } catch (error) {
    console.error("[inbox] Failed to clear game notifications:", error);
  }
}
