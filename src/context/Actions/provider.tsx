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

const _dbGameSignup = async (gameId: ObjectId, newPlayerId: ObjectId) => {
  try {
    const {
      data: { games },
      error,
    } = await dbRequest<
      { _id: ObjectId; newPlayerId: ObjectId },
      {
        updatedGame: IGame;
        games: IGame[];
      }
    >("update", Collection.GAMES, {
      _id: gameId,
      newPlayerId,
    });

    if (error !== null) throw error;

    return games;
  } catch (e) {
    throw new Error(
      e instanceof Error ? e.message : "_dbGameSignup: Unknown error occurred.",
    );
  }
};

const _dbCancelGame = async (
  gameId: ObjectId,
  userId: ObjectId,
  isAdminCancel = false,
) => {
  try {
    const {
      data: { games },
      error,
    } = await dbRequest<
      {
        _id: ObjectId;
        cancelPlayerId: ObjectId;
        isAdminCancel: boolean;
      },
      { updatedGame: IGame; games: IGame[] }
    >("update", Collection.GAMES, {
      _id: gameId,
      cancelPlayerId: userId,
      isAdminCancel,
    });

    if (error !== null) throw error;

    return games;
  } catch (error) {
    const errFull =
      error instanceof Error
        ? error
        : new Error("_dbCancelGame: Unknown error occurred");

    // eslint-disable-next-line no-console
    console.error(errFull);

    throw errFull;
  }
};

export function ActionProvider({ children }: IActionProvider) {
  const [loading, setLoading] = useState(false);
  const [errorState, setError] = useState<Error | null>(null);

  const { user, setUser } = useUser();
  const { setGames } = useGames();
  const { openDialog } = useDialog();

  const {
    addShamefulUser,
    addShamefulUserWithDialog,
    cancelGame,
    signupForGame,
    updateUser,
  } = useMemo<
    Pick<
      IActionContext,
      | "addShamefulUser"
      | "addShamefulUserWithDialog"
      | "cancelGame"
      | "signupForGame"
      | "updateUser"
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
      addShamefulUserWithDialog: (gameId, userId, date) => {
        openDialog({
          variant: DialogVariant.CANCEL,
          title: "Shame player?",
          confirmLabel: "Shame them!",
          content: (
            <div className="flex flex-col items-center lg:items-start gap-y-4">
              <h5>Heads up!</h5>
              <p>
                Are you sure you want to shame this player and blast them on the
                wall? You should really only do this if they no-showed!
              </p>
            </div>
          ),
          action: () => {
            try {
              setLoading(true);
              setError(null);

              void addShamefulUser(gameId, userId, date);

              openDialog();
            } catch (error) {
              const errFull =
                error instanceof Error
                  ? error
                  : new Error("addShamefulUser: Unknown error");

              setError(errFull);
            } finally {
              setLoading(false);
            }
          },
        });
      },
      cancelGame: (gameId, userId, date, options) => {
        const gamePastThreshold =
          Date.now() > Date.parse(date) - CANCELLATION_THRESHOLD_MS;

        openDialog({
          variant: DialogVariant.CANCEL,
          title: "Cancel game?",
          content:
            options?.bypassThreshold !== true && gamePastThreshold ? (
              <div className="flex flex-col items-center lg:items-start gap-y-4">
                <h5>Whoa whoa whoa!</h5>
                <div>
                  <p>
                    It's past the cancellation threshold of 12 hours. What are
                    you doing!?
                  </p>
                  <strong>Don't be a dick.</strong> If this isn't an emergency
                  and you're just too hungover because you're weak, then suck it
                  up and come play!{" "}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center lg:items-start gap-y-4">
                <h5>Heads up!</h5>
                <p>
                  {options?.cancelMessage ??
                    "Are you sure you want to cancel and drop your spot?"}
                </p>
              </div>
            ),
          action: async () => {
            try {
              setLoading(true);
              setError(null);

              const newGames = await _dbCancelGame(
                gameId,
                userId,
                // Is admin cancel?
                user._id !== undefined &&
                  userId.toString() !== user._id.toString(),
              );
              setGames(newGames);

              // Remove the canceled game from the user's registered games
              setUser((state) => ({
                ...state,
                registered_games: user.registered_games?.filter(
                  (g) => g !== gameId.toString(),
                ),
              }));

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

          const newGames = await _dbGameSignup(game._id, userId);

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
  }, [openDialog, setGames, setUser, user._id, user.registered_games]);

  return (
    <ActionContext.Provider
      value={{
        addShamefulUser,
        addShamefulUserWithDialog,
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
