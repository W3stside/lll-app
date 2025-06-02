import { useMemo } from "react";

import { PlayersList } from "./PlayersList";
import type { IPlayersList } from "./types";
import { Games } from "../Games";

import { Collapsible } from "@/components/ui";
import { MAX_SIGNUPS_PER_GAME } from "@/constants/signups";
import { Role } from "@/types";
import { cn } from "@/utils/tailwind";

const TOURNEY_MAX_SIGNUPS = MAX_SIGNUPS_PER_GAME * 2;
const TEAMS_INFO = [
  { label: "Team 1", className: "bg-red-500", colour: "Red" },
  { label: "Team 2", className: "bg-blue-500", colour: "Blue" },
  { label: "Team 3", className: "bg-green-500", colour: "Green" },
  { label: "Team 4", className: "bg-white", colour: "White" },
] as const;

export function TourneyPlayersList({
  game,
  gameStatus,
  capacity,
  index,
  nextGameDate,
  ...rest
}: Omit<IPlayersList, "confirmedList" | "waitlist">) {
  const gameCancelled = game.cancelled === true;
  const confirmedList = useMemo(() => {
    const flatTourneyPlayers = Object.values(game.teams ?? {}).flatMap((t) => [
      ...t.players,
    ]);

    return flatTourneyPlayers.slice(0, TOURNEY_MAX_SIGNUPS);
  }, [game.teams]);

  if (
    game.teams === undefined ||
    (rest.user.role !== Role.ADMIN && game.hidden === true)
  ) {
    return null;
  }

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
      collapsedHeight={gameCancelled ? 140 : capacity[index] <= 0 ? 182 : 160}
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
      <div className="flex flex-col gap-y-8">
        {game.teams.map(({ players }, teamIndex) => (
          <div
            key={TEAMS_INFO[teamIndex]?.label ?? teamIndex}
            className="flex flex-col gap-y-0"
          >
            <div
              className="container ml-auto w-[90%] sm:w-[350px] flex items-center gap-x-2 font-bold justify-end !py-0.5"
              onClick={(e) => {
                e.stopPropagation();
              }}
            >
              {TEAMS_INFO[teamIndex]?.label ?? ""} -{" "}
              {TEAMS_INFO[teamIndex]?.colour ?? ""}
              <div
                className={cn(TEAMS_INFO[teamIndex]?.className, "w-7.5 h-5")}
              />
            </div>
            <PlayersList
              {...rest}
              game={game}
              gameStatus={gameStatus}
              confirmedList={players.slice(0, MAX_SIGNUPS_PER_GAME)}
              waitlist={players.slice(MAX_SIGNUPS_PER_GAME)}
              nextGameDate={nextGameDate}
            />
          </div>
        ))}
      </div>
    </Collapsible>
  );
}
