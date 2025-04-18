import { useCallback, useState } from "react";

import type { ISignups } from "@/pages/signup";
import type { Signup, IGame } from "@/types/signups";
import { getNextDate } from "@/utils/date";
import { dbRequest } from "@/utils/dbRequest";
import { isValidPlayer } from "@/utils/signup";

interface IUseSignup {
  games: ISignups["gamesByDay"];
  player: Partial<Signup>;
  initialState: Signup[];
}

export function useSignup({ player, games, initialState }: IUseSignup) {
  const [loading, setLoading] = useState(false);
  const [signups, setSignups] = useState(initialState);

  const dbSignup = useCallback(async (request: Omit<Signup, "_id">) => {
    setLoading(true);
    try {
      await dbRequest("create", "signups", request);
      const { data } = await dbRequest<Signup[]>("get", "signups");
      setSignups(data);
    } catch (e) {
      throw new Error(
        e instanceof Error ? e.message : "Unknown error occurred.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSignup = useCallback(
    async (day: IGame["day"]) => {
      const game = games[day].find((g) => g.game_id === player.game_id);
      // Can't submit w.o valid player but type safety
      if (!isValidPlayer(player) || !game) return;

      await dbSignup({
        ...player,
        day,
        date: getNextDate(game.day, game.time, "WET").toUTCString(),
      });
    },
    [dbSignup, games, player],
  );

  return {
    signupStore: [signups, setSignups],
    loadingStore: [loading, setLoading],
    handleDbSignup: handleSignup,
  } as const;
}
