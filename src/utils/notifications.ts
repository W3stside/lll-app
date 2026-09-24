/* eslint-disable no-console */
// Server-only. Single entry point for "tell players something happened".
// Web Push is the primary channel; the WhatsApp bot is kept behind
// WHATSAPP_BOT_ENABLED while it's down. Nothing here ever throws - a failed
// notification must not fail (or half-apply) the request that triggered it.

import { NAVLINKS_MAP } from "@/constants/links";
import { recordGameNotifications } from "@/lib/inbox";
import {
  filterUserIdsByPreference,
  getOptedOutUserIds,
} from "@/lib/notificationPreferences";
import {
  type ISendPushOptions,
  sendPushToAll,
  sendPushToAllExcept,
  sendPushToUsers,
} from "@/lib/push/sendPush";
import type {
  GameNotificationType,
  IGame,
  IPushPayload,
  IUser,
  IUserSafe,
  NotificationPreferenceKey,
} from "@/types";
// Type-only: erased at build, so it does not trigger utils/bot env checks
import type * as BotModule from "@/utils/bot";
import { getOccurrenceKey } from "@/utils/date";
import { getOpenSpotsAlertCopy } from "@/utils/openSpots";

const HOUR_SECONDS = 60 * 60;

export function isWhatsAppBotEnabled(): boolean {
  return process.env.WHATSAPP_BOT_ENABLED === "true";
}

// Imported lazily: utils/bot throws at import time when its env vars are
// missing, which would otherwise take down every route importing this file
async function _withWhatsApp(
  label: string,
  send: (bot: typeof BotModule) => Promise<unknown>,
): Promise<void> {
  if (!isWhatsAppBotEnabled()) return;

  try {
    const bot = await import("@/utils/bot");
    await send(bot);
  } catch (error) {
    console.error(`[whatsapp] ${label} failed:`, error);
  }
}

// Day and time only: names and locations can be long enough that the OS
// truncates the notification body before the useful part
function _describeGame(game: IGame): string {
  // Stored as 24h "20:00"; "20h00" is how players write it locally
  return `${game.day} @ ${game.time.replace(":", "h")}`;
}

function _gameTag(prefix: string, game: IGame): string {
  // ObjectId hex is 24 chars; prefix keeps the tag within the 32 char Topic limit
  return `${prefix}-${game._id.toString()}`;
}

// Stored as 24h "20:00"; "20h00" is how players write it locally. Both dates
// are Lisbon wall-clock time read as a local Date.
function _describeCutoff(cutoff: Date, now: Date): string {
  const hours = String(cutoff.getHours()).padStart(2, "0");
  const minutes = String(cutoff.getMinutes()).padStart(2, "0");
  const when =
    getOccurrenceKey(cutoff) === getOccurrenceKey(now) ? "tonight" : "tomorrow";

  return `${hours}h${minutes} ${when}`;
}

// Game notifications also go to the in-app inbox, so players without push (iOS
// Safari tabs, blocked permission, never enabled) still see what changed.
// A profile preference only silences the push: the inbox row is still written.
// Resolves with the number of devices the push reached.
async function _sendGameNotification(
  userIds: string[],
  game: IGame,
  type: GameNotificationType,
  payload: IPushPayload,
  options: ISendPushOptions,
  preference?: NotificationPreferenceKey,
): Promise<number> {
  const pushUserIds =
    preference !== undefined
      ? await filterUserIdsByPreference(userIds, preference)
      : userIds;

  const [delivered] = await Promise.all([
    sendPushToUsers(pushUserIds, payload, options),
    recordGameNotifications(userIds, game, type, payload),
  ]);

  return delivered;
}

/** Waitlisted players who just got a confirmed spot. */
export async function notifyPromotedToActive(
  userIds: string[],
  game: IGame,
  whatsApp?: { promoted: IUserSafe; cancelled: IUserSafe },
): Promise<void> {
  await Promise.all([
    _sendGameNotification(
      userIds,
      game,
      "promoted",
      {
        title: "You're in! 🎉",
        body: `A spot opened up - you're off the waitlist for ${_describeGame(game)}.`,
        url: NAVLINKS_MAP.SIGNUP,
        tag: _gameTag("in", game),
      },
      { urgency: "high", ttl: 12 * HOUR_SECONDS },
      "promoted",
    ),
    whatsApp !== undefined
      ? _withWhatsApp(
          "queue change",
          async (bot) =>
            await bot.sendQueueChangeMessage(
              whatsApp.promoted,
              whatsApp.cancelled,
              game,
            ),
        )
      : Promise.resolve(),
  ]);
}

/**
 * Confirmed players, the evening before their game, while cancelling is still
 * free (see the game reminders cron route). `cutoff` and `now` are Lisbon
 * wall-clock time read as a local Date. Resolves with the devices reached.
 */
