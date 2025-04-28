import type { ObjectId } from "mongodb";
import { createContext, useContext } from "react";

import type { IGame, IUserSafe } from "@/types/users";

export interface IActionContext {
  loading: boolean;
  error: Error | null;
  addShamefulUser: (
    gameId: ObjectId,
    userId: ObjectId,
    date: Date | string,
  ) => Promise<void>;
  cancelGame: (gameId: ObjectId, userId: ObjectId, date: string) => void;
  signupForGame: (game: IGame | undefined, userId: ObjectId) => Promise<void>;
  updateUser: (user: IUserSafe) => Promise<void>;
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
