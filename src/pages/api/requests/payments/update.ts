/* eslint-disable no-console */
// Records whether a player paid for a game. The player's missedPayments list
// stays the ledger of what they owe, and the game history row (when the week
// is known) keeps what happened at the game, so every admin sees the same.

import { ObjectId } from "mongodb";
import type { NextApiRequest, NextApiResponse } from "next";

import { DAYS_IN_WEEK } from "@/constants/date";
import { markPayment } from "@/lib/gameOccurrences";
import client from "@/lib/mongodb";
import { requireAdmin } from "@/lib/requireAdmin";
import {
  Collection,
  type IGame,
  type IPaymentUpdate,
  type IUser,
} from "@/types";
import { getUSDayIndex, parseOccurrenceKey } from "@/utils/date";
import { isObjectIdHex } from "@/utils/objectId";

// Ledger keys are formatDateStr output and times are "HH:MM": both short
const MAX_KEY_LENGTH = 64;

function _isShortString(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= MAX_KEY_LENGTH
  );
}

// Untrusted JSON: every field is checked before it reaches a query
function _parseBody(body: unknown): IPaymentUpdate | null {
  if (typeof body !== "object" || body === null) return null;

  const { user_id, game_id, date, day, time, occurrence, paid } =
    body as Record<string, unknown>;

  if (
    !isObjectIdHex(user_id) ||
    !isObjectIdHex(game_id) ||
    !_isShortString(date) ||
    !(DAYS_IN_WEEK as readonly unknown[]).includes(day) ||
    !_isShortString(time) ||
    (occurrence !== undefined &&
      (typeof occurrence !== "string" ||
        parseOccurrenceKey(occurrence) === null)) ||
    typeof paid !== "boolean"
  ) {
    return null;
  }

  return {
    user_id,
    game_id,
    date,
    day: day as IGame["day"],
    time,
    occurrence,
    paid,
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "PATCH") {
    res.status(405).json({ message: "Method not allowed" });
    return;
  }

  try {
    if (!(await requireAdmin(req, res))) return;

    const update = _parseBody(req.body);
    if (update === null) {
      res.status(400).json({ message: "Invalid payment update" });
      return;
    }

    const { user_id, game_id, date, day, time, occurrence, paid } = update;
    const db = client.db("LLL");
    const users = db.collection<IUser>(Collection.USERS);
    const userId = new ObjectId(user_id);

    // A deleted game can still have debts to settle, but a history row only
    // for a date the game is played on
    const game = await db
      .collection<IGame>(Collection.GAMES)
      .findOne({ _id: new ObjectId(game_id) });
    const occurrenceDate =
      occurrence !== undefined ? parseOccurrenceKey(occurrence) : null;
    if (
      game !== null &&
      occurrenceDate !== null &&
      DAYS_IN_WEEK[getUSDayIndex(occurrenceDate)] !== game.day
    ) {
      res.status(400).json({ message: `${occurrence} isn't a ${game.day}` });
      return;
    }

    // Ledger entries hold the game id as a string, the way the earlier admin
    // route stored them from JSON. An ObjectId is matched as well regardless.
    const entryGameId = { $in: [game_id, new ObjectId(game_id)] };

    if (paid) {
      await users.updateOne(
        { _id: userId },
        { $pull: { missedPayments: { _id: entryGameId, date } } },
      );
    } else {
      // Guarded, so a double tap can't record the same debt twice
      await users.updateOne(
        {
          _id: userId,
          missedPayments: {
            $not: { $elemMatch: { _id: entryGameId, date } },
          },
        },
        {
          $push: {
            missedPayments: {
              _id: game_id as unknown as ObjectId,
              date,
              time,
              day,
              ...(occurrence !== undefined ? { occurrence } : {}),
            },
          },
        },
      );
    }

    const user = await users.findOne(
      { _id: userId },
      { projection: { password: 0 } },
    );

    if (user === null) {
      res.status(404).json({ message: "Player not found" });
      return;
    }

    const occurrenceRow =
      occurrence !== undefined
        ? await markPayment(
            { game_id, occurrence },
            game,
            user_id,
            paid ? "paid" : "unpaid",
          )
        : null;

    res.status(200).json({ user, occurrence: occurrenceRow });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error recording the payment" });
  }
}
