import type { ObjectId } from "mongodb";
import { useState, useMemo } from "react";
import { useDebounce } from "use-debounce";

import { MAX_SIGNUPS_PER_GAME } from "@/constants/signups";
import { GameStatus } from "@/types";
import type { GamesByDay, IUser } from "@/types/users";
import { computeGameStatus, getLastGame } from "@/utils/games";

const SEARCH_DEBOUNCE = 400;

interface IUseFilterGames {
  usersById: Record<string, IUser>;
  gamesByDay: GamesByDay;
  userId: ObjectId;
}

export enum GameFilters {
  MY_GAMES = "MY_GAMES",
  OPEN_GAMES = "OPEN_GAMES",
}

export function useFilterGames({
  usersById,
  gamesByDay,
  userId,
}: IUseFilterGames) {
  const [searchFilterRaw, setSearchFilter] = useState<string>("");
  const [searchFilter] = useDebounce(searchFilterRaw, SEARCH_DEBOUNCE, {
    leading: true,
  });

  const [filters, setFilter] = useState<GameFilters | undefined>(undefined);

  const flatGames = useMemo(
    () => Object.values(gamesByDay).flatMap((g) => [...g]),
    [gamesByDay],
  );

  const usersFlatSearched = useMemo(() => {
    const users = Object.values(usersById);
    return searchFilter === ""
      ? users
      : users.filter((u) => {
          const fullName = `${u.first_name} ${u.last_name}`;
          const searchTerm = searchFilter.toLowerCase();
          return (
            fullName.toLowerCase().includes(searchTerm) ||
            u.phone_number.includes(searchTerm)
          );
        });
  }, [searchFilter, usersById]);

  return useMemo(() => {
    let filteredGames = flatGames;
    const lastGameOfWeek = getLastGame(gamesByDay, flatGames);

    switch (filters) {
      case GameFilters.MY_GAMES:
        filteredGames = flatGames.filter((fg) =>
          fg.players.some((pId) => pId.toString() === userId.toString()),
        );
        break;
      case GameFilters.OPEN_GAMES:
        filteredGames = flatGames.filter(
          (fg) =>
            fg.players.length < MAX_SIGNUPS_PER_GAME &&
            computeGameStatus(flatGames, fg.day, lastGameOfWeek).gameStatus !==
              GameStatus.PAST,
        );
        break;
      default:
        filteredGames = flatGames;
        break;
    }

    return {
      filteredGames:
        searchFilter === ""
          ? filteredGames
          : filteredGames.filter((g) =>
              g.players.some((gId) =>
                usersFlatSearched.some(
                  (u) => u._id.toString() === gId.toString(),
                ),
              ),
            ),
      searchFilter: searchFilterRaw,
      filters,
      setSearchFilter,
      setFilter,
    };
  }, [
    filters,
    flatGames,
    gamesByDay,
    searchFilter,
    searchFilterRaw,
    userId,
    usersFlatSearched,
  ]);
}
