import { Loader } from "../ui";
import { type IRegisterForm, RegisterForm } from "./RegisterForm";

import type { INewSignup } from "@/types/users";
import { isValidLogin, isValidNewSignup } from "@/utils/signup";

interface IRegisterUser extends IRegisterForm {
  isLoggedIn: boolean;
  isLogin?: boolean;
  loading: boolean;
  label: string;
  title?: string;
  handleAction: (e: React.FormEvent) => Promise<void>;
  handleLogout?: (e: React.FormEvent) => Promise<void>;
}

export function RegisterUser({
  loading,
  label,
  title = "Register to play",
  playerStore,
  isLoggedIn,
  isLogin = false,
  handleAction,
  handleLogout,
}: IRegisterUser) {
  const [player] = playerStore;
  return (
    <div className="flex flex-col items-center mt-auto mb-8 w-full gap-y-6">
      <div className="container-header !h-auto !text-md p-1 w-full -mb-3.5">
        <span className="mr-2">{title}</span>
      </div>
      <RegisterForm
        handleAction={handleAction}
        playerStore={playerStore}
        isLogin={isLogin}
      />
      <button
        className="w-full lg:w-[350px] text-2xl p-4 justify-center"
        disabled={
          loading || !isLogin
            ? !isValidNewSignup(player as INewSignup)
            : !isValidLogin(player)
        }
        onClick={
          isLoggedIn && handleLogout !== undefined ? handleLogout : handleAction
        }
      >
        {!loading ? label : <Loader />}
      </button>
    </div>
  );
}
