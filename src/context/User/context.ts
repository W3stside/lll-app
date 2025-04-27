import { createContext, useContext } from "react";

import type { IUserSafe } from "@/types/users";

interface IUserContext {
  user: IUserSafe;
  setUser: React.Dispatch<React.SetStateAction<IUserSafe>>;
}

export const UserContext = createContext<IUserContext | undefined>(undefined);

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a DialogProvider");
  }

  return context;
};
