import { createContext, useContext } from "react";

import type { GamesByDay, IGame } from "@/types/users";

interface IGamesContext {
  games: IGame[];
  gamesByDay: GamesByDay;
  setGames: React.Dispatch<React.SetStateAction<IGame[]>>;
}

export const GamesContext = createContext<IGamesContext | undefined>(undefined);

export const useGames = () => {
  const context = useContext(GamesContext);
  if (context === undefined) {
    throw new Error("useGames must be used within a GamesProvider");
  }

  return context;
};
