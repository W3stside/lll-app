/* eslint-disable no-console */
// Server-only. The admin page's signups controls, plus the weekly schedule
// that runs them on its own: signups close when the week's last game kicks
// off, and every list is cleared and re-opened on Monday morning.

import type { ObjectId, WithId } from "mongodb";

import { clearAllNotifications } from "./inbox";
import client from "./mongodb";

import { GAME_TIME_ZONE } from "@/constants/date";
import { Collection, type IAdmin, type IGame } from "@/types";
import { getUSDayIndex, nowInTimeZone, toTimeZone } from "@/utils/date";
import { notifySignupsOpen } from "@/utils/notifications";
import {
  getLastKickOff,
  getPreviousWeekStart,
  getSignupsResetTime,
  getSignupsWeekStart,
  getWeekKey,
  getWeekStart,
} from "@/utils/signupsSchedule";

export type SignupsResetResult = { week: string; localTime: string } & (
  | { reset: true; cleared: boolean; wasOpen: boolean }
  | { skipped: "already-open" | "already-reset" | "outside-reset-window" }
);

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

  // Lets the Monday reset spot lists an admin already reset by hand
  await _admin().updateOne({}, { $set: { signups_reset_at: new Date() } });
  // Every list starts over, so last week's inbox no longer applies
  await clearAllNotifications();

  return await collection.find().toArray();
}

/**
 * Closes signups once the week's last game has kicked off. Page loads run it,
 * so it lands right at kick-off without a cron guessing the time. The week is
 * claimed, so an admin re-opening signups afterwards is left alone.
 * Never throws: resolves the admin document the page should render.
 */
export async function closeSignupsIfDue(
  admin: WithId<IAdmin>,
  games: IGame[],
): Promise<WithId<IAdmin>> {
  // Destructured from a find(), so it is missing when there is no document
  if ((admin as WithId<IAdmin> | undefined) === undefined) return admin;

  try {
    const now = nowInTimeZone(GAME_TIME_ZONE);
    const weekStart = getSignupsWeekStart(now);
    const week = getWeekKey(weekStart);

    if (admin.signups_closed_week === week) return admin;

    const lastKickOff = getLastKickOff(games, weekStart);
    if (lastKickOff === undefined || now < lastKickOff) return admin;

    const previous = await _admin().findOneAndUpdate(
      { _id: admin._id, signups_closed_week: { $ne: week } },
      { $set: { signup_open: false, signups_closed_week: week } },
      { returnDocument: "before" },
    );

    if (previous !== null) {
      console.log(`[signups] Week ${week}: closed at the last kick-off`);
    }

    // Closed either way: a parallel page load may have claimed the week first
    return { ...admin, signup_open: false, signups_closed_week: week };
  } catch (error) {
    // The page still renders, and the next load tries again
    console.error("[signups] Closing signups failed:", error);
    return admin;
  }
}

/**
 * Monday's reset, from 07:00 Lisbon time: clears last week's lists and
 * re-opens signups, like the admin page's "Clear all" then "Enable". The week
 * is claimed first, so a repeat or parallel run can never wipe new signups.
 *
 * Lists an admin already reset after last week's final kick-off are kept, as
 * they may have been set up by hand since, and so are lists an admin already
 * re-opened that may hold this week's signups.
 */
export async function resetSignupsIfDue(): Promise<SignupsResetResult> {
  const now = nowInTimeZone(GAME_TIME_ZONE);
  const localTime = now.toISOString();
  const weekStart = getWeekStart(now);
  const week = getWeekKey(weekStart);

  // Monday from 07:00 only: a stray call later in the week must never wipe
  // the lists players are signing up to
  if (getUSDayIndex(now) !== 0 || now < getSignupsResetTime(weekStart)) {
    return { skipped: "outside-reset-window", week, localTime };
  }

  const admin = await getAdmin();
  if (admin === undefined) throw new Error("Admin document not found");

  const previous = await _admin().findOneAndUpdate(
    { _id: admin._id, signups_reset_week: { $ne: week } },
    { $set: { signups_reset_week: week } },
    { returnDocument: "before" },
  );
  if (previous === null) return { skipped: "already-reset", week, localTime };

  try {
    const games = await _games().find().toArray();

    // Falls back to midnight when nothing was played last week
    const lastWeekEnd =
      getLastKickOff(games, getPreviousWeekStart(weekStart)) ?? weekStart;
    const lastReset =
      previous.signups_reset_at !== undefined
        ? toTimeZone(previous.signups_reset_at, GAME_TIME_ZONE)
        : undefined;

    // Lists nobody cleared since last week's final kick-off still hold last
    // week's players. With no reset on record, open lists might already hold
    // this week's, so only closed ones are cleared
    const clearLists =
      lastReset !== undefined ? lastReset < lastWeekEnd : !previous.signup_open;

    if (previous.signup_open && !clearLists) {
      return { skipped: "already-open", week, localTime };
    }

    if (clearLists) await clearAllSignups();

    const beforeOpening = await setSignupsOpen(admin._id, true);
    // setSignupsOpen only broadcasts when it re-opens: lists that were open
    // all along were just emptied, so everyone still needs telling
    if (clearLists && beforeOpening?.signup_open === true) {
      await notifySignupsOpen();
    }

    console.log(
      `[signups] Week ${week}: ${clearLists ? "lists cleared, " : ""}signups open`,
    );

    return {
      reset: true,
      cleared: clearLists,
      wasOpen: previous.signup_open,
      week,
      localTime,
    };
  } catch (error) {
    // Hand the claim back so the next run can retry. It won't clear twice:
    // clearAllSignups records the reset once the lists are empty
    await _admin()
      .updateOne(
        { _id: admin._id, signups_reset_week: week },
        { $unset: { signups_reset_week: "" } },
      )
      .catch((releaseError: unknown) => {
        console.error("[signups] Failed to release the claim:", releaseError);
      });
    throw error;
  }
}
