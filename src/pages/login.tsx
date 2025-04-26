/* eslint-disable no-console */
import type { GetServerSideProps } from "next";
import { useRouter } from "next/router";
import { useCallback, useState } from "react";

import { RegisterUser } from "@/components/Register/RegisterUser";
import { Loader } from "@/components/ui";
import { NAVLINKS_MAP } from "@/constants/links";
import { useUser } from "@/context/User/context";
import { JWT_REFRESH_SECRET, JWT_SECRET, verifyToken } from "@/lib/authUtils";
import client from "@/lib/mongodb";
import type { IUserFromCookies } from "@/types/users";
import { dbAuth } from "@/utils/dbAuth";
import { isValidLogin, isValidNewSignup } from "@/utils/signup";

type LoginPage = {
  isConnected: boolean;
  user: IUserFromCookies | null;
};

export const getServerSideProps: GetServerSideProps<LoginPage> = async (
  context,
) => {
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

    return {
      props: {
        user: user ?? null,
        isConnected: true,
      },
    };
  } catch (e) {
    console.error(e);
    await client.connect();
    return {
      props: { isConnected: true, user: null },
    };
  }
};

export default function Login({ isConnected, user }: LoginPage) {
  const [view, setView] = useState<"login" | "register">("register");
  const { user: player } = useUser();

  const [appError, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  const handleSignup = useCallback(
    async (e: React.FormEvent, password: string | undefined) => {
      e.preventDefault();
      setError(null);
      setLoading(true);

      try {
        if (!isValidNewSignup(player, password)) {
          throw new Error("Player is invalid. Check fields.");
        }

        const { error } = await dbAuth("register", { ...player, password });

        if (error !== null) {
          setError(error.message);
          throw error;
        }

        void router.push(NAVLINKS_MAP.HOME);
      } catch (error) {
        const newError = new Error(
          error instanceof Error ? error.message : "Unknown error occurred.",
        );
        setError(newError.message);
      } finally {
        setLoading(false);
      }
    },
    [player, router],
  );

  const handleLogin = useCallback(
    async (e: React.FormEvent, password: string | undefined) => {
      e.preventDefault();
      setError(null);
      setLoading(true);

      try {
        if (!isValidLogin(player, password)) {
          throw new Error(
            "Login fields are invalid. Please check and try again.",
          );
        }
        const { error } = await dbAuth("login", { ...player, password });

        if (error !== null) {
          setError(error.message);
          throw error;
        }

        void router.push(NAVLINKS_MAP.HOME);
      } catch (error) {
        const newError = new Error(
          error instanceof Error ? error.message : "Unknown error occurred.",
        );
        setError(newError.message);
      } finally {
        setLoading(false);
      }
    },
    [player, router],
  );

  const handleLogout = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await dbAuth("logout");
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Unknown error occurred.",
      );
    }
  }, []);

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
            handleLogout={handleLogout}
            isLoggedIn={user !== null}
            isLogin={view === "login"}
          />
          {appError !== null && (
            <p className="flex mb-6 w-full justify-center text-red-700">
              {view !== "login" ? "Registration" : "Login"} error: {appError}
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
