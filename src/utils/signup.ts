import {
  NAME_MIN_LENGTH,
  PASSWORD_MIN_LENGTH,
  PHONE_MAX_LENGTH,
  PHONE_MIN_LENGTH,
} from "@/constants/signups";
import type { INewSignup } from "@/types/users";

const PHONE_REGEX = new RegExp(
  `^\\d{${PHONE_MIN_LENGTH},${PHONE_MAX_LENGTH}}$`,
);
export function isValidPhoneNumber(phone_number?: number | string): boolean {
  return (
    phone_number !== undefined && PHONE_REGEX.test(phone_number.toString())
  );
}

export function isValidUserUpdate(
  player: Partial<INewSignup> | null,
): player is INewSignup {
  return (
    player !== null &&
    player.first_name !== undefined &&
    player.first_name.length >= NAME_MIN_LENGTH &&
    player.last_name !== undefined &&
    player.last_name.length > 0 &&
    isValidPhoneNumber(player.phone_number)
  );
}

export function isValidNewSignup(
  player: Partial<INewSignup> | null,
  password: string | undefined,
): player is INewSignup {
  return (
    isValidUserUpdate(player) &&
    password !== undefined &&
    password.toString().length >= PASSWORD_MIN_LENGTH
  );
}

export function isValidLogin(
  player: Partial<INewSignup> | null,
  password: string | undefined,
): player is INewSignup {
  return (
    player !== null &&
    password !== undefined &&
    password.toString().length >= PASSWORD_MIN_LENGTH &&
    isValidPhoneNumber(player.phone_number)
  );
}
