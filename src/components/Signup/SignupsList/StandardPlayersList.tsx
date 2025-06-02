import { Games } from "../Games";
import { PlayersList } from "./PlayersList";
import type { IPlayersList } from "./types";

import { Collapsible } from "@/components/ui";
import { MAX_SIGNUPS_PER_GAME } from "@/constants/signups";
import { cn } from "@/utils/tailwind";

export function StandardPlayersList({
  game,
  usersById,
  capacity,
  nextGameDate,
  index,
  ...rest
}: Omit<IPlayersList, "confirmedList" | "waitlist">) {
  const confirmedList = game.players.slice(0, MAX_SIGNUPS_PER_GAME);
  const waitlist = game.players.slice(MAX_SIGNUPS_PER_GAME);

  return (
    <Collapsible
      key={game._id.toString()}
      className={cn(
        "flex flex-col gap-y-2 w-full mb-10 transition-[height] duration-300 ease-in-out",
        {
          "pointer-events-none !cursor-none": game.cancelled === true,
        },
      )}
      collapsedClassName="mb-0"
      collapsedHeight={
        game.cancelled === true ? 140 : capacity[index] <= 0 ? 182 : 160
      }
      startCollapsed={game.cancelled === true}
      disabled={game.cancelled === true}
    >
      <Games
        {...game}
        signupsAmt={confirmedList.length}
        waitlistAmt={capacity[index]}
        date={nextGameDate}
      >
        {game.cancelled !== true && <small>[+] Tap to expand/collapse</small>}
      </Games>
      <PlayersList
        {...rest}
        game={game}
        usersById={usersById}
        confirmedList={confirmedList}
        waitlist={waitlist}
        nextGameDate={nextGameDate}
      />
    </Collapsible>
  );
}
