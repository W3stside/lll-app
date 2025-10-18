import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "next/router";
import { useCallback } from "react";

import { LogoffButton } from "./Buttons/Logoff";

import logo from "@/assets/logo.png";
import { ADMIN_NAVLINK, NAVLINKS, NAVLINKS_MAP } from "@/constants/links";
import { useClientUser } from "@/hooks/useClientUser";
import { Role } from "@/types";
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
          <Image
            src={logo}
            alt="LLL logo"
            className="max-w-25 p-2 filter-[var(--navbar-logo-filter)]"
          />
        </Link>
        <h1 className="lowercase font-thin text-[3.5vw] sm:text-xl text-[var(--text-color-main)]">
          {userInfoFromPath !== undefined ? (
            <div className="container uppercase">
              Player: {userInfoFromPath.first_name} {userInfoFromPath.last_name}
            </div>
          ) : (
            pathname
          )}
        </h1>
        <div className="flex-1 sm:grow-0 mb-2 sm:m-0 sm:ml-auto m-2 flex items-center justify-center gap-x-4 w-min">
          {[
            ...NAVLINKS,
            ...(router.pathname.includes(NAVLINKS_MAP.SHAME) &&
            user?.role === Role.ADMIN
              ? [ADMIN_NAVLINK]
              : []),
          ].flatMap(({ name, url, ...rest }) =>
            !router.pathname.includes(url)
              ? [
                  <Link
                    key={url}
                    href={url}
                    className={cn(
                      "whitespace-nowrap",
                      "className" in rest && rest.className,
                    )}
                  >
                    <button
                      className={cn(
                        "underline flex items-center gap-x-1.5 w-max",
                        {
                          "bg-[var(--background-window-highlight)]":
                            "highlight" in rest && rest.highlight,
                        },
                      )}
                    >
                      {"icon" in rest && (
                        <Image
                          src={rest.icon}
                          alt={name}
                          className="w-[16px] h-[16px]"
                        />
                      )}
                      {name}
                    </button>
                  </Link>,
                ]
              : [],
          )}
          {(isLoading || user !== undefined) && (
            <LogoffButton
              action={handleLogout}
              loading={isLoading}
              className="hidden lg:flex"
            />
          )}
        </div>
      </div>
    </div>
  );
}
