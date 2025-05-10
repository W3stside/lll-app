import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { type IUserContext, UserContext } from "./context";

import { Collection } from "@/types";
import type { IUser, IUserSafe } from "@/types/users";
import { dbRequest } from "@/utils/api/dbRequest";

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
  const {
    data: dbUser,
    error,
    isLoading,
  } = useQuery({
    queryKey: ["users-me"],
    queryFn: async () => {
      try {
        const { data, error: dbError } = await dbRequest<IUser | null>(
          "get",
          Collection.ME,
        );

        if (dbError !== null) throw dbError;

        return data;
      } catch (e) {
        const err = e instanceof Error ? e : new Error("Unknown error");
        throw err;
      }
    },
    initialData: initialState,
    initialDataUpdatedAt: 0,
  });

  const [user, setUser] = useState<IUserContext["user"]>({
    ...DEFAULT_USER,
    ...dbUser,
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
