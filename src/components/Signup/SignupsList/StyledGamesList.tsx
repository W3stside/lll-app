import type { ReactNode } from "react";

import { Games } from "../Games";

import { Collapsible } from "@/components/ui";
import type { IGame } from "@/types";
import { cn } from "@/utils/tailwind";

interface IStyledGamesList {
  game: IGame;
  gameCancelled: boolean;
  capacity: number[];
  index: number;
  confirmedList: string[];
  nextGameDate: string;
  children: ReactNode;
}

export function StyledGamesList({
  game,
  gameCancelled,
  capacity,
  index,
  confirmedList,
  nextGameDate,
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
      collapsedHeight={gameCancelled ? 146 : capacity[index] <= 0 ? 182 : 160}
      startCollapsed={gameCancelled}
      disabled={gameCancelled}
    >
      <Games
        {...game}
        signupsAmt={confirmedList.length}
        waitlistAmt={capacity[index]}
        date={nextGameDate}
      >
        {!gameCancelled && <small>[+] Tap to expand/collapse</small>}
      </Games>
      {children}
    </Collapsible>
  );
}
