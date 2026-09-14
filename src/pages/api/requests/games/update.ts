/* eslint-disable no-console */
import { type Db, type WithId, ObjectId } from "mongodb";
import type { NextApiRequest, NextApiResponse } from "next";

import client from "@/lib/mongodb";
import { getApiRequester } from "@/lib/requireAdmin";
import {
  type IAdmin,
  Collection,
  type IUser,
  type IGame,
  GameType,
} from "@/types";
import { groupUsersById } from "@/utils/data";
import {
  findPlayerInTourney,
  getMaxPlayers,
  getRandomAvailableTourneyIndex,
} from "@/utils/games";
import {
  notifyBumped,
  notifyGameCancelled,
  notifyPromotedToActive,
  notifyRemovedByAdmin,
} from "@/utils/notifications";

// WhatsApp env vars are validated inside utils/bot, which utils/notifications
// only loads when WHATSAPP_BOT_ENABLED=true - so this route works without them.

async function _isSignupOpen(db: Db): Promise<boolean> {
  // .at() types the result as possibly undefined, unlike destructuring
  const adminInfo = (
    await db.collection<IAdmin>(Collection.ADMIN).find().limit(1).toArray()
  ).at(0);

  return adminInfo !== undefined && adminInfo.signup_open;
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

    const requester = await getApiRequester(req);
    if (requester === null) {
      res.status(401).json({ message: "Not logged in" });
      return;
    }

    // Players may only sign themselves up or cancel themselves. Everything else
    // (editing a game, admin cancels, acting for someone else) moves players
    // around and sends them push notifications, so it is admin-only.
    const targetPlayerId = newPlayerId ?? cancelPlayerId;
    const isSelfAction =
      isAddOrRemovePlayer &&
      !isAdminCancel &&
      targetPlayerId?.toString() === requester.userId;

    if (!isSelfAction && !requester.isAdmin) {
      res.status(403).json({ message: "Admins only" });
      return;
    }

    const gameIdWrapped = new ObjectId(_id);
    let result: WithId<IGame> | null;
    // Pre-update snapshot, used to only notify on actual state transitions
    let previousGame: WithId<IGame> | null = null;
    // Adding or Cancelling a player
    if (isAddOrRemovePlayer) {
      const previous = await gamesCollection.findOne({
        _id: gameIdWrapped,
      });

      if (previous === null) {
        res.status(404).json({ message: "Document not found" });
        return;
      }
      previousGame = previous;

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
      const playerIdx =
        cancelPlayerId !== undefined
          ? previous.players.findIndex((pl) => pl === cancelPlayerId.toString())
          : -1;

      if (
        result !== null &&
        cancelPlayerId !== undefined &&
        // Not in the list (double-tap, racing requests): the $pull was a no-op,
        // so nobody moved - reinserting or notifying would invent a transition
        playerIdx !== -1 &&
        (isAdminCancel || previous.players.length > maxPlayers)
      ) {
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
            // Admins reshuffle freely while signups are closed; only ping
            // players once the lists are live
            if (await _isSignupOpen(db)) {
              if (previous.players.length <= maxPlayers) {
                // No waitlist to land on, so the $pull removed them outright
                await notifyRemovedByAdmin(bumpedUser, result);
              } else if (playerIdx < maxPlayers) {
                // Confirmed player moved to the top of the waitlist; their slot
                // goes to the first waitlisted player
                const promotedPlayer = result.players.at(maxPlayers - 1);

                await Promise.all([
                  notifyBumped(bumpedUser, result),
                  promotedPlayer !== undefined
                    ? notifyPromotedToActive([promotedPlayer], result)
                    : Promise.resolve(),
                ]);
              }
              // Otherwise they were already waitlisted and stay waitlisted, so
              // there is nothing to tell them
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

            const involvedUsers = await db
              .collection<IUser>(Collection.USERS)
              .find({ _id: { $in: ids } })
              .toArray();
            // Matched by id rather than position: if one user was deleted the
            // other must not shift into the wrong slot
            const newConfirmedUser = involvedUsers.find(
              (u) => u._id.toString() === newlyConfirmedPlayer,
            );
            const cancelledUser = involvedUsers.find(
              (u) => u._id.toString() === cancelPlayerId.toString(),
            );

            await notifyPromotedToActive(
              [newlyConfirmedPlayer],
              result,
              // Both lookups can miss if a user was deleted; push still goes out
              newConfirmedUser !== undefined && cancelledUser !== undefined
                ? { promoted: newConfirmedUser, cancelled: cancelledUser }
                : undefined,
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
      previousGame = currentGame;

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

      // Capacity grew (e.g. Standard -> Elevens, or more tourney teams):
      // waitlisted players now inside the new limit got a spot silently.
      // Same rule as admin cancels: no pings while admins set up closed lists.
      if (
        result !== null &&
        result.cancelled !== true &&
        (await _isSignupOpen(db))
      ) {
        const promotedPlayers = result.players.slice(
          getMaxPlayers(currentGame),
          getMaxPlayers(result),
        );

        if (promotedPlayers.length > 0) {
          await notifyPromotedToActive(promotedPlayers, result);
        }
      }
    }

    if (result === null) {
      res.status(404).json({ message: "Document not found" });
    } else {
      const updatedGames = await gamesCollection.find().toArray();

      // Only on the transition into cancelled - every later edit of an
      // already-cancelled game used to re-send the message
      if (result.cancelled === true && previousGame.cancelled !== true) {
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

          await notifyGameCancelled(result.players, result, userData);
        } catch (notifyError) {
          console.error("Error sending cancellation message:", notifyError);
          // Don't fail the request if the bot fails
        }
      }

      res.status(200).json({ updatedGame: result, games: updatedGames });
    }
  } catch (error) {
    res.status(500).json({ message: "Error updating document" });
  }
};
