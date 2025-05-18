import Image from "next/image";

import { Loader } from "../ui";
import type { IButton } from "./types";

import logoff from "@/assets/logoff.png";
import { cn } from "@/utils/tailwind";

export const LogoffButton = ({
  action,
  loading,
  className,
  ...buttonProps
}: IButton) => (
  <button
    className={cn(
      "w-[98px] h-[40px] justify-center bg-[var(--background-color-2)] whitespace-nowrap text-sm font-bold",
      { "!p-0": loading },
      className,
    )}
    onClick={action}
    {...buttonProps}
  >
    {!loading ? (
      <div className="flex gap-x-2 items-center">
        <Image src={logoff} alt="log-off" /> Log off
      </div>
    ) : (
      <Loader />
    )}
  </button>
);
