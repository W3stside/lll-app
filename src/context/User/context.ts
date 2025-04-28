import { createContext, useContext } from "react";

import type { IUserSafe } from "@/types/users";

export interface IUserContext {
  user: IUserSafe & { registered_games?: string[] };
  setUser: React.Dispatch<
    React.SetStateAction<IUserSafe & { registered_games?: string[] }>
  >;
}

export const UserContext = createContext<IUserContext | undefined>(undefined);

export const useUser = () => {
  const context = useContext(UserContext);

  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }

  return context;
};
