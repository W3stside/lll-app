import { type WithId, ObjectId } from "mongodb";
import type { NextApiRequest, NextApiResponse } from "next";
import { v4 } from "uuid";

import { MAX_SIGNUPS_PER_GAME } from "@/constants/signups";
import { sendBotNotification } from "@/lib/bot/sendBotMessage";
import client from "@/lib/mongodb";
import { Collection } from "@/types";
import type { IUser, IGame } from "@/types/users";

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
    if (newPlayerId !== undefined || cancelPlayerId !== undefined) {
      const previous = await gamesCollection.findOne({
        _id: gameIdWrapped,
      });

      result = await gamesCollection.findOneAndUpdate(
        { _id: gameIdWrapped },
        // Adding a player
        newPlayerId !== undefined
          ? {
              $addToSet: { players: newPlayerId },
            }
          : // Cancelling a player
            {
              $pull: { players: cancelPlayerId },
            },
        { returnDocument: "after" },
      );
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
          (pl) => pl === cancelPlayerId,
        );

        // Admin cancelled a guy. Ping him
        if (isAdminCancel) {
          const bumpedUser = await db
            .collection(Collection.USERS)
            .findOne<IUser>({
              _id: new ObjectId(cancelPlayerId),
            });

          if (bumpedUser !== null) {
            await sendBotNotification({
              id: v4(),
              channel: "NOTIFICATION_CHANNEL_WHATSAPP",
              recipients: [process.env.WHATSAPP_BOT_CHANNEL_ID as string],
              whatsapp_payload: {
                text: `
Hi 👋 ${bumpedUser.first_name} ${bumpedUser.last_name} [@${bumpedUser.phone_number}] 

Sorry but you were bumped from the ladies game ${result.game_id} - remember that ladies get priority in these games.

When: ${result.day} @ ${result.time} 
Where: ${result.location}
Address: ${result.address}`,
                mentions: [bumpedUser.phone_number],
              },
            });
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
            await sendBotNotification({
              id: v4(),
              channel: "NOTIFICATION_CHANNEL_WHATSAPP",
              recipients: [process.env.WHATSAPP_BOT_CHANNEL_ID as string],
              whatsapp_payload: {
                text: `
Hi 👋 ${newConfirmedUser.first_name} ${newConfirmedUser.last_name} [@${newConfirmedUser.phone_number}] 

You are confirmed for game ${result.game_id}!

When: ${result.day} @ ${result.time} 
Where: ${result.location}
Address: ${result.address}

Have fun! 🎉`,
                mentions: [newConfirmedUser.phone_number],
              },
            });
          }
        }
      }
    } else {
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
      res.status(200).json({ updatedGame: result, games: updatedGames });
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
    res.status(500).json({ message: "Error updating document" });
  }
};
