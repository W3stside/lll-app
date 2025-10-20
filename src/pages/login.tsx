import { ObjectId } from "mongodb";
import type { GetServerSideProps } from "next";
import { useRouter } from "next/router";
import { useCallback, useState } from "react";

import { RegisterUser } from "@/components/Register/RegisterUser";
import { Loader } from "@/components/ui";
import { NAVLINKS_MAP, SMS_VERIFICATION } from "@/constants/links";
import { useUser } from "@/context/User/context";
import { DEFAULT_USER } from "@/context/User/provider";
import { JWT_REFRESH_SECRET, JWT_SECRET, verifyToken } from "@/lib/authUtils";
import client from "@/lib/mongodb";
import { Collection } from "@/types";
import type {
  IUserSafe,
  IUserFromCookies,
  IUser,
  INewSignup,
} from "@/types/users";
import { dbAuth } from "@/utils/api/dbAuth";
import { isValidLogin, isValidNewSignup } from "@/utils/signup";

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
      .findOne({ _id: new ObjectId(user?._id) });

    if (userInfo?.verified === true) {
      return {
        redirect: {
          destination: NAVLINKS_MAP.HOME,
          permanent: false,
        },
      };
    }

    return {
      props: {
        user: JSON.parse(JSON.stringify(userInfo)) as string | null,
        isConnected: true,
      },
    };
  } catch (e) {
    return {
      props: { isConnected: true, user: null },
    };
  }
};

export default function Login({
  isConnected,
  user: userFromCookies,
}: LoginPage) {
  const { user: player, setUser } = useUser();

  const [view, setView] = useState<"login" | "register">("register");

  const [appError, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  const handleRegister = useCallback(
    async (e: React.FormEvent, password: string | undefined) => {
      e.preventDefault();
      setError(null);
      setLoading(true);

      try {
        if (!isValidNewSignup(player, password)) {
          throw new Error("Player is invalid. Check fields.");
        }

        const { error } = await dbAuth("register", {
          ...player,
          password,
        });

        if (error !== null) {
          setError(error.message);
          throw error;
        }

        void router.push(SMS_VERIFICATION);
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
        let isVerified = false;
        if (player._id === undefined) {
          if (password === undefined || !isValidLogin(player, password)) {
            throw new Error(
              "Login fields are invalid. Please check and try again.",
            );
          }

          const { data: { user: response } = { user: undefined }, error } =
            await dbAuth<INewSignup, { user: Omit<IUser, "password"> }>(
              "login",
              {
                ...player,
                password,
              },
            );

          if (error !== null) {
            setError(error.message);
            throw error;
          }

          if (response !== undefined) {
            setUser(response);

            if (response.verified === false || !("verified" in response)) {
              void router.push(SMS_VERIFICATION);
            }
            isVerified = true;
          }
        }

        if (isVerified) {
          void router.push(NAVLINKS_MAP.HOME);
        }
      } catch (error) {
        const newError = new Error(
          error instanceof Error ? error.message : "Unknown error occurred.",
        );
        setError(newError.message);
      } finally {
        setLoading(false);
      }
    },
    [player, router, setUser],
  );

  const handleLogout = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();
      setError(null);

      if (player._id === undefined) return;

      try {
        await dbAuth("logout");
        setUser(DEFAULT_USER);
      } catch (error) {
        throw new Error(
          error instanceof Error ? error.message : "Unknown error occurred.",
        );
      }
    },
    [player._id, setUser],
  );

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
          <p className="mb-5">
            {view === "login"
              ? "Welcome back!"
              : "Register yourself first to find games!"}
          </p>
          <RegisterUser
            view={view}
            loading={false}
            title="Please enter credentials"
            label={view === "login" ? "Login" : "Continue"}
            handleAction={view === "register" ? handleRegister : handleLogin}
            handleLogout={userFromCookies !== null ? handleLogout : undefined}
          />
          {appError !== null && (
            <p className="flex mb-6 w-full justify-center text-red-700">
              {view !== "register" ? "Login" : "Registration"} error: {appError}
            </p>
          )}
          <p
            className="p-1 hover:bg-[var(--background-window-highlight)] cursor-pointer flex w-fit mx-auto justify-center underline text-[var(--background-windows-blue)]"
            onClick={() => {
              void handleLogout();
              setView((prev) => (prev !== "register" ? "register" : "login"));
            }}
          >
            {view === "login"
              ? "Not already a degenerate? Register!"
              : "Already a degenerate? Login!"}
          </p>
        </div>
      ) : (
        <Loader className="flex justify-center w-full" />
      )}
    </div>
  );
}
