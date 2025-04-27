import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "next/router";
import { useCallback } from "react";

import { Loader } from "./ui";

import logo from "@/assets/logo.png";
import { NAVLINKS, NAVLINKS_MAP } from "@/constants/links";
import { useClientUser } from "@/hooks/useClientUser";
import type { IUser } from "@/types/users";
import { dbAuth } from "@/utils/api/dbAuth";
import { cn } from "@/utils/tailwind";

function _formatPathname(pathname: string) {
  return pathname.replace("/profiles/", "");
}

interface INavbar {
  usersById?: Record<string, Partial<IUser>>;
}

export function Navbar({ usersById }: INavbar) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading } = useClientUser(router.pathname);

  const userInfoFromPath = usersById?.[_formatPathname(pathname)];

  const handleLogout = useCallback(async () => {
    try {
      await dbAuth("logout");
      void router.push(NAVLINKS_MAP.LOGIN);
    } catch (error) {
      const err = error instanceof Error ? error : new Error("Unknown error");
      // eslint-disable-next-line no-console
      console.error(err);
    }
  }, [router]);

  return (
    <div className="flex flex-col gap-y-8 items-center justify-start pb-10">
      <div className="flex flex-row flex-wrap container-header w-full gap-4 !h-auto !justify-start !bg-[var(--background-color)]">
        <Link href={NAVLINKS_MAP.HOME}>
          <Image src={logo} alt="LLL logo" className="max-w-25 p-1" />
        </Link>
        <h1 className="lowercase font-thin text-[3.5vw] sm:text-xl">
          {userInfoFromPath !== undefined
            ? `player profile: ${userInfoFromPath.first_name}`
            : pathname}
        </h1>
        <div className="flex-1 sm:grow-0 mb-2 sm:m-0 sm:ml-auto m-2 flex items-center justify-center gap-x-4 w-min">
          {NAVLINKS.flatMap(({ name, url, ...rest }) =>
            !router.pathname.includes(url)
              ? [
                  <Link key={url} href={url} className="whitespace-nowrap">
                    <button
                      className={cn("underline", {
                        "bg-[var(--background-window-highlight)]":
                          "highlight" in rest && rest.highlight,
                      })}
                    >
                      {name}
                    </button>
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
