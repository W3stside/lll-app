import Image from "next/image";

import warning from "@/assets/warning.png";
import { ORANGE_TW } from "@/constants/colours";
import type { IGame } from "@/types";
import { getOpenSpotsAlertCopy } from "@/utils/openSpots";
import { cn } from "@/utils/tailwind";

export interface IOpenSpotsBanner {
  game: Pick<IGame, "day" | "time">;
  openSpots: number;
  onDismiss: () => void;
}

// Alert-styled Win95 window: same title bar + X as NotificationPromptBanner,
// but the orange warn body and the warning icon from CancelDialog
export function OpenSpotsBanner({
  game,
  openSpots,
  onDismiss,
}: IOpenSpotsBanner) {
  const { title, body } = getOpenSpotsAlertCopy(game);

  return (
    <div
      role="alert"
      className={cn("container flex flex-col w-full text-black", ORANGE_TW)}
    >
      <div className="container-header !h-auto -mt-2 -mx-1.5 items-center gap-4 px-[8px] !justify-between">
        <h5>{title}</h5>
        <div
          role="button"
          aria-label="Dismiss"
          className="cursor-pointer p-1 pt-1.5 font-bold"
          onClick={(e) => {
            e.stopPropagation();
            onDismiss();
          }}
        >
          <h5>X</h5>
        </div>
      </div>
      <div className="flex gap-x-4 items-center p-2">
        <Image
          src={warning}
          alt=""
          width={40}
          height={40}
          className="w-[40px] h-[40px] shrink-0"
        />
        <div className="flex flex-col gap-y-1">
          <strong>{body}</strong>
          <span className="text-xs">
            {openSpots} {openSpots === 1 ? "spot" : "spots"} left on the active
            list.
          </span>
        </div>
      </div>
    </div>
  );
}
