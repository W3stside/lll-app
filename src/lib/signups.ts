// Server-only. The admin page's signups controls, shared with the weekly
// schedule in /api/cron so a button click and a cron run always do the same.

import type { ObjectId, WithId } from "mongodb";

import { clearAllNotifications } from "./inbox";
import client from "./mongodb";

import { Collection, type IAdmin, type IGame } from "@/types";
import { notifySignupsOpen } from "@/utils/notifications";

function _admin() {
  return client.db("LLL").collection<IAdmin>(Collection.ADMIN);
}

function _games() {
  return client.db("LLL").collection<IGame>(Collection.GAMES);
}

/** The single settings document behind the admin page. */
export async function getAdmin(): Promise<WithId<IAdmin> | undefined> {
  // .at() types the result as possibly undefined, unlike destructuring
  return (await _admin().find().limit(1).toArray()).at(0);
}

/**
 * The admin page's Enable/Disable toggle. Resolves the document as it was
 * before, or null when it doesn't exist. Only a real closed -> open
 * transition broadcasts, so a repeat click or cron run can't spam everyone.
 */
export async function setSignupsOpen(
  adminId: ObjectId,
  signupOpen: boolean,
): Promise<WithId<IAdmin> | null> {
  const previous = await _admin().findOneAndUpdate(
    { _id: adminId },
    { $set: { signup_open: signupOpen } },
    { returnDocument: "before" },
  );

  if (previous !== null && signupOpen && !previous.signup_open) {
    await notifySignupsOpen();
  }

  return previous;
}

/**
 * The admin page's "Clear all": empties every list except the organisers, and
 * everyone's inbox with it. Resolves the updated games, or null when there are
 * no games to clear.
 */
export async function clearAllSignups(): Promise<WithId<IGame>[] | null> {
  const collection = _games();

  const games = await collection.find().toArray();
  // bulkWrite rejects an empty batch
  if (games.length === 0) return null;

  const result = await collection.updateMany(
    { _id: { $in: games.map(({ _id }) => _id) } },
    [
      {
        $set: {
          players: [],
          teams: {
            $cond: {
              if: { $isArray: "$teams" },
              then: {
                $map: {
                  input: "$teams",
                  as: "team",
                  in: {
                    name: "$$team.name",
                    players: [],
                  },
                },
              },
              else: "$$REMOVE",
            },
          },
        },
      },
    ],
  );

  const gamesBulkUpdates = games.map(({ _id, organisers = [] }) => ({
    updateOne: {
      filter: { _id },
      update: {
        $addToSet: {
          players: {
            $each: organisers.map((org) => org.toString()),
          },
        },
      },
    },
  }));

  const bulkResults = await collection.bulkWrite(gamesBulkUpdates);

  if (bulkResults.matchedCount === 0) return null;
  if (!result.acknowledged) {
    throw new Error("Clearing the signup lists was not acknowledged");
  }

  // Lets the Monday job spot lists an admin already reset by hand
  await _admin().updateOne({}, { $set: { signups_reset_at: new Date() } });
  // Every list starts over, so last week's inbox no longer applies
  await clearAllNotifications();

  return await collection.find().toArray();
}

/**
 * Closes signups unless the schedule already did this week. Resolves the
 * document as it was before, or null when the week was already handled, so an
 * admin re-opening signups afterwards is left alone.
 */
export async function closeSignupsForWeek(
  adminId: ObjectId,
  week: string,
): Promise<WithId<IAdmin> | null> {
  return await _admin().findOneAndUpdate(
    { _id: adminId, signups_closed_week: { $ne: week } },
    { $set: { signup_open: false, signups_closed_week: week } },
    { returnDocument: "before" },
  );
}

/**
 * Claims the week's Monday reset before anything is cleared, so two runs can
 * never both wipe the lists. Resolves the document as it was before, or null
 * when the week was already claimed.
 */
export async function claimSignupsReset(
  adminId: ObjectId,
  week: string,
): Promise<WithId<IAdmin> | null> {
  return await _admin().findOneAndUpdate(
    { _id: adminId, signups_reset_week: { $ne: week } },
    { $set: { signups_reset_week: week } },
    { returnDocument: "before" },
  );
}

/** Hands a failed run's claim back, so the next scheduled run can retry. */
export async function releaseSignupsReset(
  adminId: ObjectId,
  week: string,
): Promise<void> {
  await _admin().updateOne(
    { _id: adminId, signups_reset_week: week },
    { $unset: { signups_reset_week: "" } },
  );
}
