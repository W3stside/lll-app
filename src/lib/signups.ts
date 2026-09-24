/* eslint-disable no-console */
// Server-only. The admin page's signups controls, plus the weekly schedule
// that runs them on its own: signups close on Sunday night, and every list is
// cleared and re-opened on Monday morning.

import type { ObjectId, WithId } from "mongodb";

import { clearAllNotifications } from "./inbox";
import client from "./mongodb";

import { GAME_TIME_ZONE } from "@/constants/date";
import { Collection, type IAdmin, type IGame } from "@/types";
import { getUSDayIndex, nowInTimeZone } from "@/utils/date";
import { notifySignupsOpen } from "@/utils/notifications";
import {
  addWeeks,
  getLastKickOff,
  getSignupsResetTime,
  getSignupsWeekStart,
  getWeekKey,
  getWeekStart,
} from "@/utils/signupsSchedule";

export type SignupsCloseResult = { week: string; localTime: string } & (
  | {
      skipped:
        | "already-closed"
        | "before-last-game"
        | "lists-already-reset"
        | "no-games";
    }
  | { closed: true; wasOpen: boolean }
);

export type SignupsResetResult = { week: string; localTime: string } & (
  | {
      skipped:
        | "already-open"
        | "already-reset"
        | "no-games"
        | "outside-reset-window";
    }
  | { reset: true; cleared: boolean; wasOpen: boolean }
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

  // Which week the empty lists are for: next week's once this week's last
  // game has kicked off. Recorded now, as the schedule can change later
  const now = nowInTimeZone(GAME_TIME_ZONE);
  const weekStart = getSignupsWeekStart(now);
  const lastKickOff = getLastKickOff(games, weekStart);
  const listsWeekStart =
    lastKickOff === undefined || now >= lastKickOff
      ? addWeeks(weekStart, 1)
      : weekStart;
  await _admin().updateOne(
    {},
    { $set: { signups_lists_week: getWeekKey(listsWeekStart) } },
  );
  // Every list starts over, so last week's inbox no longer applies
  await clearAllNotifications();

  return await collection.find().toArray();
}

/**
 * Sunday night's close, like the admin page's "Disable" button. Only once the
 * week's last game has kicked off, so a stray call mid-week does nothing;
 * once per week, so an admin re-opening signups afterwards is left alone; and
 * not when an admin already cleared the lists for next week.
 * The lists stay until the Monday reset, so admins can track payments.
 */
export async function closeSignupsIfDue(): Promise<SignupsCloseResult> {
  const now = nowInTimeZone(GAME_TIME_ZONE);
  const localTime = now.toISOString();
  // Until the Monday reset the week that just ended still counts, so a run
  // that lands after midnight closes the right one
  const weekStart = getSignupsWeekStart(now);
  const week = getWeekKey(weekStart);

  const lastKickOff = getLastKickOff(
    await _games().find().toArray(),
    weekStart,
  );
  if (lastKickOff === undefined) {
    return { skipped: "no-games", week, localTime };
  }
  if (now < lastKickOff) {
    return { skipped: "before-last-game", week, localTime };
  }

  const admin = await getAdmin();
  if (admin === undefined) throw new Error("Admin document not found");

  // Cleared after the last game: an admin has started next week by hand
  if (admin.signups_lists_week === getWeekKey(addWeeks(weekStart, 1))) {
    return { skipped: "lists-already-reset", week, localTime };
  }

  const previous = await _admin().findOneAndUpdate(
    { _id: admin._id, signups_closed_week: { $ne: week } },
    { $set: { signup_open: false, signups_closed_week: week } },
    { returnDocument: "before" },
  );
  if (previous === null) return { skipped: "already-closed", week, localTime };

  console.log(`[signups] Week ${week}: signups closed`);

  return { closed: true, wasOpen: previous.signup_open, week, localTime };
}

/**
 * Monday's reset, from 07:00 Lisbon time: clears last week's lists and
 * re-opens signups, like the admin page's "Clear all" then "Enable". The week
 * is claimed first, so a repeat or parallel run can never wipe new signups.
 *
 * Lists already cleared for this week are kept, as an admin may have set them
 * up by hand since, and so are open lists with no record of being cleared.
 * Weeks without a playable game are skipped.
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

  // Nothing to sign up for, e.g. every game hidden over a break: leave
  // signups as they are rather than announce an empty week
  const games = await _games().find().toArray();
  if (getLastKickOff(games, weekStart) === undefined) {
    return { skipped: "no-games", week, localTime };
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
    // Lists cleared for any other week still hold another week's players.
    // With no record at all, open lists might already hold this week's, so
    // only closed ones are cleared
    const clearLists =
      previous.signups_lists_week !== undefined
        ? previous.signups_lists_week !== week
        : !previous.signup_open;

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
    // clearAllSignups records the lists' week once they are empty
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
