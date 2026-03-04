/* eslint-disable no-console */
import { type WithId, ObjectId } from "mongodb";
import type { NextApiRequest, NextApiResponse } from "next";

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
  getMaxPlayers,
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
      teamId?: number;
    };
    const {
      _id,
      newPlayerId,
      cancelPlayerId,
      isAdminCancel,
      teamId: teamIdFromReq,
      ...rest
    } = body;

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

      if (previous === null) {
        res.status(404).json({ message: "Document not found" });
        return;
      }

      const maxPlayers = getMaxPlayers(previous);

      result = await gamesCollection.findOneAndUpdate(
        { _id: gameIdWrapped },
        newPlayerId !== undefined
          ? // Adding a player to standard game
            { $addToSet: { players: newPlayerId.toString() } }
          : // Cancelling a player
            { $pull: { players: cancelPlayerId?.toString() } },
        { returnDocument: "after" },
      );

      let teamId: number | undefined;
      // Adding/removing a player to/from tourney game
      if (result?.teams !== undefined) {
        teamId =
          // Adding a new player, get random team index
          newPlayerId !== undefined
            ? teamIdFromReq !== undefined
              ? teamIdFromReq
              : getRandomAvailableTourneyIndex(
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
      }

      // User has cancelled a game
      // Check the list to see if we need to notify because
      // Pre-update list length is greater than maxPlayers (meaning there is a waitlist)
      if (
        result !== null &&
        cancelPlayerId !== undefined &&
        (isAdminCancel || previous.players.length > maxPlayers)
      ) {
        const playerIdx = previous.players.findIndex(
          (pl) => pl === cancelPlayerId.toString(),
        );

        // Admin cancelled a guy. Ping him
        if (isAdminCancel) {
          // Reinsert player at the top of the waitlist queue
          if (previous.players.length > maxPlayers) {
            const pushResult = await gamesCollection.findOneAndUpdate(
              { _id: gameIdWrapped },
              {
                $push: {
                  players: {
                    $each: [cancelPlayerId.toString()],
                    $position: maxPlayers,
                  },
                },
              },
              { returnDocument: "after" },
            );

            if (pushResult === null) {
              console.error(
                `Failed to reinsert ID "${cancelPlayerId.toString()}" at position ${maxPlayers} for document "${gameIdWrapped.toHexString()}".`,
              );
              // Handle error appropriately
            } else {
              result = pushResult;
              console.log(
                `Successfully moved ID "${cancelPlayerId.toString()}" in array "players" for document "${gameIdWrapped.toHexString()}" to position ${maxPlayers}.`,
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
        // Player cancelling is in the confirmed list
        else if (playerIdx < maxPlayers) {
          const newlyConfirmedPlayer = result.players.at(maxPlayers - 1);

          // If it's a tournament, add the newly confirmed player to the team of the cancelled player
          if (
            (result.type === GameType.TOURNAMENT_RANDOM ||
              result.type === GameType.TOURNAMENT_NATIONS) &&
            teamId !== undefined &&
            newlyConfirmedPlayer !== undefined
          ) {
            const key = `teams.${teamId}.players`;
            result = await gamesCollection.findOneAndUpdate(
              { _id: gameIdWrapped },
              {
                $addToSet: {
                  [key]: newlyConfirmedPlayer,
                },
              },
              { returnDocument: "after" },
            );
          }

          if (newlyConfirmedPlayer !== undefined && result !== null) {
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

            await sendQueueChangeMessage(
              newConfirmedUser,
              cancelledUser,
              result,
            );
          }
        }
      }
    }
    // Updating game parameters
    else {
      // Fetch the current state of the game to preserve players and teams correctly
      const currentGame = await gamesCollection.findOne({ _id: gameIdWrapped });

      if (currentGame === null) {
        res.status(404).json({ message: "Document not found" });
        return;
      }

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const {
        players: _players,
        teams: incomingTeams,
        ...paramsToUpdate
      } = rest;

      const updateDoc: { $set: Partial<IGame> } = {
        $set: paramsToUpdate,
      };

      // If teams are provided, we want to update the team names but PRESERVE the players in each team
      if (incomingTeams !== undefined && Array.isArray(incomingTeams)) {
        if (currentGame.teams !== undefined) {
          updateDoc.$set.teams = currentGame.teams.map((existingTeam, i) => {
            const incomingTeam = incomingTeams[i];
            return {
              ...existingTeam,
              name: incomingTeam.name ?? existingTeam.name,
              // We explicitly keep the existing players
              players: existingTeam.players,
            };
          });
        } else {
          // If the game didn't have teams before, use the incoming ones (they should have empty players)
          updateDoc.$set.teams = incomingTeams;
        }
      }

      result = await gamesCollection.findOneAndUpdate(
        { _id: gameIdWrapped },
        updateDoc,
        { returnDocument: "after" },
      );
    }

    if (result === null) {
      res.status(404).json({ message: "Document not found" });
    } else {
      const updatedGames = await gamesCollection.find().toArray();

      if (result.cancelled === true) {
        try {
          const users = await db
            .collection<IUser>(Collection.USERS)
            .find()
            .toArray();

          const usersById = groupUsersById(users);
          const resultMaxPlayers = getMaxPlayers(result);

          const userData = Object.fromEntries(
            result.players
              .slice(0, resultMaxPlayers)
              .map((p) => {
                const user = usersById[p.toString()];
                if ((user as IUser | undefined) === undefined) return null;
                return [
                  `${user.first_name} ${user.last_name} (${user._id.toString()})`,
                  user.phone_number,
                ];
              })
              .filter((entry): entry is [string, string] => entry !== null),
          );

          if (Object.keys(userData).length > 0) {
            await sendGameCancelledMessage(userData, result);
          }
        } catch (botError) {
          console.error("Error sending cancellation message:", botError);
          // Don't fail the request if the bot fails
        }
      }

      res.status(200).json({ updatedGame: result, games: updatedGames });
    }
  } catch (error) {
    res.status(500).json({ message: "Error updating document" });
  }
};
