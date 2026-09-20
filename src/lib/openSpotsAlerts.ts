/* eslint-disable no-console */
// Server-only. One row per game per occurrence, claimed before the push goes
// out, so a retried or double-scheduled cron run cannot alert twice. Rows are
// swept by the TTL index a week later.

import { MongoServerError, type ObjectId } from "mongodb";

import client from "./mongodb";

import { Collection } from "@/types";

interface IOpenSpotsAlertDocument {
  _id?: ObjectId;
  game_id: string;
  // "YYYY-MM-DD" of the game, see getOpenSpotsAlertOccurrence
  occurrence: string;
  createdAt: Date;
  expiresAt: Date;
}

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const DUPLICATE_KEY_ERROR_CODE = 11000;

let _indexesReady: Promise<void> | undefined;

function _collection() {
  return client
    .db("LLL")
    .collection<IOpenSpotsAlertDocument>(Collection.OPEN_SPOTS_ALERTS);
}

// Same lazy pattern as lib/inbox: no migrations in this repo, and createIndex
// is a no-op once the index exists
async function _ensureIndexes(): Promise<void> {
  if (_indexesReady === undefined) {
    _indexesReady = Promise.all([
      _collection().createIndex(
        { game_id: 1, occurrence: 1 },
        { unique: true },
      ),
      _collection().createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    ])
      .then(() => undefined)
      .catch((error: unknown) => {
        _indexesReady = undefined;
        throw error;
      });
  }

  await _indexesReady;
}

/**
 * Marks the alert for this game occurrence as sent. Resolves false when it was
 * already claimed. Throws on DB errors: without the marker the caller must not
 * send, or a retry could spam everyone.
 */
export async function claimOpenSpotsAlert(
  gameId: string,
  occurrence: string,
): Promise<boolean> {
  // Awaited, unlike the inbox: the unique index is what makes this a claim
  await _ensureIndexes();

  const now = new Date();
  try {
    await _collection().insertOne({
      game_id: gameId,
      occurrence,
      createdAt: now,
      expiresAt: new Date(now.getTime() + ONE_WEEK_MS),
    });
    return true;
  } catch (error) {
    if (
      error instanceof MongoServerError &&
      error.code === DUPLICATE_KEY_ERROR_CODE
    ) {
      console.log(
        `[open-spots] Alert for game ${gameId} on ${occurrence} already sent`,
      );
      return false;
    }
    throw error;
  }
}
