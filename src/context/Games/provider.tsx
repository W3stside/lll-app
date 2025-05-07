import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { GamesContext } from "./context";

import { Collection } from "@/types";
import type { IGame } from "@/types/users";
import { dbRequest } from "@/utils/api/dbRequest";
import { groupGamesByDay } from "@/utils/data";

interface IGamesProvider {
  children: React.ReactNode;
  initialState: IGame[];
}

export function GamesProvider({ children, initialState = [] }: IGamesProvider) {
  const { data: games, error } = useQuery({
    queryKey: ["games"],
    queryFn: async () => {
      try {
        const { data, error: dbError } = await dbRequest<IGame[]>(
          "get",
          Collection.GAMES,
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

  const gamesByDay = useMemo(() => groupGamesByDay(games), [games]);

  return (
    <GamesContext.Provider value={{ games, gamesByDay, error }}>
      {error && (
        <p className="text-xs p-2 m-0 bg-[var(--background-error)]">
          Games fetch error:{" "}
          <span className="p-1 bg-[var(--container-background-color)]">{`${error.message.slice(0, 50)}...`}</span>{" "}
          Please refresh the page.
        </p>
      )}
      {children}
    </GamesContext.Provider>
  );
}
