import type { ErrorUser } from "./types";

import { RED_TW } from "@/constants/colours";

interface IAdminError {
  errors:
    | {
        [key in keyof ErrorUser]: string;
      }
    | null;
  errorKey: keyof ErrorUser;
}

export function AdminError({ errors, errorKey }: IAdminError) {
  return (
    errors !== null &&
    errors[errorKey] !== undefined && (
      <span className={`px-2 py-1 text-xs ${RED_TW}`}>{errors[errorKey]}</span>
    )
  );
}
