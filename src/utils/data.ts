import { sortDaysOfWeek } from "./sort";

import type { GamesByDay, IGame, IUser, IUserSafe } from "@/types/users";

export function groupUsersById(users: IUser[]) {
  return users.reduce<Record<string, IUser>>(
    (acc, user) => ({
      ...acc,
      [user._id.toString()]: user,
    }),
    {},
  );
}

export function groupGamesByDay(games: IGame[]) {
  return sortDaysOfWeek(games).reduce<GamesByDay>(
    (acc, game) => ({
      ...acc,
      [game.day]: [...(acc[game.day] ?? []), game].sort(
        (a, b) =>
          Number(a.time.replace(/:/g, "")) - Number(b.time.replace(/:/g, "")),
      ),
    }),
    {},
  );
}

export function checkPlayerIsUser(player?: IUserSafe, user?: IUserSafe) {
  if (player === undefined || user === undefined) return false;

  return player._id?.toString() === user._id?.toString();
}
