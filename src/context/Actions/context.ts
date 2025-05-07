import type { ObjectId } from "mongodb";
import { createContext, useContext } from "react";

import type { IGame, IUser, IUserSafe } from "@/types/users";

export interface ISignupForGameArgs {
  gameId: ObjectId;
  userId: ObjectId;
}

export interface IAddShamefulUserArgs extends ISignupForGameArgs {
  date: string;
}

export interface ICancelGameArgs extends IAddShamefulUserArgs {
  options?: { bypassThreshold?: boolean };
}

export interface IActionContext {
  addShamefulUser: (args: IAddShamefulUserArgs) => Promise<IUser>;
  isAddShamefulUserLoading: boolean;
  addShamefulUserError: Error | null;
  cancelGame: (args: ICancelGameArgs) => void;
  isCancelLoading: boolean;
  cancelError: Error | null;
  signupForGame: (args: ISignupForGameArgs) => Promise<IGame[]>;
  isSignupLoading: boolean;
  signupError: Error | null;
  updateUser: (user: IUserSafe) => Promise<IUserSafe>;
  isUpdateUserLoading: boolean;
  updateUserError: Error | null;
}

export const ActionContext = createContext<IActionContext | undefined>(
  undefined,
);

export const useActions = () => {
  const context = useContext(ActionContext);
  if (context === undefined) {
    throw new Error("useActions must be used within a ActionsProvider");
  }

  return context;
};
