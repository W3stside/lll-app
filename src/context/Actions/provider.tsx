import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

import {
  ActionContext,
  type ISignupForGameArgs,
  type IAddShamefulUserArgs,
  type ICancelGameArgs,
} from "./context";
import { DialogVariant, useDialog } from "../Dialog/context";
import { useGames } from "../Games/context";
import { useUser } from "../User/context";

import { CANCELLATION_THRESHOLD_MS } from "@/constants/date";
import { Collection } from "@/types";
import type { IUser, IUserSafe } from "@/types/users";
import { dbAuth } from "@/utils/api/dbAuth";
import { dbRequest } from "@/utils/api/dbRequest";
import {
  isValidLogin,
  isValidNewSignup,
  isValidUserUpdate,
} from "@/utils/signup";

interface IActionProvider {
  children: React.ReactNode;
}

export function ActionProvider({ children }: IActionProvider) {
  const queryClient = useQueryClient();
  const { openDialog } = useDialog();
  const { games } = useGames();
  const { user, setUser } = useUser();

  const {
    mutateAsync: signupForGame,
    error: signupError,
    isPending: isSignupLoading,
  } = useMutation({
    mutationFn: async ({ gameId, userId }: ISignupForGameArgs) => {
      const game = games.find((g) => g._id.toString() === gameId);

      if (game === undefined) {
        throw new Error("Signup error: Game doesn't exist!");
      }

      await dbRequest("update", Collection.GAMES, {
        _id: gameId,
        newPlayerId: userId,
      });
    },
    async onSuccess() {
      // Invalidate and refetch
      await queryClient.invalidateQueries({
        queryKey: ["games"],
      });
    },
    mutationKey: ["game-signup"],
  });

  const {
    mutateAsync: addShamefulUser,
    error: addShamefulUserError,
    isPending: isAddShamefulUserLoading,
  } = useMutation({
    mutationFn: async ({ gameId, userId, date }: IAddShamefulUserArgs) => {
      const { error } = await dbRequest<IUser>("update", Collection.USERS, {
        _id: userId,
        shame: [{ game_id: gameId, date: new Date(date) }],
      });

      if (error !== null) throw error;
    },
    async onSuccess() {
      // Invalidate and refetch
      await queryClient.invalidateQueries({
        queryKey: ["users"],
      });
    },
    mutationKey: ["user-add-shame"],
  });

  const {
    mutateAsync: updateUser,
    error: updateUserError,
    isPending: isUpdateUserLoading,
  } = useMutation({
    mutationFn: async (_user: IUserSafe) => {
      try {
        if (!isValidUserUpdate(_user)) {
          throw new Error(
            "User update error: Fields invalid! Check and try again.",
          );
        }
        await dbAuth("update", _user);
      } catch (err) {
        throw err instanceof Error
          ? err
          : new Error("User update error: Unknown error");
      }
    },
    async onSuccess() {
      // Invalidate and refetch
      await queryClient.invalidateQueries({
        queryKey: ["users"],
      });
    },
    mutationKey: ["user-update"],
  });

  const {
    mutateAsync: _cancelGame,
    error: cancelError,
    isPending: isCancelLoading,
  } = useMutation({
    mutationFn: async ({ gameId, userId }: ICancelGameArgs) => {
      return await dbRequest("update", Collection.GAMES, {
        _id: gameId,
        cancelPlayerId: userId,
      });
    },
    async onSuccess(_, { gameId }) {
      // Invalidate and refetch
      await queryClient.invalidateQueries({
        queryKey: ["games"],
      });

      setUser((state) => ({
        ...state,
        registered_games: state.registered_games?.filter(
          (g) => g !== gameId.toString(),
        ),
      }));
    },
    mutationKey: ["game-cancel"],
  });

  const cancelGame = useCallback(
    ({
      gameId,
      userId,
      date,
      options: { bypassThreshold } = {},
    }: ICancelGameArgs) => {
      const isShameful =
        bypassThreshold !== true &&
        Date.now() > Date.parse(date) - CANCELLATION_THRESHOLD_MS;

      openDialog({
        variant: DialogVariant.CANCEL,
        title: "Cancel game?",
        content: (
          <>
            {isShameful ? (
              <div className="flex flex-col items-center gap-y-6">
                <h3>Whoa whoa whoa!</h3>
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
              <div className="flex flex-col items-center gap-y-6">
                <h3>Heads up!</h3>
                <p>Are you sure you want to cancel and drop your spot?</p>
              </div>
            )}
          </>
        ),
        action: async () => {
          await _cancelGame({
            gameId,
            userId,
            date,
          });

          if (isShameful) {
            void addShamefulUser({ gameId, userId, date });
          }

          openDialog();
        },
      });
    },
    [_cancelGame, addShamefulUser, openDialog],
  );

  const {
    mutateAsync: registerUser,
    error: registerUserError,
    isPending: isRegisterUserLoading,
  } = useMutation({
    mutationFn: async (password: string | undefined) => {
      try {
        if (!isValidNewSignup(user, password)) {
          throw new Error("Player is invalid. Check fields.");
        }

        await dbAuth("register", { ...user, password });
      } catch (error) {
        throw error instanceof Error ? error : new Error("Unknown error");
      }
    },
    async onSuccess() {
      // Invalidate and refetch
      await queryClient.invalidateQueries({
        queryKey: ["users"],
      });
    },
    mutationKey: ["user-register"],
  });

  const {
    mutateAsync: loginUser,
    error: loginUserError,
    isPending: isLoginUserLoading,
  } = useMutation({
    mutationFn: async (password: string | undefined) => {
      try {
        if (!isValidLogin(user, password)) {
          throw new Error(
            "Login fields are invalid. Please check and try again.",
          );
        }

        await dbAuth("login", { ...user, password });
      } catch (error) {
        throw error instanceof Error ? error : new Error("Unknown error");
      }
    },
    async onSuccess() {
      // Invalidate and refetch
      await queryClient.invalidateQueries({
        queryKey: ["users"],
      });
    },
    mutationKey: ["user-login"],
  });

  const {
    mutateAsync: logoutUser,
    error: logoutUserError,
    isPending: isLogoutUserLoading,
  } = useMutation({
    mutationFn: async () => {
      await dbAuth("logout");
    },
    async onSuccess() {
      // Invalidate and refetch
      await queryClient.invalidateQueries({
        queryKey: ["users"],
      });
    },
    mutationKey: ["user-logout"],
  });

  return (
    <ActionContext.Provider
      value={{
        addShamefulUser,
        isAddShamefulUserLoading,
        addShamefulUserError,
        cancelGame,
        isCancelLoading,
        cancelError,
        signupForGame,
        isSignupLoading,
        signupError,
        updateUser,
        isUpdateUserLoading,
        updateUserError,
        registerUser,
        registerUserError,
        isRegisterUserLoading,
        loginUser,
        loginUserError,
        isLoginUserLoading,
        logoutUser,
        logoutUserError,
        isLogoutUserLoading,
      }}
    >
      {children}
    </ActionContext.Provider>
  );
}
