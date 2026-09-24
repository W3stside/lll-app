// Server-only store for game history: one row per game per week. Games are
// weekly templates whose lists are wiped when signups reset, so admins' marks
// (attendance, payments) are saved here during the week, and clearing the
// lists saves each game's final lists first (see clearAllSignups).

import type { WithId } from "mongodb";

import client from "./mongodb";

import { DAYS_IN_WEEK, GAME_TIME_ZONE } from "@/constants/date";
import {
  type AttendanceStatus,
  Collection,
  type IGame,
  type IGameOccurrenceDocument,
  type PaymentStatus,
} from "@/types";
import { formatDateKey, toTimeZoneWallClock } from "@/utils/date";
import { getListKickoff } from "@/utils/gameHistory";
import { getConfirmedPlayerIds, getWaitlistPlayerIds } from "@/utils/games";

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

/** Saving the lists to the game history failed, so none were cleared. */
export class GameHistoryArchiveError extends Error {
  constructor(options?: ErrorOptions) {
    super(
      "Couldn't save the lists to the game history, so nothing was cleared. Try again.",
      options,
    );
    this.name = "GameHistoryArchiveError";
  }
}

/**
 * Saves the lists of every game already played before they're cleared.
 * `listsWeek` is the week they were last cleared for (see getListKickoff).
 * Games not played yet are skipped: their lists never happened. The first save
 * of a game's week wins, so lists rebuilt after an early clear that week (only
 * the organisers) never replace the real ones. Resolves how many lists were
 * saved. Throws a GameHistoryArchiveError, and the caller must then not clear
 * anything.
 */
export async function archiveGameLists(
  games: WithId<IGame>[],
  listsWeek: string | undefined,
  now: Date,
): Promise<number> {
  const wallNow = toTimeZoneWallClock(now, GAME_TIME_ZONE);

  const played = games.flatMap((game) => {
    // Admin-only games, lists nobody signed up to, and malformed days, which
    // must not hold up the weekly reset
    if (
      game.hidden === true ||
      game.players.length === 0 ||
      !DAYS_IN_WEEK.includes(game.day)
    ) {
      return [];
    }

    const kickoff = getListKickoff(game, wallNow, listsWeek);
    // Malformed times, and games cleared before they were played
    if (Number.isNaN(kickoff.getTime()) || kickoff > wallNow) return [];

    const key: IOccurrenceKey = {
      game_id: game._id.toString(),
      occurrence: formatDateKey(kickoff),
    };
    return [{ game, key }];
  });

  if (played.length === 0) return 0;

  try {
    await _ensureIndexes();

    // Rows may exist already, holding the week's marks. Creating the missing
    // ones first lets the lists go in with a plain update that skips rows
    // already archived: an upsert filtered on that would hit the unique index.
    await _collection().bulkWrite(
      played.map(({ game, key }) => ({
        updateOne: {
          filter: key,
          update: {
            $setOnInsert: {
              ..._describeGame(game),
              confirmed: [],
              waitlist: [],
              archivedAt: null,
              createdAt: now,
              updatedAt: now,
            },
          },
          upsert: true,
        },
      })),
      { ordered: false },
    );

    const { matchedCount } = await _collection().bulkWrite(
      played.map(({ game, key }) => ({
        updateOne: {
          filter: { ...key, archivedAt: null },
          update: {
            $set: {
              ..._describeGame(game),
              confirmed: getConfirmedPlayerIds(game),
              waitlist: getWaitlistPlayerIds(game),
              archivedAt: now,
              updatedAt: now,
            },
          },
        },
      })),
      { ordered: false },
    );

    return matchedCount;
  } catch (error) {
    throw new GameHistoryArchiveError({ cause: error });
  }
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
