import { useState } from "react";

import { UserContext } from "./context";

import type { IUserSafe } from "@/types/users";

interface IUserProvider {
  children: React.ReactNode;
}

export const DEFAULT_USER: IUserSafe = {
  _id: undefined,
  createdAt: undefined,
  first_name: "",
  last_name: "",
  phone_number: "",
  role: undefined,
  shame: [],
};

export function UserProvider({ children }: IUserProvider) {
  const [user, setUser] = useState<IUserSafe>(DEFAULT_USER);

  return (
    <UserContext.Provider
      value={{
        user,
        setUser,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}
