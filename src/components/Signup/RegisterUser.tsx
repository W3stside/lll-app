import { useState } from "react";

import { Loader } from "../ui";
import { type IRegisterForm, RegisterForm } from "./RegisterForm";

import { useUser } from "@/context/User/context";
import { isValidLogin, isValidNewSignup } from "@/utils/signup";

interface IRegisterUser
  extends Omit<IRegisterForm, "password" | "setPassword"> {
  isLoggedIn: boolean;
  isLogin?: boolean;
  loading: boolean;
  label: string;
  title?: string;
  handleAction: (e: React.FormEvent, password: string) => Promise<void>;
  handleLogout?: (e: React.FormEvent) => Promise<void>;
}

export function RegisterUser({
  loading,
  label,
  title = "Register to play",
  isLoggedIn,
  isLogin = false,
  handleAction,
  handleLogout,
}: IRegisterUser) {
  const { user } = useUser();
  const [password, setPassword] = useState("");

  return (
    <div className="flex flex-col items-center mt-auto mb-8 w-full gap-y-6">
      <div className="container-header !h-auto !text-md p-1 w-full -mb-3.5">
        <span className="mr-2">{title}</span>
      </div>
      <RegisterForm
        handleAction={handleAction}
        password={password}
        setPassword={setPassword}
        isLogin={isLogin}
      />
      <button
        className="w-full lg:w-[350px] text-2xl p-4 justify-center"
        disabled={
          loading || !isLogin
            ? !isValidNewSignup(user, password)
            : !isValidLogin(user, password)
        }
        onClick={
          isLoggedIn && handleLogout !== undefined
            ? handleLogout
            : async (e) => {
                await handleAction(e, password);
              }
        }
      >
        {!loading ? label : <Loader />}
      </button>
    </div>
  );
}
