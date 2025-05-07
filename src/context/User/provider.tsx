import { useState } from "react";

import { type IUserContext, UserContext } from "./context";

import type { IUserSafe } from "@/types/users";

interface IUserProvider {
  children: React.ReactNode;
  initialState?: IUserContext["user"];
}

export const DEFAULT_USER: IUserSafe & { registered_games?: string[] } = {
  _id: undefined,
  createdAt: undefined,
  first_name: "",
  last_name: "",
  phone_number: "",
  role: undefined,
  shame: [],
  avatarUrl: null,
};

export function UserProvider({
  children,
  initialState = DEFAULT_USER,
}: IUserProvider) {
  const [user, setUser] = useState<IUserContext["user"]>({
    ...DEFAULT_USER,
    ...initialState,
  });

  return (
    <UserContext.Provider
      value={{
        user,
        setUser,
        error,
        isLoading,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}
