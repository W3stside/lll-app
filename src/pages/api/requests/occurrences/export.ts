/* eslint-disable no-console */
// The whole game history as a spreadsheet: one row per player per game week.

import { ObjectId } from "mongodb";
import type { NextApiRequest, NextApiResponse } from "next";

import { GAME_TIME_ZONE } from "@/constants/date";
import { getAllOccurrences } from "@/lib/gameOccurrences";
import client from "@/lib/mongodb";
import { requireAdmin } from "@/lib/requireAdmin";
import { Collection, type IUser } from "@/types";
import { formatDateKey, nowInTimeZone } from "@/utils/date";
import {
  ATTENDANCE_LABELS,
  getOccurrencePlayers,
  toCsv,
} from "@/utils/gameHistory";
import { isObjectIdHex } from "@/utils/objectId";

// Makes Excel read accented names as UTF-8
const UTF8_BOM = "\uFEFF";

const HEADER = [
  "Date",
  "Day",
  "Time",
  "Game",
  "Location",
  "Cancelled",
  "Player",
  "Phone",
  "List",
  "Attendance",
  "Payment",
];

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "GET") {
    res.status(405).json({ message: "Method not allowed" });
    return;
  }

  try {
    if (!(await requireAdmin(req, res))) return;

    const occurrences = await getAllOccurrences();
    const playersByOccurrence = occurrences.map(getOccurrencePlayers);

    const userIds = [
      ...new Set(playersByOccurrence.flat().map(({ userId }) => userId)),
    ].filter(isObjectIdHex);
    const users = await client
      .db("LLL")
      .collection<IUser>(Collection.USERS)
      .find(
        { _id: { $in: userIds.map((id) => new ObjectId(id)) } },
        { projection: { first_name: 1, last_name: 1, phone_number: 1 } },
      )
      .toArray();
    const usersById = new Map(users.map((user) => [user._id.toString(), user]));

    const rows = occurrences.flatMap((occurrence, index) =>
      playersByOccurrence[index].map(
        ({ userId, list, attendance, payment }) => {
          const user = usersById.get(userId);

          return [
            occurrence.occurrence,
            occurrence.day,
            occurrence.time,
            occurrence.name ??
              (occurrence.game_number !== undefined
                ? `Game ${occurrence.game_number}`
                : ""),
            occurrence.location,
            occurrence.cancelled ? "yes" : "",
            user !== undefined
              ? `${user.first_name} ${user.last_name}`
              : "(deleted account)",
            user?.phone_number ?? "",
            list ?? "",
            attendance !== undefined ? ATTENDANCE_LABELS[attendance] : "",
            payment ?? "",
          ];
        },
      ),
    );

    const today = formatDateKey(nowInTimeZone(GAME_TIME_ZONE));
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="lll-game-history-${today}.csv"`,
    );
    res.setHeader("Cache-Control", "private, no-store");
    res.status(200).send(`${UTF8_BOM}${toCsv([HEADER, ...rows])}`);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error exporting the game history" });
  }
}
