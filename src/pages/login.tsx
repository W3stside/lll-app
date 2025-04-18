/* eslint-disable no-console */
import type { GetServerSideProps } from "next";
import { useRouter } from "next/router";
import { useCallback, useEffect, useState } from "react";

import type { ISignups } from "./signup";

import { RegisterToPlay } from "@/components/Signup/RegisterToPlay";
import { NAVLINKS_MAP } from "@/constants/links";
import { USER_INFO_KEY } from "@/constants/storage";
import client from "@/lib/mongodb";
import type { Signup } from "@/types/signups";

type ConnectionStatus = {
  isConnected: boolean;
};

export const getServerSideProps: GetServerSideProps<
  ConnectionStatus
> = async () => {
  try {
    await client.connect();

    return {
      props: {
        isConnected: true,
      },
    };
  } catch (e) {
    console.error(e);
    return {
      props: { isConnected: false },
    };
  }
};

export default function Login({
  isConnected,
}: ConnectionStatus & Omit<ISignups, "signups">) {
  const [ready, setReady] = useState(false);
  const playerStore = useState<Partial<Signup>>({});

  const handleSignup = useCallback(async () => {
    const [player] = playerStore;
    localStorage.setItem(USER_INFO_KEY, JSON.stringify(player));
    await Promise.resolve();
  }, [playerStore]);

  const router = useRouter();
  useEffect(() => {
    // User is already logged in, reroute to signup page
    const userInfo = localStorage.getItem(USER_INFO_KEY);
    if (userInfo !== null) {
      // Redirect to the signup page if user info is found
      void router.push(NAVLINKS_MAP.SIGNUP);
    } else {
      setReady(true);
    }
  }, [router]);

  if (!ready || !isConnected) {
    return (
      <h1>{!isConnected ? "Connecting to db..." : "Getting user info..."}</h1>
    );
  }

  return (
    <div className="flex flex-col gap-y-1 text-black container">
      <div className="container-header !h-auto -mt-2 -mx-1.5">
        <h4 className="mr-auto px-2 py-1">Signup</h4> X
      </div>
      <div className="px-2 py-2">
        <h5 className="mb-5">Register yourself first to find games</h5>
        <RegisterToPlay
          games={null}
          playerStore={playerStore}
          loading={false}
          handleSignup={handleSignup}
        />
      </div>
    </div>
  );
}
