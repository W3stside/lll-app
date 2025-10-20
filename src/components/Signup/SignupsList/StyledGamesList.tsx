import type { ReactNode } from "react";

import { Games } from "../Games";

import { Collapsible, type ICollapsible } from "@/components/ui";
import type { IGame } from "@/types";
import { cn } from "@/utils/tailwind";

export interface IStyledGamesList {
  game: IGame;
  gameCancelled: boolean;
  waitlistAmt: number | null;
  confirmedList: string[] | null;
  nextGameDate: string;
  collapsible: Omit<ICollapsible, "children">;
  children: ReactNode;
}

export function StyledGamesList({
  game,
  gameCancelled,
  waitlistAmt,
  confirmedList,
  nextGameDate,
  collapsible: { collapsedHeight, disabled = false, startCollapsed = false },
  children,
}: IStyledGamesList) {
  return (
    <Collapsible
      key={game._id.toString()}
      className={cn(
        "flex flex-col gap-y-2 w-full mb-10 transition-[height] duration-300 ease-in-out",
        {
          "pointer-events-none !cursor-none": gameCancelled,
        },
      )}
      collapsedClassName="mb-0"
      startCollapsed={!disabled && (startCollapsed || gameCancelled)}
      collapsedHeight={collapsedHeight}
      disabled={disabled || gameCancelled}
    >
      <Games
        {...game}
        signupsAmt={confirmedList !== null ? confirmedList.length : null}
        waitlistAmt={waitlistAmt}
        date={nextGameDate}
        cancelled={gameCancelled}
      />
      {children}
    </Collapsible>
  );
}
