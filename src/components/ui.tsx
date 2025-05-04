import Image from "next/image";
import { type ReactNode, useState } from "react";

import loader from "@/assets/loader.webp";
import { GREEN_TW, ORANGE_TW, RED_TW, YELLOW_TW } from "@/constants/colours";
import { ORANGE_THRESHOLD, YELLOW_THRESHOLD } from "@/constants/signups";
import { cn } from "@/utils/tailwind";

interface ICollapsible {
  children: React.ReactNode;
  className?: string;
  collapsedClassName?: string;
  collapsedHeight: number;
  startCollapsed?: boolean;
  customHandler?: () => void;
  customState?: boolean;
  disabled?: boolean;
}

export const Collapsible = ({
  className,
  collapsedClassName,
  children,
  collapsedHeight,
  startCollapsed = true,
  customHandler,
  customState = undefined,
  disabled = false,
}: ICollapsible) => {
  const [collapsed, setCollapse] = useState(startCollapsed);
  const rCollapsed = customState !== undefined ? customState : collapsed;

  return (
    <div
      onClick={
        disabled
          ? undefined
          : (customHandler ??
            ((e) => {
              e.preventDefault();
              e.stopPropagation();
              setCollapse((prev) => !prev);
            }))
      }
      className={cn(className, "cursor-pointer", {
        "!bg-[#c16969] cursor-not-allowed": disabled,
        "overflow-hidden": rCollapsed,
        [collapsedClassName as string]:
          rCollapsed && collapsedClassName !== undefined,
      })}
      style={{ height: rCollapsed ? collapsedHeight : "auto" }}
    >
      {children}
    </div>
  );
};

interface IRemainingSpots {
  className?: string;
  title?: ReactNode;
  text?: ReactNode;
  signedUp: number | null;
  maxSignups: number;
  disabled?: boolean;
}

export const RemainingSpots = ({
  className,
  title = "Spots remaining:",
  text = null,
  signedUp,
  maxSignups,
  disabled = false,
}: IRemainingSpots) => {
  return (
    <div className={cn("flex items-center pl-6 w-full text-lg", className)}>
      {title !== null && (
        <span
          className={cn({
            "line-through decoration-2": disabled,
          })}
        >
          {title}
        </span>
      )}
      <div
        className={cn(
          "inline-flex ml-auto p-1 px-2",
          text !== null || signedUp === null
            ? {}
            : {
                [GREEN_TW]: signedUp < maxSignups,
                [YELLOW_TW]: maxSignups - signedUp <= YELLOW_THRESHOLD,
                [ORANGE_TW]: maxSignups - signedUp <= ORANGE_THRESHOLD,
                [RED_TW]: disabled || maxSignups - signedUp <= 0,
              },
        )}
      >
        {text !== null ? (
          <div>{text}</div>
        ) : signedUp === null || disabled ? (
          "PAST"
        ) : (
          <>
            {Math.max(maxSignups - signedUp, 0)} / {maxSignups}
          </>
        )}
      </div>
    </div>
  );
};

interface ILoader {
  className?: string;
}

export const Loader = ({ className }: ILoader) => (
  <Image
    src={loader}
    alt="Loading"
    width={32}
    height={32}
    className={className}
  />
);
