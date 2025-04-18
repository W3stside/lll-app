import { PHONE_MIN_LENGTH } from "@/constants/signups";
import type { INewSignup } from "@/types/users";

export function isValidNewSignup(
  player?: Partial<INewSignup>,
): player is INewSignup {
  return (
    player !== undefined &&
    player.password !== undefined &&
    player.password.length >= 8 &&
    player.phone_number !== undefined &&
    player.phone_number.length >= PHONE_MIN_LENGTH
  );
}

export function isValidLogin(
  player?: Partial<INewSignup>,
): player is INewSignup {
  return (
    player !== undefined &&
    player.password !== undefined &&
    player.phone_number !== undefined &&
    player.phone_number.length >= PHONE_MIN_LENGTH
  );
}
