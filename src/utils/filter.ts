import type { IGame, IUser } from "@/types";

export function filterUser(user: IUser, searchFilter: string) {
  if (searchFilter === "") return true;

  const fullName = `${user.first_name} ${user.last_name}`;
  const searchTerm = searchFilter.toLowerCase();

  return (
    fullName.toLowerCase().includes(searchTerm) ||
    user.phone_number.includes(searchTerm)
  );
}

export function filterGame(game: IGame, date: Date, searchFilter: string) {
  const fullInfo = `${game.day} ${game.time} ${game.location} ${date.toUTCString()}`;
  const searchTerm = searchFilter.toLowerCase();
  return fullInfo.toLowerCase().includes(searchTerm);
}
