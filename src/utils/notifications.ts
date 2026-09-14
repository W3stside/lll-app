/* eslint-disable no-console */
// Server-only. Single entry point for "tell players something happened".
// Web Push is the primary channel; the WhatsApp bot is kept behind
// WHATSAPP_BOT_ENABLED while it's down. Nothing here ever throws - a failed
// notification must not fail (or half-apply) the request that triggered it.

import { NAVLINKS_MAP } from "@/constants/links";
import { recordGameNotifications } from "@/lib/inbox";
import {
  type ISendPushOptions,
  sendPushToAll,
  sendPushToUsers,
} from "@/lib/push/sendPush";
import type {
  GameNotificationType,
  IGame,
  IPushPayload,
  IUser,
  IUserSafe,
} from "@/types";
// Type-only: erased at build, so it does not trigger utils/bot env checks
import type * as BotModule from "@/utils/bot";

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

// Game notifications also go to the in-app inbox, so players without push (iOS
// Safari tabs, blocked permission, never enabled) still see what changed
async function _sendGameNotification(
  userIds: string[],
  game: IGame,
  type: GameNotificationType,
  payload: IPushPayload,
  options: ISendPushOptions,
): Promise<void> {
  await Promise.all([
    sendPushToUsers(userIds, payload, options),
    recordGameNotifications(userIds, game, type, payload),
  ]);
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
