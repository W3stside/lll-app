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

// Twilio needs E.164 and we only prepend the "+", so the digits must already lead
// with a country code. Country codes never start with 0, so a leading 0 means a
// national format (07..., 00351...) that the SMS will never reach. Kept separate
// from isValidPhoneNumber because older accounts are stored with 00 prefixes and
// must still be able to log in.
const INTERNATIONAL_PHONE_REGEX = new RegExp(
  `^[1-9]\\d{${PHONE_MIN_LENGTH - 1},${PHONE_MAX_LENGTH - 1}}$`,
);
export function isValidInternationalPhoneNumber(
  phone_number?: number | string,
): boolean {
  return (
    phone_number !== undefined &&
    INTERNATIONAL_PHONE_REGEX.test(phone_number.toString())
  );
}

/**
 * E.164 ("+351...") for Twilio, or null when the stored number can't take a
 * text. Older accounts can be stored with a 00 international prefix.
 */
export function toE164(phone_number: string): string | null {
  const digits = phone_number.replace(/^\+/, "").replace(/^00/, "");
  return isValidInternationalPhoneNumber(digits) ? `+${digits}` : null;
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
    isValidInternationalPhoneNumber(player.phone_number) &&
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
