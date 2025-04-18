import { type ReactNode, useState } from "react";

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
}

export const Collapsible = ({
  className,
  collapsedClassName,
  children,
  collapsedHeight,
  startCollapsed = true,
  customHandler,
  customState = undefined,
}: ICollapsible) => {
  const [collapsed, setCollapse] = useState(startCollapsed);
  const rCollapsed = customState !== undefined ? customState : collapsed;

  return (
    <div
      onClick={
        customHandler ??
        (() => {
          setCollapse((prev) => !prev);
        })
      }
      className={cn(className, "cursor-pointer", {
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
  signedUp: number;
  maxSignups: number;
}

export const RemainingSpots = ({
  className,
  title = "Remaining spots:",
  signedUp,
  maxSignups,
}: IRemainingSpots) => {
  return (
    <div className={cn("flex items-center pl-6 w-full text-xl", className)}>
      {title}{" "}
      <div
        className={cn("inline-flex ml-auto p-2 px-4", {
          "bg-[#77e8a0]": signedUp < maxSignups,
          "bg-[#d5be4c]": maxSignups - signedUp <= YELLOW_THRESHOLD,
          "bg-orange-300": maxSignups - signedUp <= ORANGE_THRESHOLD,
          "bg-red-500": maxSignups - signedUp <= 0,
        })}
      >
        {Math.max(maxSignups - signedUp, 0)} / {maxSignups}
      </div>
    </div>
  );
};
