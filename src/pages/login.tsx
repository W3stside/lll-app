/* eslint-disable no-console */
import type { GetServerSideProps } from "next";
import { useRouter } from "next/router";
import { useCallback, useState } from "react";

import { RegisterUser } from "@/components/Register/RegisterUser";
import { Loader } from "@/components/ui";
import { NAVLINKS_MAP } from "@/constants/links";
import { useActions } from "@/context/Actions/context";
import { JWT_REFRESH_SECRET, JWT_SECRET, verifyToken } from "@/lib/authUtils";
import client from "@/lib/mongodb";
import { Collection } from "@/types";
import type { IUserSafe, IUserFromCookies } from "@/types/users";

type LoginPage = {
  isConnected: boolean;
  user: IUserSafe | null;
};

export const getServerSideProps: GetServerSideProps = async (context) => {
  try {
    const { token } = context.req.cookies;
    const user =
      token === undefined
        ? undefined
        : verifyToken<IUserFromCookies>(
            token,
            JWT_SECRET as string,
            JWT_REFRESH_SECRET,
          );

    await client.connect();
    const userInfo = await client
      .db("LLL")
      .collection<IUserSafe>(Collection.USERS)
      .findOne({ _id: user?._id });

    return {
      props: {
        user: JSON.parse(JSON.stringify(userInfo)) as string | null,
        isConnected: true,
      },
    };
  } catch (e) {
    console.error(e);
    return {
      props: { isConnected: true, user: null },
    };
  }
};

export default function Login({
  isConnected,
  user: userFromCookies,
}: LoginPage) {
  const [view, setView] = useState<"login" | "register">("register");
  const {
    registerUser,
    loginUser,
    logoutUser,
    registerUserError,
    loginUserError,
    logoutUserError,
    isRegisterUserLoading,
    isLoginUserLoading,
    isLogoutUserLoading,
  } = useActions();

  const router = useRouter();

  const handleSignup = useCallback(
    async (e: React.FormEvent, password: string | undefined) => {
      e.preventDefault();
      await registerUser(password);
      void router.push(NAVLINKS_MAP.HOME);
    },
    [registerUser, router],
  );

  const handleLogin = useCallback(
    async (e: React.FormEvent, password: string | undefined) => {
      e.preventDefault();
      await loginUser(password);
      void router.push(NAVLINKS_MAP.HOME);
    },
    [loginUser, router],
  );

  const handleLogout = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      await logoutUser();
    },
    [logoutUser],
  );

  const appError = registerUserError ?? loginUserError ?? logoutUserError;
  const loading =
    isRegisterUserLoading || isLoginUserLoading || isLogoutUserLoading;

  return (
    <div className="flex flex-col gap-y-1 text-black container">
      <div className="container-header !h-auto -mt-2 -mx-1.5">
        <h4 className="mr-auto px-2 py-1">
          {view === "login" ? "Login" : "Signup"}
        </h4>{" "}
        X
      </div>
      {!loading && isConnected ? (
        <div className="px-2 py-2">
          <h5 className="mb-5">
            {view !== "login" ? "Register yourself first" : "Login first"} to
            find games
          </h5>
          <RegisterUser
            loading={false}
            title={
              view === "login" ? "Login to find games" : "Register here to play"
            }
            label={view === "login" ? "Login" : "Register"}
            handleAction={view !== "login" ? handleSignup : handleLogin}
            handleLogout={userFromCookies !== null ? handleLogout : undefined}
            isLogin={view === "login"}
          />
          {appError !== null && (
            <p className="flex mb-6 w-full justify-center text-red-700">
              {view !== "login" ? "Registration" : "Login"} error:{" "}
              {appError.message}
            </p>
          )}
          <p
            className="p-1 hover:bg-[var(--background-window-highlight)] cursor-pointer flex w-fit mx-auto justify-center underline text-[var(--background-windows-blue)]"
            onClick={() => {
              setView((prev) => (prev === "login" ? "register" : "login"));
            }}
          >
            {view !== "login"
              ? "Already a degenerate? Login!"
              : "Not already a degenerate? Register!"}
          </p>
        </div>
      ) : (
        <Loader className="flex justify-center w-full" />
      )}
    </div>
  );
}
