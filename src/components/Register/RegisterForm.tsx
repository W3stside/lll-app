import { RegisterError } from "./RegisterError";

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
  TOO_SHORT: (input: string) =>
    `( ¬ _¬) missing ${PHONE_MIN_LENGTH - input.length} numbers`,
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
  } else if (phoneNumber.length < PHONE_MIN_LENGTH) {
    return _PhoneNumberValidity.TOO_SHORT(phoneNumber);
  }
  return _PhoneNumberValidity.VALID;
}

export interface IRegisterForm {
  isLogin?: boolean;
  password: string | undefined;
  setPassword: React.Dispatch<React.SetStateAction<string>> | null;
  handleAction: (
    e: React.FormEvent<HTMLFormElement>,
    password: string | undefined,
  ) => Promise<void>;
}

export function RegisterForm({
  isLogin = false,
  password,
  setPassword,
  handleAction,
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
          onSubmit={async (e) => {
            await handleAction(e, password);
            setPassword?.("");
          }}
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
              type="number"
              required
              autoComplete="tel"
              value={user.phone_number}
              className={INPUT_CLASS}
              onChange={(e) => {
                const targetAsNumber = Number(e.target.value);
                if (isNaN(targetAsNumber)) return;

                setUser((prev) => ({
                  ...prev,
                  phone_number: e.target.value,
                }));
              }}
              placeholder={
                isLogin ? "351961666666" : "351961666666 (phone number)"
              }
            />
            {!isLogin && (
              <RegisterError
                status={phoneNumberValidation}
                property={user.phone_number}
                validator={_PhoneNumberValidity}
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
                    : `password (min. ${PASSWORD_MIN_LENGTH} characters)`
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
        </form>
      </div>
    </div>
  );
}
