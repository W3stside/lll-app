/* eslint-disable no-console */
import { useState, useEffect } from "react";

import { USER_INFO_KEY } from "@/constants/storage";
import type { IBaseSignup } from "@/types/signups";

export function useStorageUser() {
  const [user, setUser] = useState<IBaseSignup>();

  useEffect(() => {
    const storedUser = localStorage.getItem(USER_INFO_KEY);
    if (storedUser !== null) {
      const parsedUser = JSON.parse(storedUser) as unknown;
      if (
        typeof parsedUser === "object" &&
        parsedUser !== null &&
        "first_name" in parsedUser &&
        "last_name" in parsedUser &&
        "phone_number" in parsedUser
      ) {
        setUser(parsedUser as IBaseSignup);
      } else {
        console.error("Invalid user data in localStorage", parsedUser);
      }
    }
  }, []);

  return user;
}
