import { PASSWORD_MIN_LENGTH, PHONE_MIN_LENGTH } from "@/constants/signups";
import type { INewSignup } from "@/types/users";

export function isValidNewSignup(
  player: Partial<INewSignup>,
  password: string,
): player is INewSignup {
  return (
    player.first_name !== undefined &&
    player.first_name.length > 0 &&
    player.last_name !== undefined &&
    player.last_name.length > 0 &&
    password.toString().length >= PASSWORD_MIN_LENGTH &&
    player.phone_number !== undefined &&
    player.phone_number.length >= PHONE_MIN_LENGTH
  );
}

export function isValidLogin(
  player: Partial<INewSignup>,
  password: string,
): player is INewSignup {
  return (
    password.toString().length >= PASSWORD_MIN_LENGTH &&
    player.phone_number !== undefined &&
    player.phone_number.length >= PHONE_MIN_LENGTH
  );
}
