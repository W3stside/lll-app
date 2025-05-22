import { useState } from "react";

import { type IRegisterForm, RegisterForm } from "./RegisterForm";

import { useUser } from "@/context/User/context";
import { isValidNewSignup, isValidLogin } from "@/utils/signup";

interface IRegisterUser
  extends Omit<IRegisterForm, "disabled" | "password" | "setPassword"> {
  isLogin?: boolean;
  loading: boolean;
  label: string;
  title?: string;
  handleAction: (
    e: React.FormEvent,
    password: string | undefined,
  ) => Promise<void>;
  handleLogout?: (e: React.FormEvent) => Promise<void>;
}

export function RegisterUser({
  loading,
  label,
  title = "Register to play",
  isLogin = false,
  handleAction,
  handleLogout,
}: IRegisterUser) {
  const [password, setPassword] = useState("");
  const { user } = useUser();

  return (
    <div className="flex flex-col items-center mt-auto mb-8 w-full gap-y-6">
      <div className="container-header !h-auto !text-md p-1 w-full -mb-3.5">
        <span className="mr-2">{title}</span>
      </div>
      <RegisterForm
        loading={loading}
        label={label}
        isLogin={isLogin}
        password={password}
        disabled={
          !isLogin
            ? !isValidNewSignup(user, password)
            : !isValidLogin(user, password)
        }
        handleAction={handleAction}
        handleLogout={handleLogout}
        setPassword={setPassword}
      />
    </div>
  );
}
