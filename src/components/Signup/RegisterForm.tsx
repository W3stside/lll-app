import type { Dispatch, SetStateAction } from "react";

import { GREEN_TW, RED_TW } from "@/constants/colours";
import { PASSWORD_MIN_LENGTH, PHONE_MIN_LENGTH } from "@/constants/signups";
import type { INewSignup } from "@/types/users";
import { cn } from "@/utils/tailwind";

const PasswordValidity = {
  TOO_SHORT: (input: string) =>
    `( ¬ _¬) missing ${PASSWORD_MIN_LENGTH - input.length} character(s)`,
  VALID: "(⌐□_□) nice",
} as const;

const PhoneNumberValidity = {
  TOO_SHORT: (input: string) =>
    `( ¬ _¬) missing ${PHONE_MIN_LENGTH - input.length} numbers`,
  VALID: "(⌐□_□) nice",
} as const;

function _validatePassword(password?: string): string | null {
  if (password === undefined) {
    return null;
  } else if (password.length < PASSWORD_MIN_LENGTH) {
    return PasswordValidity.TOO_SHORT(password);
  }
  return PasswordValidity.VALID;
}

function _validatePhoneNumber(phoneNumber?: string): string | null {
  if (phoneNumber === undefined) {
    return null;
  } else if (phoneNumber.length < PHONE_MIN_LENGTH) {
    return PhoneNumberValidity.TOO_SHORT(phoneNumber);
  }
  return PhoneNumberValidity.VALID;
}
export interface IRegisterForm {
  playerStore: [
    Partial<INewSignup>,
    Dispatch<SetStateAction<Partial<INewSignup>>>,
  ];
  isLogin?: boolean;
  handleAction: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
}

export function RegisterForm({
  playerStore: [player, setPlayer],
  isLogin = false,
  handleAction,
}: IRegisterForm) {
  const passwordValidation = _validatePassword(player.password);
  const phoneNumberValidation = _validatePhoneNumber(player.phone_number);
  return (
    <div className="container flex flex-col items-center gap-y-2 p-4 w-full">
      <div className="flex flex-col items-center gap-y-2 p-2 w-full [&>input]:h-12">
        <form className="w-full" onSubmit={handleAction}>
          {!isLogin && (
            <>
              <input
                type="text"
                required
                autoComplete="first-name"
                value={player.first_name}
                onChange={(e) => {
                  setPlayer((prev) => ({
                    ...prev,
                    first_name: e.target.value,
                  }));
                }}
                placeholder="First name"
              />
              <input
                type="text"
                required
                className="my-[26px]"
                autoComplete="last-name"
                value={player.last_name}
                onChange={(e) => {
                  setPlayer((prev) => ({
                    ...prev,
                    last_name: e.target.value,
                  }));
                }}
                placeholder="Last name"
              />
            </>
          )}
          <input
            type="number"
            required
            autoComplete="phone-number"
            value={player.phone_number}
            onChange={(e) => {
              const targetAsNumber = Number(e.target.value);
              if (isNaN(targetAsNumber)) return;

              setPlayer((prev) => ({
                ...prev,
                phone_number: e.target.value,
              }));
            }}
            placeholder={
              isLogin ? "351961666666" : "351961666666 (full phone number)"
            }
          />
          {!isLogin && (
            <div
              className={cn("min-h-[26px] my-1 px-2 py-1", {
                invisible:
                  player.phone_number === "" ||
                  player.phone_number === undefined,
                [GREEN_TW]: phoneNumberValidation === PhoneNumberValidity.VALID,
                [RED_TW]:
                  phoneNumberValidation ===
                  PhoneNumberValidity.TOO_SHORT(player.phone_number ?? ""),
              })}
            >
              {phoneNumberValidation}
            </div>
          )}
          <input
            type="password"
            required
            value={player.password}
            onChange={(e) => {
              setPlayer((prev) => ({
                ...prev,
                password: e.target.value,
              }));
            }}
            placeholder={
              isLogin
                ? "password"
                : `password (min. ${PASSWORD_MIN_LENGTH} characters)`
            }
          />
          {!isLogin && (
            <div
              className={cn("min-h-[26px] my-1 px-2 py-1", {
                invisible:
                  player.password === "" || player.password === undefined,
                [GREEN_TW]: passwordValidation === PasswordValidity.VALID,
                [RED_TW]:
                  passwordValidation ===
                  PasswordValidity.TOO_SHORT(player.password ?? ""),
              })}
            >
              {passwordValidation}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
