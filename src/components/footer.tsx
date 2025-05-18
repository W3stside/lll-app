import Image from "next/image";
import { useRouter } from "next/router";
import { useCallback } from "react";

import { LogoffButton } from "./Buttons/Logoff";
import { Loader } from "./ui";

import mail from "@/assets/mail.png";
import moon from "@/assets/moon.png";
import programs from "@/assets/programs.png";
import sun from "@/assets/sun.png";
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
      throw error instanceof Error ? error : new Error("Unknown error");
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
            <div className="flex gap-x-2 items-center justify-center w-full text-sm">
              <Image
                src={isDark ? sun : moon}
                alt={isDark ? "sun" : "moon"}
                className="w-[16px] h-[16px]"
              />
              Go {isDark ? "light" : "dark"}{" "}
            </div>
          </button>
          <a
            href={NAVLINKS_MAP.ABOUT}
            className="lg:hidden flex justify-center no-underline items-center w-[98px] h-[40px] text-sm text-blue-500 container"
            target="_blank"
            rel="noopener noreferrer"
          >
            <div className="flex gap-x-2 items-center">
              <Image src={mail} alt="whatsapp" /> About
            </div>
          </a>
          <a
            href={WHATS_APP_GROUP_URL}
            className="flex justify-center no-underline items-center w-[98px] h-[40px] text-sm text-blue-500 container"
            target="_blank"
            rel="noopener noreferrer"
          >
            <div className="flex gap-x-2 items-center">
              <Image src={mail} alt="whatsapp" /> WhatsApp
            </div>
          </a>
          <div className="flex gap-x-1 ml-4">
            {user?.role === Role.ADMIN && router.pathname !== ADMIN_PATH && (
              <button
                className={cn(
                  "w-[98px] h-[40px] justify-center bg-[var(--background-window-highlight)] whitespace-nowrap",
                  { "!p-0": isLoading },
                )}
                onClick={async () => await router.push(ADMIN_PATH)}
              >
                {!isLoading ? (
                  <div className="flex gap-x-2 items-center text-sm">
                    <Image
                      src={programs}
                      alt="log-off"
                      className="w-[22px] h-[22px]"
                    />{" "}
                    Admin
                  </div>
                ) : (
                  <Loader />
                )}
              </button>
            )}
            {(isLoading || user !== undefined) && (
              <LogoffButton
                action={handleLogout}
                loading={isLoading}
                className="lg:hidden"
              />
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}
