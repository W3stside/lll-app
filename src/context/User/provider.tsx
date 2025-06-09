import { useMemo, useState } from "react";

import { type IUserContext, UserContext } from "./context";

import type { IUser, IUserSafe } from "@/types";
import { groupUsersById } from "@/utils/data";

interface IUserProvider {
  children: React.ReactNode;
  initialState?: IUserContext["user"];
  initialStateUsers?: IUser[];
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
  initialStateUsers = [],
}: IUserProvider) {
  const [user, setUser] = useState<IUserContext["user"]>({
    ...DEFAULT_USER,
    ...initialState,
  });
  const [users, setUsers] = useState<IUser[]>(initialStateUsers);

  const usersById = useMemo(() => groupUsersById(users), [users]);

  return (
    <UserContext.Provider
      value={{
        user,
        users,
        usersById,
        setUser,
        setUsers,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}
