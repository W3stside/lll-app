import { createContext, useContext } from "react";

import type { IUser, IUserSafe } from "@/types";

export interface IUserContext {
  user: IUserSafe & { registered_games?: string[] };
  users: (IUserSafe & { registered_games?: string[] })[];
  usersById: Partial<Record<string, IUser>>;
  setUser: React.Dispatch<
    React.SetStateAction<IUserSafe & { registered_games?: string[] }>
  >;
  setUsers: React.Dispatch<React.SetStateAction<IUser[]>>;
}

export const UserContext = createContext<IUserContext | undefined>(undefined);

export const useUser = () => {
  const context = useContext(UserContext);

  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }

  return context;
};
