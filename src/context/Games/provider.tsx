import { useMemo, useState } from "react";

import { GamesContext } from "./context";

import type { IGame } from "@/types";
import { groupGamesByDay } from "@/utils/data";
import { computeGameDate } from "@/utils/date";
import { computeGameStatus } from "@/utils/games";

interface IGamesProvider {
  children: React.ReactNode;
  initialState: IGame[];
}

export function GamesProvider({ children, initialState = [] }: IGamesProvider) {
  const [games, setGames] = useState<IGame[]>(initialState);

  const gamesByDay = useMemo(() => {
    const gamesAux = games.map<IGame>((g) => {
      const { gameStatus: status } = computeGameStatus(
        g,
        g.day,
        games
          .filter((allGames) => allGames.day === g.day)
          .sort(
            (a, b) =>
              Number(b.time.replace(":", "")) - Number(a.time.replace(":", "")),
          )[0],
      );
      return {
        ...g,
        date: computeGameDate(g.day, g.time, "WET").toISOString(),
        status,
      };
    });
    return groupGamesByDay(gamesAux);
  }, [games]);

  return (
    <GamesContext.Provider value={{ games, gamesByDay, setGames }}>
      {children}
    </GamesContext.Provider>
  );
}
