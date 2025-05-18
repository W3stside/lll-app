/* eslint-disable no-console */
import { useRouter } from "next/router";
import { useCallback } from "react";

import { Loader } from "./ui";

import {
  ADMIN_PATH,
  BUY_ME_A_COFFEE,
  NAVLINKS_MAP,
  WHATS_APP_GROUP_URL,
} from "@/constants/links";
import { useClientTheme } from "@/hooks/useClientTheme";
import { useClientUser } from "@/hooks/useClientUser";
import { Role } from "@/types";
import { dbAuth } from "@/utils/api/dbAuth";
import { cn } from "@/utils/tailwind";

export function Footer() {
  const router = useRouter();
  const { isDark, toggleTheme } = useClientTheme();

  const handleLogout = useCallback(async () => {
    try {
      await dbAuth("logout");
      void router.push(NAVLINKS_MAP.LOGIN);
    } catch (error) {
      const err = error instanceof Error ? error : new Error("Unknown error");
      console.error(err);
    }
  }, [router]);

  const { user, isLoading } = useClientUser(router.pathname);

  return (
    <footer className="container flex justify-center items-center bg-gray-800 text-white w-full !max-w-none mt-auto">
      <div className="mx-auto p-4 !w-full">
        <div className="flex flex-wrap gap-2 justify-end items-center justify-self-end w-full">
          <a
            className="underline text-xs mr-auto"
            href={BUY_ME_A_COFFEE}
            target="_blank"
            rel="noopener noreferrer"
          >
            made with love for LLL by daveo <br />
            (buy me a beer? 🍻)
          </a>
          <button
            className={cn("w-[98px] h-[40px] whitespace-nowrap bg-blue-400", {
              "bg-purple-900 text-yellow-400": !isDark,
            })}
            onClick={toggleTheme}
          >
            {isDark ? (
              <div>
                Go light <span className="text-black bg-yellow-200">☼</span>
              </div>
            ) : (
              <div>
                Go dark <span className="text-black bg-yellow-400">☽</span>
              </div>
            )}
          </button>
          <a
            href={WHATS_APP_GROUP_URL}
            className={cn(
              "flex justify-center w-[98px] h-[40px] underline text-blue-500 container !bg-green-200",
              {
                "!bg-green-800": isDark,
              },
            )}
            target="_blank"
            rel="noopener noreferrer"
          >
            WhatsApp
          </a>
          {(isLoading || user !== undefined) && (
            <button
              className={cn(
                "w-[98px] h-[40px] justify-center lg:hidden ml-4 bg-[var(--background-color-2)] whitespace-nowrap",
                { "!p-0": isLoading },
              )}
              onClick={handleLogout}
            >
              {!isLoading ? "Log out" : <Loader />}
            </button>
          )}
          {user?.role === Role.ADMIN && router.pathname !== ADMIN_PATH && (
            <button
              className={cn(
                "w-[98px] h-[40px] justify-center ml-4 bg-[var(--background-window-highlight)] whitespace-nowrap",
                { "!p-0": isLoading },
              )}
              onClick={async () => await router.push(ADMIN_PATH)}
            >
              {!isLoading ? "Admin" : <Loader />}
            </button>
          )}
        </div>
      </div>
    </footer>
  );
}
