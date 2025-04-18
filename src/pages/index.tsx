/* eslint-disable no-console */
import type { GetServerSideProps } from "next";
import Link from "next/link";

import { NAVLINKS_MAP } from "@/constants/links";
import client from "@/lib/mongodb";

type ConnectionStatus = {
  isConnected: boolean;
};

export const getServerSideProps: GetServerSideProps<
  ConnectionStatus
> = async () => {
  try {
    await client.connect();
    return {
      props: { isConnected: true },
    };
  } catch (e) {
    console.error(e);
    return {
      props: { isConnected: false },
    };
  }
};

export default function Home({ isConnected }: ConnectionStatus) {
  if (!isConnected) return <h1>Connecting to db...</h1>;

  return (
    <div className="flex flex-col gap-y-1 text-black container max-w-[470px]">
      <div className="container-header !h-auto -mt-2 -mx-1.5">
        <h4 className="mr-auto px-2 py-1">Welcome to the LLL App!</h4> X
      </div>
      <div className="px-2 py-2 text-lg">
        Here you can:
        <ol className="list-decimal mt-2 [&>li]:ml-9 [&>li]:py-1 [&>li>a]:underline">
          <li>
            <Link href={NAVLINKS_MAP.SIGNUP}>Sign up for games</Link>
          </li>
          <li>
            <Link href={NAVLINKS_MAP.ABOUT}>
              Read the rules & learn more about us
            </Link>
          </li>
          <li>
            <Link href={NAVLINKS_MAP.SHAME}>
              Laugh at the dickheads in the wall of shame!
            </Link>
          </li>
        </ol>
      </div>
    </div>
  );
}
