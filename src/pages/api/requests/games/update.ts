/* eslint-disable no-console */
import { type WithId, ObjectId } from "mongodb";
import type { NextApiRequest, NextApiResponse } from "next";

import { MAX_SIGNUPS_PER_GAME } from "@/constants/signups";
import client from "@/lib/mongodb";
import {
  type IAdmin,
  Collection,
  type IUser,
  type IGame,
  GameType,
} from "@/types";
import {
  sendBumpedMessage,
  sendGameCancelledMessage,
  sendQueueChangeMessage,
} from "@/utils/bot";
import { groupUsersById } from "@/utils/data";
import {
  findPlayerInTourney,
  getRandomAvailableTourneyIndex,
} from "@/utils/games";

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

    const isAddOrRemovePlayer =
      newPlayerId !== undefined || cancelPlayerId !== undefined;

    const gameIdWrapped = new ObjectId(_id);
    let result: WithId<IGame> | null;
    // Adding or Cancelling a player
    if (isAddOrRemovePlayer) {
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

      // Adding/removing a player to/from tourney game
      if (result?.teams !== undefined) {
        const teamId =
          // Adding a new player, get random team index
          newPlayerId !== undefined
            ? getRandomAvailableTourneyIndex(
                newPlayerId.toString(),
                result.teams,
              )
            : // Cancelling a player, get team index of the player
              findPlayerInTourney(
                cancelPlayerId?.toString() ?? "",
                result.teams,
              );

        // Add player to random team
        if (teamId !== undefined) {
          const key = `teams.${teamId}.players`;

          result = await gamesCollection.findOneAndUpdate(
            { _id: gameIdWrapped },
            newPlayerId !== undefined
              ? {
                  $addToSet: {
                    [key]: newPlayerId.toString(),
                  },
                }
              : {
                  $pull: {
                    [key]: cancelPlayerId?.toString(),
                  },
                },
            { returnDocument: "after" },
          );
        }
        // No more teams available
        else {
          res.status(400).json({
            message: "No available team for the player",
          });
        }
      }

      // User has cancelled a game
      // Check the list to see if we need to notify because
      // Pre-update list length is greater than MAX_SIGNUPS_PER_GAME (meaning there is a waitlist)
      if (
        result !== null &&
        previous !== null &&
        cancelPlayerId !== undefined &&
        (isAdminCancel ||
          previous.players.length >
            MAX_SIGNUPS_PER_GAME[previous.type ?? GameType.STANDARD])
      ) {
        const playerIdx = previous.players.findIndex(
          (pl) => pl === cancelPlayerId.toString(),
        );

        // Admin cancelled a guy. Ping him
        if (isAdminCancel) {
          // Reinsert player at the top of the waitlist queue
          if (
            previous.players.length >
            MAX_SIGNUPS_PER_GAME[previous.type ?? GameType.STANDARD]
          ) {
            const pushResult = await gamesCollection.updateOne(
              { _id: gameIdWrapped },
              {
                $push: {
                  players: {
                    $each: [cancelPlayerId.toString()],
                    $position:
                      MAX_SIGNUPS_PER_GAME[previous.type ?? GameType.STANDARD],
                  },
                },
              },
            );

            if (pushResult.modifiedCount === 0) {
              console.error(
                `Failed to reinsert ID "${cancelPlayerId.toString()}" at position ${MAX_SIGNUPS_PER_GAME[previous.type ?? GameType.STANDARD]} for document "${gameIdWrapped.toHexString()}".`,
              );
              // Handle error appropriately
            } else {
              console.log(
                `Successfully moved ID "${cancelPlayerId.toString()}" in array "players" for document "${gameIdWrapped.toHexString()}" to position ${MAX_SIGNUPS_PER_GAME[previous.type ?? GameType.STANDARD]}.`,
              );
            }
          }
          const bumpedUser = await db
            .collection(Collection.USERS)
            .findOne<IUser>({
              _id: new ObjectId(cancelPlayerId),
            });

          if (bumpedUser !== null) {
            const [adminInfo] = await db
              .collection<IAdmin>(Collection.ADMIN)
              .find()
              .toArray();

            if (adminInfo.signup_open) {
              await sendBumpedMessage(bumpedUser, result);
            }
          } else {
            throw new Error("User not found");
          }
        }
        // Player cancelling is in the waitlist
        else if (
          playerIdx < MAX_SIGNUPS_PER_GAME[previous.type ?? GameType.STANDARD]
        ) {
          const newlyConfirmedPlayer = result.players.at(
            MAX_SIGNUPS_PER_GAME[previous.type ?? GameType.STANDARD] - 1,
          );

          const ids = [
            new ObjectId(newlyConfirmedPlayer),
            new ObjectId(cancelPlayerId),
          ];

          const [newConfirmedUser, cancelledUser] = await db
            .collection(Collection.USERS)
            .aggregate<IUser>([
              {
                $match: {
                  _id: { $in: ids },
                },
              },
              {
                $addFields: {
                  sortOrder: {
                    $indexOfArray: [ids, "$_id"],
                  },
                },
              },
              {
                $sort: { sortOrder: 1 },
              },
            ])
            .toArray();

          await sendQueueChangeMessage(newConfirmedUser, cancelledUser, result);
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
            .slice(0, MAX_SIGNUPS_PER_GAME[result.type ?? GameType.STANDARD])
            .map((p) => [
              usersById[p.toString()].first_name,
              usersById[p.toString()].phone_number,
            ]),
        );

        await sendGameCancelledMessage(userData, result);
      }

      res.status(200).json({ updatedGame: result, games: updatedGames });
    }
  } catch (error) {
    res.status(500).json({ message: "Error updating document" });
  }
};
