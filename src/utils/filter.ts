import type { IUserSafe } from "@/types";

export function filterUser<U extends IUserSafe>(user: U, searchFilter: string) {
  if (searchFilter === "") return true;

  const fullName = `${user.first_name} ${user.last_name}`;
  const searchTerm = searchFilter.toLowerCase();

  return (
    fullName.toLowerCase().includes(searchTerm) ||
    user.phone_number.includes(searchTerm)
  );
}
