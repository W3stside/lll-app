import type { ReactNode } from "react";

import { RegisterError } from "./RegisterError";
import { Loader } from "../ui";

import {
  NAME_MIN_LENGTH,
  PASSWORD_MIN_LENGTH,
  PHONE_MIN_LENGTH,
} from "@/constants/signups";
import { useUser } from "@/context/User/context";

const VALID_MESSAGE = "(⌐□_□) nice";
const INPUT_CLASS = "pr-[95px]";

const _NameValidity = {
  TOO_SHORT: (input: string) =>
    `( ¬ _¬) missing ${NAME_MIN_LENGTH - input.length} character(s)`,
  VALID: VALID_MESSAGE,
} as const;

const _PasswordValidity = {
  TOO_SHORT: (input: string) =>
    `( ¬ _¬) missing ${PASSWORD_MIN_LENGTH - input.length} character(s)`,
  VALID: VALID_MESSAGE,
} as const;

const _PhoneNumberValidity = {
  INCORRECT_FORMAT: "( ¬ _¬) remove those 00s",
  TOO_SHORT: () => `Too short! Number has country code?`,
  VALID: VALID_MESSAGE,
} as const;

function _validateName(name?: string): string | null {
  if (name === undefined) {
    return null;
  } else if (name.length < NAME_MIN_LENGTH) {
    return _NameValidity.TOO_SHORT(name);
  }
  return _NameValidity.VALID;
}

function _validatePassword(password?: string): string | null {
  if (password === undefined) {
    return null;
  } else if (password.length < PASSWORD_MIN_LENGTH) {
    return _PasswordValidity.TOO_SHORT(password);
  }
  return _PasswordValidity.VALID;
}

function _validatePhoneNumber(phoneNumber?: string): string | null {
  if (phoneNumber === undefined) {
    return null;
  } else if (!/^(?!\+|00)\d+$/.test(phoneNumber)) {
    return _PhoneNumberValidity.INCORRECT_FORMAT;
  } else if (phoneNumber.length < PHONE_MIN_LENGTH) {
    return _PhoneNumberValidity.TOO_SHORT();
  }
  return _PhoneNumberValidity.VALID;
}

export interface IRegisterForm {
  isLogin?: boolean;
  password: string | undefined;
  loading: boolean;
  label: ReactNode;
  disabled: boolean;
  setPassword: React.Dispatch<React.SetStateAction<string>> | null;
  handleAction: (
    e: React.FormEvent<HTMLFormElement>,
    password: string | undefined,
  ) => Promise<void>;
  handleLogout?: (e: React.FormEvent) => Promise<void>;
}

export function RegisterForm({
  isLogin = false,
  password,
  loading,
  label,
  disabled,
  setPassword,
  handleAction,
  handleLogout,
}: IRegisterForm) {
  const { user, setUser } = useUser();

  const firstNameValidation = _validateName(user.first_name);
  const lastNameValidation = _validateName(user.last_name);
  const passwordValidation = _validatePassword(password);
  const phoneNumberValidation = _validatePhoneNumber(user.phone_number);

  return (
    <div className="container flex flex-col items-center gap-y-2 p-4 w-full">
      <div className="flex flex-col items-center gap-y-2 p-2 w-full [&>input]:h-12">
        <form
          className="w-full"
          onSubmit={
            handleLogout !== undefined
              ? handleLogout
              : async (e) => {
                  await handleAction(e, password);
                }
          }
        >
          {!isLogin && (
            <>
              <div className="flex items-center relative">
                <input
                  type="text"
                  required
                  autoComplete="first-name"
                  value={user.first_name}
                  className={INPUT_CLASS}
                  onChange={(e) => {
                    setUser((prev) => ({
                      ...prev,
                      first_name: e.target.value,
                    }));
                  }}
                  placeholder="First name"
                />
                <RegisterError
                  status={firstNameValidation}
                  property={user.first_name}
                  validator={_NameValidity}
                />
              </div>
              <div className="flex items-center relative">
                <input
                  type="text"
                  required
                  autoComplete="last-name"
                  value={user.last_name}
                  className={INPUT_CLASS}
                  onChange={(e) => {
                    setUser((prev) => ({
                      ...prev,
                      last_name: e.target.value,
                    }));
                  }}
                  placeholder="Last name"
                />
                <RegisterError
                  status={lastNameValidation}
                  property={user.last_name}
                  validator={_NameValidity}
                />
              </div>
            </>
          )}
          <div className="flex items-center relative">
            <input
              type="text"
              required
              autoComplete="tel"
              value={user.phone_number}
              onChange={(e) => {
                if (!/^(?!.*[+\-*/])\d*$/.test(e.target.value)) {
                  return;
                }

                setUser((prev) => ({
                  ...prev,
                  phone_number: e.target.value,
                }));
              }}
              placeholder={
                isLogin
                  ? "phone number (351961616000)"
                  : "<country><phone_number> (e.g. 351961616000)"
              }
            />
            {!isLogin && (
              <RegisterError
                status={phoneNumberValidation}
                property={user.phone_number}
                validator={_PhoneNumberValidity}
                className="max-w-[140px]"
              />
            )}
          </div>
          {setPassword !== null && (
            <div className="flex items-center relative">
              <input
                type="password"
                autoComplete="new-password"
                required
                value={password}
                className={INPUT_CLASS}
                onChange={(e) => {
                  setPassword(e.target.value);
                }}
                placeholder={
                  isLogin
                    ? "password"
                    : `Password (min. ${PASSWORD_MIN_LENGTH} characters)`
                }
              />
              {password !== undefined && !isLogin && (
                <RegisterError
                  status={passwordValidation}
                  property={password}
                  validator={_PasswordValidity}
                />
              )}
            </div>
          )}
          <button
            className="mt-4 w-full text-2xl p-4 justify-center"
            disabled={loading || disabled}
            type="submit"
          >
            {!loading ? label : <Loader />}
          </button>
        </form>
      </div>
    </div>
  );
}
