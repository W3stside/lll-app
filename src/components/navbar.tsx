/* eslint-disable no-console */
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import { useCallback } from "react";

import { Loader } from "./ui";

import logo from "@/assets/logo.png";
import { NAVLINKS, NAVLINKS_MAP } from "@/constants/links";
import { useClientUser } from "@/hooks/useClientUser";
import { dbAuth } from "@/utils/dbAuth";
import { cn } from "@/utils/tailwind";

interface INavbar {
  title: string;
}

export function Navbar({ title }: INavbar) {
  const router = useRouter();
  const { user, isLoading } = useClientUser(router.pathname);

  const handleLogout = useCallback(async () => {
    try {
      await dbAuth("logout");
      void router.push(NAVLINKS_MAP.LOGIN);
    } catch (error) {
      const err = error instanceof Error ? error : new Error("Unknown error");
      console.error(err);
    }
  }, [router]);

  return (
    <div className="flex flex-col gap-y-8 items-center justify-start pb-10">
      <div className="flex flex-row flex-wrap container-header w-full gap-4 !h-auto !justify-start !bg-[var(--background-color)]">
        <Link href={NAVLINKS_MAP.HOME}>
          <Image src={logo} alt="LLL logo" className="max-w-25 p-1" />
        </Link>
        <h1 className="lowercase font-thin">{title}</h1>
        <div className="flex-1 sm:grow-0 mb-2 sm:m-0 sm:ml-auto m-2 flex items-center justify-center gap-x-4 w-min">
          {NAVLINKS.flatMap(({ name, url }) =>
            !title.includes(url)
              ? [
                  <Link key={url} href={url} className="whitespace-nowrap">
                    <button className="underline">{name}</button>
                  </Link>,
                ]
              : [],
          )}
          {(isLoading || user !== undefined) && (
            <button
              className={cn(
                "hidden w-[75px] justify-center lg:flex bg-[var(--background-window-highlight)]",
                { "!p-0": isLoading },
              )}
              onClick={handleLogout}
            >
              {!isLoading ? "Log out" : <Loader />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
