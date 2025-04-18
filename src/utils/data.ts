import { sortDaysOfWeek } from "./sort";

import type { IBaseUser, IGame, IUser } from "@/types/users";

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
  return sortDaysOfWeek(games).reduce<Partial<Record<IGame["day"], IGame[]>>>(
    (acc, game) => ({
      ...acc,
      [game.day]: [...(acc[game.day] ?? []), game],
    }),
    {},
  );
}

export function checkPlayerIsUser(player?: IBaseUser, user?: IBaseUser) {
  if (!player || !user) return false;

  return (
    player.first_name === user.first_name &&
    player.last_name === user.last_name &&
    player.phone_number === user.phone_number
  );
}
