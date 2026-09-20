import { useCallback, useEffect, useMemo, useState } from "react";

import { GAME_TIME_ZONE } from "@/constants/date";
import { OPEN_SPOTS_DISMISSED_KEY } from "@/constants/notifications";
import { useGames } from "@/context/Games/context";
import { GameStatus, type IGame } from "@/types";
import { nowInTimeZone } from "@/utils/date";
import { getOpenSpots } from "@/utils/games";
import {
  gameNeedsPlayers,
  getOpenSpotsAlertKey,
  isInOpenSpotsAlertWindow,
} from "@/utils/openSpots";

export interface IOpenSpotsAlert {
  key: string;
  game: IGame;
  openSpots: number;
}

// The banner disappears on its own once the game starts, so a dismissal only
// needs to outlive its week
const DISMISSAL_TTL_MS = 8 * 24 * 60 * 60 * 1000;
// Re-evaluated every minute so the banner appears at 07:30 without a reload
const TICK_MS = 60 * 1000;

type Dismissals = Record<string, string>;

function _readDismissals(): Dismissals {
  try {
    const raw = window.localStorage.getItem(OPEN_SPOTS_DISMISSED_KEY);
    if (raw === null) return {};

    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return {};

    // Prune old weeks so the entry doesn't grow forever
    const cutoff = Date.now() - DISMISSAL_TTL_MS;
    return Object.fromEntries(
      Object.entries(parsed as Record<string, unknown>).filter(
        ([, dismissedAt]) =>
          typeof dismissedAt === "string" && Date.parse(dismissedAt) > cutoff,
      ),
    ) as Dismissals;
  } catch (err) {
    // Storage blocked or corrupted: nothing is dismissed this visit
    return {};
  }
}

function _writeDismissals(dismissals: Dismissals): void {
  try {
    window.localStorage.setItem(
      OPEN_SPOTS_DISMISSED_KEY,
      JSON.stringify(dismissals),
    );
  } catch (err) {
    // Worst case the banner comes back next visit
  }
}

/**
 * Games that still have confirmed spots free, from 07:30 the day before until
 * kick-off (never Monday games). Same rules as the 07:30 push, evaluated live
 * from the games context so a signup makes the banner go away.
 */
export function useOpenSpotsAlerts(signupOpen: boolean) {
  const { gamesByDay } = useGames();
  // null until mounted: the server can't know the client's clock, and a
  // different first render would break hydration
  const [now, setNow] = useState<Date | null>(null);
  const [dismissals, setDismissals] = useState<Dismissals>({});

  useEffect(() => {
    setDismissals(_readDismissals());

    const tick = () => {
      setNow(nowInTimeZone(GAME_TIME_ZONE));
    };
    tick();
    const timer = setInterval(tick, TICK_MS);

    return () => {
      clearInterval(timer);
    };
  }, []);

  const alerts = useMemo<IOpenSpotsAlert[]>(() => {
    if (now === null || !signupOpen) return [];

    return Object.values(gamesByDay)
      .flat()
      .flatMap((game) => {
        // `date` is this week's occurrence in the same frame as `now`
        const gameDate = new Date(game.date);

        if (
          game.status === GameStatus.PAST ||
          !gameNeedsPlayers(game) ||
          !isInOpenSpotsAlertWindow(gameDate, now)
        ) {
          return [];
        }

        const key = getOpenSpotsAlertKey(game._id.toString(), gameDate);
        if (key in dismissals) return [];

        return [{ key, game, openSpots: getOpenSpots(game) }];
      });
  }, [dismissals, gamesByDay, now, signupOpen]);

  const dismiss = useCallback((key: string) => {
    setDismissals((current) => {
      const next = { ...current, [key]: new Date().toISOString() };
      _writeDismissals(next);
      return next;
    });
  }, []);

  return { alerts, dismiss };
}
