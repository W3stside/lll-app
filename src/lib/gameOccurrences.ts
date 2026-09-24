// Server-only store for game history: one row per game per week. Games are
// weekly templates whose lists are wiped when signups reset, so admins' marks
// (attendance, payments) are saved here during the week, and the reset saves
// each game's final lists before wiping them.

import type { AnyBulkWriteOperation, WithId } from "mongodb";

import client from "./mongodb";

import { GAME_TIME_ZONE } from "@/constants/date";
import {
  type AttendanceStatus,
  Collection,
  type IGame,
  type IGameOccurrenceDocument,
  type PaymentStatus,
} from "@/types";
import {
  getKickoffInWeekOf,
  getNextKickoffAfter,
  getOccurrenceKey,
  toTimeZoneWallClock,
} from "@/utils/date";
import { getConfirmedPlayerIds, getWaitlistPlayerIds } from "@/utils/games";

const HALF_A_DAY_MS = 12 * 60 * 60 * 1000;

export interface IOccurrenceKey {
  game_id: string;
  occurrence: string;
}

let _indexesReady: Promise<void> | undefined;

function _collection() {
  return client
    .db("LLL")
    .collection<IGameOccurrenceDocument>(Collection.GAME_OCCURRENCES);
}

// Same lazy pattern as lib/inbox: no migrations in this repo, and createIndex
// is a no-op once the index exists
async function _ensureIndexes(): Promise<void> {
  if (_indexesReady === undefined) {
    _indexesReady = Promise.all([
      // One row per game per week. Also what lets concurrent upserts of the
      // same row be retried by the server instead of duplicating it.
      _collection().createIndex(
        { game_id: 1, occurrence: 1 },
        { unique: true },
      ),
      _collection().createIndex({ occurrence: -1 }),
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

// Copied onto the row so history outlives edits to, or deletion of, the game.
// Optional fields are left out rather than stored as null.
function _describeGame(
  game: IGame,
): Pick<
  IGameOccurrenceDocument,
  "cancelled" | "day" | "game_number" | "location" | "name" | "time" | "type"
> {
  return {
    day: game.day,
    time: game.time,
    location: game.location,
    cancelled: game.cancelled === true,
    // Games created from the admin form have no number
    ...((game.game_id as number | undefined) !== undefined
      ? { game_number: game.game_id }
      : {}),
    ...(game.name !== undefined && game.name !== "" ? { name: game.name } : {}),
    ...(game.type !== undefined ? { type: game.type } : {}),
  };
}

/**
 * Saves the lists of every game played since signups were last reset, before
 * the reset wipes them. Games not played yet are skipped: their lists never
 * happened. Throws on DB errors, and the caller must then not reset.
 */
export async function archiveGameLists(
  games: WithId<IGame>[],
  lastResetAt: Date | undefined,
  now: Date,
): Promise<number> {
  await _ensureIndexes();

  const wallNow = toTimeZoneWallClock(now, GAME_TIME_ZONE);
  const wallLastReset =
    lastResetAt !== undefined
      ? toTimeZoneWallClock(lastResetAt, GAME_TIME_ZONE)
      : undefined;
  // Only for the first reset, before any was recorded: lists are reset after
  // the week's last game on Sunday night, sometimes a bit past midnight, so
  // each one is for its game's date in the week of half a day ago
  const assumedWeek = new Date(wallNow.getTime() - HALF_A_DAY_MS);

  const operations = games.flatMap<
    AnyBulkWriteOperation<IGameOccurrenceDocument>
  >((game) => {
    // Admin-only games, and lists nobody signed up to
    if (game.hidden === true || game.players.length === 0) return [];

    // A list is for the first kickoff after the reset that emptied it
    const kickoff =
      wallLastReset !== undefined
        ? getNextKickoffAfter(game.day, game.time, wallLastReset)
        : getKickoffInWeekOf(game.day, game.time, assumedWeek);

    // Reset before the game was played: its list never happened
    if (kickoff > wallNow) return [];

    return [
      {
        updateOne: {
          filter: {
            game_id: game._id.toString(),
            occurrence: getOccurrenceKey(kickoff),
          },
          update: {
            $set: {
              ..._describeGame(game),
              confirmed: getConfirmedPlayerIds(game),
              waitlist: getWaitlistPlayerIds(game),
              archivedAt: now,
              updatedAt: now,
            },
            $setOnInsert: { createdAt: now },
          },
          upsert: true,
        },
      },
    ];
  });

  if (operations.length > 0) {
    await _collection().bulkWrite(operations, { ordered: false });
  }

  return operations.length;
}

/**
 * Sets (or clears, with null) one kind of mark for some players. Setting one
 * creates the row from `game` when there isn't one yet. Without a game (it was
 * deleted), or when clearing, only an existing row is updated, and null comes
 * back if there is none.
 */
async function _mark(
  key: IOccurrenceKey,
  game: IGame | null,
  field: "attendance" | "payments",
  userIds: string[],
  status: AttendanceStatus | PaymentStatus | null,
): Promise<WithId<IGameOccurrenceDocument> | null> {
  await _ensureIndexes();

  const now = new Date();
  const paths = userIds.map((id) => `${field}.${id}`);
  const createRow = game !== null && status !== null;

  return await _collection().findOneAndUpdate(
    key,
    {
      $set: {
        ...(status !== null
          ? Object.fromEntries(paths.map((path) => [path, status]))
          : {}),
        updatedAt: now,
      },
      ...(status === null
        ? { $unset: Object.fromEntries(paths.map((path) => [path, ""])) }
        : {}),
      ...(createRow
        ? {
            $setOnInsert: {
              ..._describeGame(game),
              // Filled in by the reset: the live lists may already be for a
              // later week than the one being marked
              confirmed: [],
              waitlist: [],
              archivedAt: null,
              createdAt: now,
            },
          }
        : {}),
    },
    { upsert: createRow, returnDocument: "after" },
  );
}

export async function markAttendance(
  game: WithId<IGame>,
  occurrence: string,
  userIds: string[],
  status: AttendanceStatus | null,
): Promise<WithId<IGameOccurrenceDocument> | null> {
  return await _mark(
    { game_id: game._id.toString(), occurrence },
    game,
    "attendance",
    userIds,
    status,
  );
}

export async function markPayment(
  key: IOccurrenceKey,
  game: IGame | null,
  userId: string,
  status: PaymentStatus,
): Promise<WithId<IGameOccurrenceDocument> | null> {
  return await _mark(key, game, "payments", [userId], status);
}

/** The rows for these game weeks, e.g. every game's current week. */
export async function getOccurrences(
  keys: IOccurrenceKey[],
): Promise<WithId<IGameOccurrenceDocument>[]> {
  if (keys.length === 0) return [];

  return await _collection()
    .find({
      $or: keys.map(({ game_id, occurrence }) => ({ game_id, occurrence })),
    })
    .toArray();
}

/** Latest weeks first. */
export async function getRecentOccurrences(
  limit: number,
): Promise<WithId<IGameOccurrenceDocument>[]> {
  return await _collection()
    .find()
    .sort({ occurrence: -1, time: -1 })
    .limit(limit)
    .toArray();
}

/** Everything, oldest first. */
export async function getAllOccurrences(): Promise<
  WithId<IGameOccurrenceDocument>[]
> {
  return await _collection().find().sort({ occurrence: 1, time: 1 }).toArray();
}