export async function notifyCancellationReminder(
  userIds: string[],
  game: IGame,
  { cutoff, now }: { cutoff: Date; now: Date },
): Promise<number> {
  return await _sendGameNotification(
    userIds,
    game,
    "reminder",
    {
      title: "Still in for tomorrow? ⚽",
      body: `Free cancellation for ${_describeGame(game)} closes at ${_describeCutoff(cutoff, now)}. Can't make it? Drop out now.`,
      url: NAVLINKS_MAP.SIGNUP,
      tag: _gameTag("rem", game),
    },
    {
      urgency: "normal",
      // Pointless once dropping out costs money, so don't deliver it late
      ttl: Math.max(60, Math.floor((cutoff.getTime() - now.getTime()) / 1000)),
    },
    "reminders",
  );
}

/** A confirmed player an admin moved back to the waitlist. */
export async function notifyBumped(user: IUser, game: IGame): Promise<void> {
  await Promise.all([
    _sendGameNotification(
      [user._id.toString()],
      game,
      "bumped",
      {
        title: "You were moved to the waitlist",
        body: `An admin moved you to the waitlist for ${_describeGame(game)}.`,
        url: NAVLINKS_MAP.SIGNUP,
        tag: _gameTag("out", game),
      },
      { urgency: "high", ttl: 12 * HOUR_SECONDS },
    ),
    _withWhatsApp(
      "bumped",
      async (bot) => await bot.sendBumpedMessage(user, game),
    ),
  ]);
}

/** A confirmed player an admin removed from a game that had no waitlist. */
export async function notifyRemovedByAdmin(
  user: IUser,
  game: IGame,
): Promise<void> {
  await Promise.all([
    _sendGameNotification(
      [user._id.toString()],
      game,
      "removed",
      {
        title: "You were removed from a game",
        body: `An admin removed you from ${_describeGame(game)}. Ask an admin in the group if this was a mistake.`,
        url: NAVLINKS_MAP.SIGNUP,
        // Same tag as notifyBumped: both mean "you're no longer playing"
        tag: _gameTag("out", game),
      },
      { urgency: "high", ttl: 12 * HOUR_SECONDS },
    ),
    // The bot's "bumped" message already reads as removal, and admin cancels
    // sent it before push existed
    _withWhatsApp(
      "removed",
      async (bot) => await bot.sendBumpedMessage(user, game),
    ),
  ]);
}

/**
 * @param userIds everyone signed up (confirmed + waitlist) - all of them
 *   planned around this game
 * @param whatsAppUserData confirmed players only, in the bot's existing format
 */
export async function notifyGameCancelled(
  userIds: string[],
  game: IGame,
  whatsAppUserData: Record<string, string>,
): Promise<void> {
  await Promise.all([
    _sendGameNotification(
      userIds,
      game,
      "cancelled",
      {
        title: "Game cancelled ❌",
        body: `${_describeGame(game)} has been cancelled. Ask an admin in the group for more info.`,
        url: NAVLINKS_MAP.SIGNUP,
        tag: _gameTag("cxl", game),
      },
      { urgency: "high", ttl: 24 * HOUR_SECONDS },
      "cancelled",
    ),
    Object.keys(whatsAppUserData).length > 0
      ? _withWhatsApp(
          "game cancelled",
          async (bot) =>
            await bot.sendGameCancelledMessage(whatsAppUserData, game),
        )
      : Promise.resolve(),
  ]);
}

/**
 * Weekly broadcast when an admin re-opens signups. Push only: not about a
 * specific game, and a row per user every week isn't worth storing.
 */
export async function notifySignupsOpen(): Promise<void> {
  await sendPushToAll(
    {
      title: "Signups are open!",
      body: "This week's games are up. Grab your spot before they fill.",
      url: NAVLINKS_MAP.SIGNUP,
      tag: "signups-open",
    },
    // Stale after a day: by then the good spots are gone anyway
    { urgency: "normal", ttl: 24 * HOUR_SECONDS },
  );
}

/**
 * The day before a game that still has confirmed spots free (see the cron
 * route). Push only, like notifySignupsOpen: it isn't about the player's own
 * game, and the signup page shows the same banner to everyone anyway. Players
 * already on the list are skipped - they can't sign up again.
 * Resolves with the number of devices reached.
 */
export async function notifyOpenSpots(game: IGame): Promise<number> {
  let optedOut: string[];
  try {
    optedOut = await getOptedOutUserIds("open_spots");
  } catch (error) {
    // Unlike a game update, nothing else depends on this push going out, so
    // respect the opt-outs by sending nothing rather than nagging them
    console.error("[open-spots] Failed to read opt-outs, not sending:", error);
    return 0;
  }

  const { title, body } = getOpenSpotsAlertCopy(game);

  return await sendPushToAllExcept(
    [...new Set([...optedOut, ...game.players])],
    {
      title,
      body,
      url: NAVLINKS_MAP.SIGNUP,
      tag: _gameTag("open", game),
    },
    // Pointless once the game has started; TTL covers 07:30 to a late kick-off
    { urgency: "normal", ttl: 40 * HOUR_SECONDS },
  );
}
