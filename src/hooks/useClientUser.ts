import { useState, useEffect } from "react";

import { POLLING_TIME } from "@/constants/api";
import type { IUser } from "@/types/users";
import { dbRequest } from "@/utils/dbRequest";

export function useClientUser(condition?: string) {
  const [user, setUser] = useState<IUser | undefined>();
  const [errorState, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      setError(null);
      try {
        const { data, error = null } = await dbRequest<IUser>("get", "me");

        if (error !== null) {
          throw error;
        }

        setUser(data);
      } catch (err) {
        setUser(undefined);
        setError(
          err instanceof Error ? err : new Error("Unknown error occurred."),
        );
      }
    };

    void fetchUser();

    const timeout = setTimeout(fetchUser, POLLING_TIME);

    return () => {
      clearTimeout(timeout);
    };
  }, [condition]);

  return { user, error: errorState, isLoading: user === undefined };
}
