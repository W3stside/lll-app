import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import { useCallback } from "react";

import { LogoffButton } from "./Buttons/Logoff";
import { Loader } from "./ui";

import info from "@/assets/info.png";
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
import { useUser } from "@/context/User/context";
import { DEFAULT_USER } from "@/context/User/provider";
import { useClientTheme } from "@/hooks/useClientTheme";
import { useClientUser } from "@/hooks/useClientUser";
import { Role } from "@/types";
import { dbAuth } from "@/utils/api/dbAuth";
import { cn } from "@/utils/tailwind";

export function Footer() {
  const router = useRouter();
  const { setUser } = useUser();
  const { isDark, toggleTheme } = useClientTheme();

  const handleLogout = useCallback(async () => {
    try {
      await dbAuth("logout");
      setUser(DEFAULT_USER);
      void router.push(NAVLINKS_MAP.LOGIN);
    } catch (error) {
      throw error instanceof Error ? error : new Error("Unknown error");
    }
  }, [router, setUser]);

  const { user, isLoading } = useClientUser(router.pathname);

  return (
    <footer className="container flex justify-center items-center bg-gray-800 text-white w-full !max-w-none mt-auto">
      <div className="mx-auto p-4 !w-full">
        <div className="flex flex-wrap gap-1 justify-end items-center justify-self-end w-full">
          <Link
            className="underline text-xs mr-auto"
            href={BUY_ME_A_COFFEE}
            target="_blank"
            rel="noopener noreferrer"
          >
            made with love by daveo <br />
            (buy me a beer? 🍻)
          </Link>
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
          <Link href={NAVLINKS_MAP.ABOUT} className="no-underline">
            <button className="justify-center items-center w-[98px] h-[40px] text-sm lg:hidden">
              <div className="flex gap-x-2 items-center">
                <Image src={info} alt="whatsapp" className="w-[17px]" /> About
              </div>
            </button>
          </Link>
          <Link
            href={WHATS_APP_GROUP_URL}
            className="flex justify-center no-underline items-center w-[98px] h-[40px] text-sm container"
            target="_blank"
            rel="noopener noreferrer"
          >
            <div className="flex gap-x-2 items-center">
              <Image src={mail} alt="whatsapp" className="w-[17px]" /> WhatsApp
            </div>
          </Link>
          <div className="flex gap-x-1 ml-0 md:ml-4">
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
