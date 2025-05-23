import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";

import { POLLING_TIME } from "@/constants/api";
import { NAVLINKS_MAP } from "@/constants/links";
import { useUser } from "@/context/User/context";
import { DEFAULT_USER } from "@/context/User/provider";
import { Collection } from "@/types";
import type { IUser } from "@/types/users";
import { dbRequest } from "@/utils/api/dbRequest";

export function useClientUser(condition?: string) {
  const { user, setUser } = useUser();
  const [errorState, setError] = useState<Error | null>(null);

  const pathname = usePathname();

  useEffect(() => {
    let timeout: NodeJS.Timeout | undefined = undefined;

    // We're on login page, dont ping user data
    if (pathname === NAVLINKS_MAP.LOGIN) {
      clearTimeout(timeout);
    }
    // Else run polling logic
    else {
      const fetchUser = async () => {
        setError(null);
        try {
          const { data, error = null } = await dbRequest<IUser>(
            "get",
            Collection.ME,
          );

          if (error !== null) {
            throw error;
          }

          setUser(data);
        } catch (err) {
          setUser(DEFAULT_USER);
          setError(
            err instanceof Error ? err : new Error("Unknown error occurred."),
          );
        }
      };

      void fetchUser();

      timeout = setTimeout(fetchUser, POLLING_TIME);
    }

    return () => {
      clearTimeout(timeout);
    };
  }, [condition, pathname, setUser]);

  return {
    user: user.phone_number === "" ? undefined : user,
    error: errorState,
    isLoading: user.phone_number === "",
  };
}
