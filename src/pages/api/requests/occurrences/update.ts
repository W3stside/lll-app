/* eslint-disable no-console */
import { ObjectId } from "mongodb";
import type { NextApiRequest, NextApiResponse } from "next";

import { DAYS_IN_WEEK } from "@/constants/date";
import { markAttendance } from "@/lib/gameOccurrences";
import client from "@/lib/mongodb";
import { requireAdmin } from "@/lib/requireAdmin";
import {
  type AttendanceStatus,
  Collection,
  type IAttendanceUpdate,
  type IGame,
} from "@/types";
import { getUSDayIndex, parseOccurrenceKey } from "@/utils/date";
import { isObjectIdHex } from "@/utils/objectId";

const ATTENDANCE_STATUSES = new Set<unknown>([
  "no_show",
  "present",
] satisfies AttendanceStatus[]);
// Far above any list; only bounds the size of one update
const MAX_PLAYERS_PER_UPDATE = 100;

// Untrusted JSON: every field is checked before it reaches a query
function _parseBody(body: unknown): IAttendanceUpdate | null {
  if (typeof body !== "object" || body === null) return null;

  const { game_id, occurrence, user_ids, attendance } = body as Record<
    string,
    unknown
  >;

  if (
    !isObjectIdHex(game_id) ||
    typeof occurrence !== "string" ||
    parseOccurrenceKey(occurrence) === null ||
    !Array.isArray(user_ids) ||
    user_ids.length === 0 ||
    user_ids.length > MAX_PLAYERS_PER_UPDATE ||
    !user_ids.every(isObjectIdHex) ||
    (attendance !== null && !ATTENDANCE_STATUSES.has(attendance))
  ) {
    return null;
  }

  return {
    game_id,
    occurrence,
    user_ids,
    attendance: attendance as AttendanceStatus | null,
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
      res.status(400).json({ message: "Invalid attendance update" });
      return;
    }

    const game = await client
      .db("LLL")
      .collection<IGame>(Collection.GAMES)
      .findOne({ _id: new ObjectId(update.game_id) });

    if (game === null) {
      res.status(404).json({ message: "Game not found" });
      return;
    }

    // Checked by parseOccurrenceKey above
    const date = parseOccurrenceKey(update.occurrence) as Date;
    if (DAYS_IN_WEEK[getUSDayIndex(date)] !== game.day) {
      res
        .status(400)
        .json({ message: `${update.occurrence} isn't a ${game.day}` });
      return;
    }

    const occurrence = await markAttendance(
      game,
      update.occurrence,
      update.user_ids,
      update.attendance,
    );

    res.status(200).json({ occurrence });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error saving attendance" });
  }
}
