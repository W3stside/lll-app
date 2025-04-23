import type { ObjectId } from "mongodb";
import { useCallback, useMemo, useState } from "react";

import { Collection } from "@/types";
import type { IUser, IGame } from "@/types/users";
import { groupGamesByDay } from "@/utils/data";
import { dbRequest } from "@/utils/dbRequest";

interface IUseSignup {
  gamesInitial: IGame[];
  user: Partial<IUser> & { _id: ObjectId };
}

export function useGameSignup({ gamesInitial, user }: IUseSignup) {
  const [loading, setLoading] = useState(false);
  const [games, setGames] = useState(gamesInitial);

  const dbSignup = useCallback(async (request: IGame) => {
    setLoading(true);

    try {
      await dbRequest("update", Collection.GAMES, request);
      const { data, error } = await dbRequest<IGame[]>("get", Collection.GAMES);

      if (error !== null) throw error;

      setGames(data);
    } catch (e) {
      throw new Error(
        e instanceof Error ? e.message : "Unknown error occurred.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const gamesByDay = useMemo(() => groupGamesByDay(games), [games]);

  const handleGameSignup = useCallback(
    async (game: IGame | undefined) => {
      // Can't submit w.o valid player but type safety
      if (game === undefined) return;

      await dbSignup({
        ...game,
        players: [...game.players, user._id],
      });
    },
    [dbSignup, user._id],
  );

  return {
    loading,
    gamesStore: [gamesByDay, setGames],
    handleGameSignup,
  } as const;
}
