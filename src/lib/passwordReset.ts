/* eslint-disable no-console */
// Server-only. "Forgot your password?" is open to anyone who knows a number,
// and every code texted costs money and lands on someone's phone, so texts are
// limited per account. Rows live in their own collection: user documents are
// sent to every page.

import { MongoServerError, type ObjectId } from "mongodb";

import client from "./mongodb";

import { BANNED_USERS_SET } from "@/constants/blacklist";
import { RESET_CODE_COOLDOWN_SECONDS } from "@/constants/signups";
import { Collection, type IUser } from "@/types";

interface IPasswordResetDocument {
  _id?: ObjectId;
  user_id: string;
  // Start of the current day-long window, and texts sent in it
  windowStart: Date;
  count: number;
  lastSentAt: Date;
  // TTL index deletes the row when its window ends
  expiresAt: Date;
}

const RESET_CODE_COOLDOWN_MS = RESET_CODE_COOLDOWN_SECONDS * 1000;
const RESET_CODES_PER_DAY = 5;
// Across all accounts: far above a normal day's resets, and it bounds what
// someone texting every member's number could cost
const RESET_CODES_PER_DAY_TOTAL = 50;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const DUPLICATE_KEY_ERROR_CODE = 11000;

let _indexesReady: Promise<void> | undefined;

function _collection() {
  return client
    .db("LLL")
    .collection<IPasswordResetDocument>(Collection.PASSWORD_RESETS);
}

// Same lazy pattern as lib/inbox: no migrations in this repo, and createIndex
// is a no-op once the index exists
async function _ensureIndexes(): Promise<void> {
  if (_indexesReady === undefined) {
    _indexesReady = Promise.all([
      _collection().createIndex({ user_id: 1 }, { unique: true }),
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
 * The account a reset code may be texted to. `verified: false` only marks a
 * signup whose code never arrived, and its owner can simply register again;
 * accounts from before verification existed have no flag and are included.
 */
export async function findResettableUser(
  phoneNumber: string,
): Promise<Pick<IUser, "_id" | "phone_number"> | null> {
  if (BANNED_USERS_SET.has(phoneNumber)) return null;

  return await client
    .db("LLL")
    .collection<IUser>(Collection.USERS)
    .findOne(
      { phone_number: phoneNumber, verified: { $ne: false } },
      { projection: { _id: 1, phone_number: 1 } },
    );
}

function _isDuplicateKeyError(error: unknown): boolean {
  return (
    error instanceof MongoServerError && error.code === DUPLICATE_KEY_ERROR_CODE
  );
}

// At most one a minute and five a day for one account. Each step is a single
// atomic write, so concurrent requests can't both take the last text.
async function _claimAccountText(userId: string, now: Date): Promise<boolean> {
  const cooledDown = new Date(now.getTime() - RESET_CODE_COOLDOWN_MS);
  const windowOver = new Date(now.getTime() - ONE_DAY_MS);
  const newWindow = {
    windowStart: now,
    count: 1,
    lastSentAt: now,
    expiresAt: new Date(now.getTime() + ONE_DAY_MS),
  };

  // Another text in today's window
  const counted = await _collection().updateOne(
    {
      user_id: userId,
      lastSentAt: { $lte: cooledDown },
      windowStart: { $gt: windowOver },
      count: { $lt: RESET_CODES_PER_DAY },
    },
    { $inc: { count: 1 }, $set: { lastSentAt: now } },
  );
  if (counted.modifiedCount === 1) return true;

  // The window is over but the TTL sweep hasn't removed the row yet
  const renewed = await _collection().updateOne(
    {
      user_id: userId,
      lastSentAt: { $lte: cooledDown },
      windowStart: { $lte: windowOver },
    },
    { $set: newWindow },
  );
  if (renewed.modifiedCount === 1) return true;

  // No row: first text. A row that exists but matched neither update is at
  // its limit, and the unique index refuses the insert.
  try {
    await _collection().insertOne({ user_id: userId, ...newWindow });
    return true;
  } catch (error) {
    if (_isDuplicateKeyError(error)) return false;
    throw error;
  }
}

// One row per UTC day counts every text sent. When it's at the cap the filter
// misses, and the upsert's insert hits the unique index instead.
async function _claimDailyText(now: Date): Promise<boolean> {
  try {
    await _collection().updateOne(
      {
        user_id: `all:${now.toISOString().slice(0, 10)}`,
        count: { $lt: RESET_CODES_PER_DAY_TOTAL },
      },
      {
        $inc: { count: 1 },
        $set: { lastSentAt: now },
        $setOnInsert: {
          windowStart: now,
          expiresAt: new Date(now.getTime() + 2 * ONE_DAY_MS),
        },
      },
      { upsert: true },
    );
    return true;
  } catch (error) {
    if (_isDuplicateKeyError(error)) {
      console.warn(
        `[reset-password] Daily cap of ${RESET_CODES_PER_DAY_TOTAL} texts reached`,
      );
      return false;
    }
    throw error;
  }
}

/**
 * Takes one reset text for this account, within its limits and the daily
 * total. Resolves false when either is used up, and nothing may be sent.
 */
export async function claimPasswordResetText(userId: string): Promise<boolean> {
  // Awaited: the unique index is what refuses concurrent claims
  await _ensureIndexes();

  const now = new Date();
  return (await _claimAccountText(userId, now)) && (await _claimDailyText(now));
}
