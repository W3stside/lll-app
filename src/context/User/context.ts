import {
  type Dispatch,
  type SetStateAction,
  createContext,
  useContext,
} from "react";

import type { IUserSafe } from "@/types/users";

export interface IUserContext {
  user: IUserSafe & { registered_games?: string[] };
  setUser: Dispatch<
    SetStateAction<IUserSafe & { registered_games?: string[] }>
  >;
  error: Error | null;
  isLoading: boolean;
}

export const UserContext = createContext<IUserContext | undefined>(undefined);

export const useUser = () => {
  const context = useContext(UserContext);

  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }

  return context;
};
