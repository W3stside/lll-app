import { GREEN_TW, RED_TW } from "@/constants/colours";
import { PASSWORD_MIN_LENGTH, PHONE_MIN_LENGTH } from "@/constants/signups";
import { useUser } from "@/context/User/context";
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
  isLogin?: boolean;
  password: string;
  setPassword: React.Dispatch<React.SetStateAction<string>>;
  handleAction: (
    e: React.FormEvent<HTMLFormElement>,
    password: string,
  ) => Promise<void>;
}

export function RegisterForm({
  isLogin = false,
  password,
  setPassword,
  handleAction,
}: IRegisterForm) {
  const { user, setUser } = useUser();

  const passwordValidation = _validatePassword(password);
  const phoneNumberValidation = _validatePhoneNumber(user.phone_number);

  return (
    <div className="container flex flex-col items-center gap-y-2 p-4 w-full">
      <div className="flex flex-col items-center gap-y-2 p-2 w-full [&>input]:h-12">
        <form
          className="w-full"
          onSubmit={async (e) => {
            await handleAction(e, password);
            setPassword("");
          }}
        >
          {!isLogin && (
            <>
              <input
                type="text"
                required
                autoComplete="first-name"
                value={user.first_name}
                onChange={(e) => {
                  setUser((prev) => ({
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
                value={user.last_name}
                onChange={(e) => {
                  setUser((prev) => ({
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
            value={user.phone_number}
            onChange={(e) => {
              const targetAsNumber = Number(e.target.value);
              if (isNaN(targetAsNumber)) return;

              setUser((prev) => ({
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
                invisible: user.phone_number === "",
                [GREEN_TW]: phoneNumberValidation === PhoneNumberValidity.VALID,
                [RED_TW]:
                  phoneNumberValidation ===
                  PhoneNumberValidity.TOO_SHORT(user.phone_number),
              })}
            >
              {phoneNumberValidation}
            </div>
          )}
          <input
            type="password"
            required
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
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
                invisible: password === "",
                [GREEN_TW]: passwordValidation === PasswordValidity.VALID,
                [RED_TW]:
                  passwordValidation === PasswordValidity.TOO_SHORT(password),
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
