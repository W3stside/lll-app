import type { IUser } from "@/types/users";

export function filterUser(u: IUser, searchFilter: string) {
  const fullName = `${u.first_name} ${u.last_name}`;
  const searchTerm = searchFilter.toLowerCase();
  return (
    fullName.toLowerCase().includes(searchTerm) ||
    u.phone_number.includes(searchTerm)
  );
}
