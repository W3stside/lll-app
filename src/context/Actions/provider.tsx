import type { ObjectId } from "mongodb";
import { useState, useMemo } from "react";

import { ActionContext, type IActionContext } from "./context";
import { DialogVariant, useDialog } from "../Dialog/context";
import { useGames } from "../Games/context";
import { useUser } from "../User/context";

import { CANCELLATION_THRESHOLD_MS } from "@/constants/date";
import { Collection } from "@/types";
import type { IGame, IUser } from "@/types/users";
import { dbAuth } from "@/utils/api/dbAuth";
import { dbRequest } from "@/utils/api/dbRequest";
import { isValidUserUpdate } from "@/utils/signup";

interface IActionProvider {
  children: React.ReactNode;
}

const _dbSignup = async (request: IGame) => {
  try {
    await dbRequest("update", Collection.GAMES, request);
    const { data, error } = await dbRequest<IGame[]>("get", Collection.GAMES);

    if (error !== null) throw error;

    return data;
  } catch (e) {
    throw new Error(e instanceof Error ? e.message : "Unknown error occurred.");
  }
};

const _cancelGame = async (
  games: IGame[],
  gameId: ObjectId,
  userId: ObjectId,
) => {
  try {
    await dbRequest<IGame>("update", Collection.GAMES, {
      _id: gameId,
      players:
        games
          .find((g) => g._id.toString() === gameId.toString())
          ?.players.filter((pl) => pl.toString() !== userId.toString()) ?? [],
    });

    const { data } = await dbRequest<IGame[]>("get", Collection.GAMES);
    return data;
  } catch (error) {
    const errFull =
      error instanceof Error
        ? error
        : new Error("_cancelGame: Unknown error occurred");

    // eslint-disable-next-line no-console
    console.error(errFull);

    throw errFull;
  }
};

export function ActionProvider({ children }: IActionProvider) {
  const [loading, setLoading] = useState(false);
  const [errorState, setError] = useState<Error | null>(null);

  const { setUser } = useUser();
  const { games, setGames } = useGames();
  const { openDialog } = useDialog();

  const { addShamefulUser, cancelGame, signupForGame, updateUser } = useMemo<
    Pick<
      IActionContext,
      "addShamefulUser" | "cancelGame" | "signupForGame" | "updateUser"
    >
  >(() => {
    const _addShamefulUser: IActionContext["addShamefulUser"] = async (
      gameId,
      userId,
      date,
    ) => {
      try {
        setError(null);
        setLoading(true);
        await dbRequest<IUser>("update", Collection.USERS, {
          _id: userId,
          shame: [{ game_id: gameId, date: new Date(date) }],
        });
      } catch (error) {
        const errFull =
          error instanceof Error
            ? error
            : new Error("addShamefulUser: Unknown error");
        // eslint-disable-next-line no-console
        console.error(errFull);
        setError(errFull);
      } finally {
        setLoading(false);
      }
    };

    return {
      addShamefulUser: _addShamefulUser,
      cancelGame: (gameId, userId, date, options) => {
        const gamePastThreshold =
          Date.now() > Date.parse(date) - CANCELLATION_THRESHOLD_MS;

        openDialog({
          variant: DialogVariant.CANCEL,
          title: "Cancel game?",
          content:
            options?.bypassThreshold !== true && gamePastThreshold ? (
              <div>
                <h3>Whoa whoa whoa!</h3>
                <p>
                  It's past the cancellation threshold of 12 hours. What are you
                  doing!?
                </p>
                <strong>Don't be a dick.</strong> If this isn't an emergency and
                you're just too hungover because you're weak, then suck it up
                and come play!{" "}
              </div>
            ) : (
              <div>
                <h3>Heads up!</h3>
                <p>Are you sure you want to cancel and drop your spot?</p>
              </div>
            ),
          action: async () => {
            try {
              setLoading(true);
              setError(null);

              const newGames = await _cancelGame(games, gameId, userId);
              setGames(newGames);

              if (options?.bypassThreshold !== true && gamePastThreshold) {
                void addShamefulUser(gameId, userId, date);
              }

              openDialog();
            } catch (error) {
              const errFull =
                error instanceof Error
                  ? error
                  : new Error("cancelGame: Unknown error");
              // eslint-disable-next-line no-console
              console.error(errFull);
              setError(errFull);
            } finally {
              setLoading(false);
            }
          },
        });
      },
      signupForGame: async (game, userId) => {
        try {
          setError(null);
          setLoading(true);
          // Can't submit w.o valid player but type safety
          if (game === undefined) {
            throw new Error("signupForGame: Game doesn't exist!");
          }

          const newGames = await _dbSignup({
            ...game,
            players: [...game.players, userId],
          });

          setGames(newGames);
        } catch (error) {
          const errFull =
            error instanceof Error
              ? error
              : new Error("signupForGame: Unknown error");
          // eslint-disable-next-line no-console
          console.error(errFull);
          setError(errFull);
        } finally {
          setLoading(false);
        }
      },
      updateUser: async (_user) => {
        setError(null);
        setLoading(true);
        try {
          if (!isValidUserUpdate(_user)) {
            throw new Error(
              "User update error: Fields invalid! Check and try again.",
            );
          }
          const { error } = await dbAuth("update", _user);

          if (error !== null) {
            throw error;
          }

          setUser(_user);
        } catch (err) {
          const errChecked =
            err instanceof Error ? err : new Error("updateUser: Unknown error");
          // eslint-disable-next-line no-console
          console.error(errChecked);
          setError(errChecked);
        } finally {
          setLoading(false);
        }
      },
    };
  }, [games, openDialog, setGames, setUser]);

  return (
    <ActionContext.Provider
      value={{
        addShamefulUser,
        cancelGame,
        signupForGame,
        updateUser,
        loading,
        error: errorState,
      }}
    >
      {children}
    </ActionContext.Provider>
  );
}
