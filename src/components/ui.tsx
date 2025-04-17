import { useState } from "react";

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
  startCollapsed = false,
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
      className={cn(className, {
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
