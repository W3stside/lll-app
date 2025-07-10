import Image from "next/image";
import Link from "next/link";

import { Countdown, type ICountdown } from "./Countdown";

import warning from "@/assets/warning.png";

const NOW = new Date();
export function CountdownComponent({ children, target }: ICountdown) {
  return (
    <div className="m-auto w-full container flex flex-col -mt-10 mb-5 !bg-[var(--background-window-highlight)] !px-3">
      <div className="flex gap-x-2 justify-center items-center">
        <Image
          src={warning}
          alt="warning"
          width={20}
          height={20}
          className="w-[20px] h-[20px] mr-auto"
        />
        <div className="flex flex-wrap gap-1 justify-center items-center whitespace-nowrap">
          {children}{" "}
          <b className="mx-1 whitespace-nowrap">
            {target > NOW ? (
              <Countdown target={target} />
            ) : (
              <Link href="https://forms.gle/4o9wLiymCknsVekT8">
                Make your LLL kit order here!
              </Link>
            )}
          </b>
        </div>
        <Image
          src={warning}
          alt="warning"
          width={20}
          height={20}
          className="w-[20px] h-[20px] ml-auto"
        />
      </div>
    </div>
  );
}
