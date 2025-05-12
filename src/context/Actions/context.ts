import { createContext, useContext } from "react";

import type { IUserSafe } from "@/types/users";

export interface ISignupForGameArgs {
  gameId: string;
  userId: string;
}

export interface IAddShamefulUserArgs extends ISignupForGameArgs {
  date: string;
}

export interface ICancelGameArgs extends IAddShamefulUserArgs {
  options?: { bypassThreshold?: boolean };
}

export interface IActionContext {
  addShamefulUser: (args: IAddShamefulUserArgs) => Promise<void>;
  isAddShamefulUserLoading: boolean;
  addShamefulUserError: Error | null;
  cancelGame: (args: ICancelGameArgs) => void;
  isCancelLoading: boolean;
  cancelError: Error | null;
  signupForGame: (args: ISignupForGameArgs) => Promise<void>;
  isSignupLoading: boolean;
  signupError: Error | null;
  updateUser: (user: IUserSafe) => Promise<void>;
  isUpdateUserLoading: boolean;
  updateUserError: Error | null;
  registerUser: (password: string | undefined) => Promise<void>;
  isRegisterUserLoading: boolean;
  registerUserError: Error | null;
  loginUser: (password: string | undefined) => Promise<void>;
  isLoginUserLoading: boolean;
  loginUserError: Error | null;
  logoutUser: () => Promise<void>;
  isLogoutUserLoading: boolean;
  logoutUserError: Error | null;
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
