import { useMemo, useState } from "react";

import { GamesContext } from "./context";

import type { IGame } from "@/types/users";
import { groupGamesByDay } from "@/utils/data";

interface IGamesProvider {
  children: React.ReactNode;
  initialState: IGame[];
}

export function GamesProvider({ children, initialState = [] }: IGamesProvider) {
  const [games, setGames] = useState<IGame[]>(initialState);

  const gamesByDay = useMemo(() => groupGamesByDay(games), [games]);

  return (
    <GamesContext.Provider value={{ games, gamesByDay, setGames }}>
      {children}
    </GamesContext.Provider>
  );
}
