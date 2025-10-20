import { sortDaysOfWeek } from "./sort";

import {
  GameStatus,
  Role,
  type GamesByDay,
  type IGame,
  type IUser,
  type IUserSafe,
} from "@/types";

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
  return sortDaysOfWeek(games).reduce<GamesByDay>((acc, game) => {
    if (game.hidden === true) return acc;
    return {
      ...acc,
      [game.day]: [...(acc[game.day] ?? []), game].sort(
        (a, b) =>
          Number(a.time.replace(/:/g, "")) - Number(b.time.replace(/:/g, "")),
      ),
    };
  }, {});
}

export function checkPlayerCanCancel(
  player?: IUserSafe,
  user?: IUserSafe,
  status?: GameStatus,
): boolean {
  if (player === undefined || user === undefined || status === undefined) {
    return false;
  }

  const isSelf = player._id?.toString() === user._id?.toString();

  return (
    (user.role === Role.ADMIN && !isSelf) ||
    (status === GameStatus.UPCOMING && isSelf)
  );
}
