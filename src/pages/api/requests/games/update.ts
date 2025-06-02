import { type WithId, ObjectId } from "mongodb";
import type { NextApiRequest, NextApiResponse } from "next";
import { v4 } from "uuid";

import { MAX_SIGNUPS_PER_GAME } from "@/constants/signups";
import { sendBotNotification } from "@/lib/bot/sendBotMessage";
import client from "@/lib/mongodb";
import { Collection, type IUser, type IGame } from "@/types";
import { sendBumpedMessage, sendQueueChangeMessage } from "@/utils/bot";
import { groupUsersById } from "@/utils/data";
import { prepareTourneyGamePlayersList } from "@/utils/games";

if (
  process.env.WHATSAPP_BOT_API_URL === undefined ||
  process.env.WHATSAPP_BOT_API_CLIENT_ID === undefined ||
  process.env.WHATSAPP_BOT_API_CLIENT_SECRET === undefined ||
  process.env.WHATSAPP_BOT_CHANNEL_ID === undefined
) {
  throw new Error("Missing WhatsApp Bot API environment variables");
}

export default async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== "PATCH" && req.method !== "PUT") {
    res.status(405).json({ message: "Method not allowed" });
    return;
  }

  try {
    const body = req.body as IGame & {
      newPlayerId?: ObjectId;
      cancelPlayerId?: ObjectId;
      isAdminCancel: boolean;
    };
    const { _id, newPlayerId, cancelPlayerId, isAdminCancel, ...rest } = body;

    const db = client.db("LLL");
    const gamesCollection = db.collection<IGame>(Collection.GAMES);

    const gameIdWrapped = new ObjectId(_id);
    let result: WithId<IGame> | null;
    // Adding or Cancelling a player
    if (newPlayerId !== undefined || cancelPlayerId !== undefined) {
      const previous = await gamesCollection.findOne({
        _id: gameIdWrapped,
      });

      result = await gamesCollection.findOneAndUpdate(
        { _id: gameIdWrapped },
        newPlayerId !== undefined
          ? // Adding a player to standard game
            { $addToSet: { players: newPlayerId.toString() } }
          : // Cancelling a player
            { $pull: { players: cancelPlayerId?.toString() } },
        { returnDocument: "after" },
      );

      // Adding a player to tourney game
      if (result !== null && result.teams !== undefined) {
        const teamsList = prepareTourneyGamePlayersList(result.players);
        result = await gamesCollection.findOneAndUpdate(
          { _id: gameIdWrapped },
          teamsList,
          { returnDocument: "after" },
        );
      }

      // User has cancelled a game
      // Check the list to see if we need to notify because
      // Pre-update list length is greater than MAX_SIGNUPS_PER_GAME (meaning there is a waitlist)
      if (
        result !== null &&
        previous !== null &&
        cancelPlayerId !== undefined &&
        (isAdminCancel || previous.players.length > MAX_SIGNUPS_PER_GAME)
      ) {
        const playerIdx = previous.players.findIndex(
          (pl) => pl === cancelPlayerId.toString(),
        );

        // Admin cancelled a guy. Ping him
        if (isAdminCancel) {
          const bumpedUser = await db
            .collection(Collection.USERS)
            .findOne<IUser>({
              _id: new ObjectId(cancelPlayerId),
            });

          if (bumpedUser !== null) {
            await sendBumpedMessage(bumpedUser, result);
          } else {
            throw new Error("User not found");
          }
        }
        // Player cancelling is in the waitlist
        else if (playerIdx < MAX_SIGNUPS_PER_GAME) {
          const newlyConfirmedPlayer = result.players[MAX_SIGNUPS_PER_GAME - 1];

          const newConfirmedUser = await db
            .collection(Collection.USERS)
            .findOne<IUser>({
              _id: new ObjectId(newlyConfirmedPlayer),
            });

          if (newConfirmedUser !== null) {
            await sendQueueChangeMessage(newConfirmedUser, result);
          }
        }
      }
    }
    // Updating game parameters
    else {
      result = await gamesCollection.findOneAndUpdate(
        { _id: gameIdWrapped },
        {
          $set: rest,
        },
        { returnDocument: "after" },
      );
    }

    if (result === null) {
      res.status(404).json({ message: "Document not found" });
    } else {
      const updatedGames = await gamesCollection.find().toArray();

      if (result.cancelled === true) {
        const users = await db
          .collection<IUser>(Collection.USERS)
          .find()
          .toArray();

        const usersById = groupUsersById(users);

        const userData = Object.fromEntries(
          result.players
            .slice(0, MAX_SIGNUPS_PER_GAME)
            .map((p) => [
              usersById[p.toString()].first_name,
              usersById[p.toString()].phone_number,
            ]),
        );

        await sendBotNotification({
          id: v4(),
          channel: "NOTIFICATION_CHANNEL_WHATSAPP",
          recipients: [process.env.WHATSAPP_BOT_CHANNEL_ID as string],
          whatsapp_payload: {
            text: `
Hi 👋
${Object.entries(userData)
  .map(
    ([name, phone]) => `
${name} [@${phone}]`,
  )
  .join("\r\n")}
      
Unfortunately, the game scheduled for ${result.day} at ${result.time} has been cancelled Please reach out to an admin in the group for more info.

When: ${result.day} @ ${result.time} 
Where: ${result.location}
Address: ${result.address}

See you next time!`,
            mentions: Object.values(userData),
          },
        });
      }

      res.status(200).json({ updatedGame: result, games: updatedGames });
    }
  } catch (error) {
    res.status(500).json({ message: "Error updating document" });
  }
};
