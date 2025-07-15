import { useMemo } from "react";

import { PlayersList } from "./PlayersList";
import { StyledGamesList } from "./StyledGamesList";
import type { IPlayersList } from "./types";

import {
  MAX_SIGNUPS_PER_GAME,
  MAX_SIGNUPS_PER_TOURNEY,
} from "@/constants/signups";
import { Role } from "@/types";
import { cn } from "@/utils/tailwind";

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
  const { confirmedList, waitlist } = useMemo(() => {
    const flatTourneyPlayers = Object.values(game.teams ?? {}).flatMap((t) => [
      ...t.players,
    ]);

    return {
      confirmedList: flatTourneyPlayers.slice(0, MAX_SIGNUPS_PER_TOURNEY),
      waitlist: game.players.slice(MAX_SIGNUPS_PER_TOURNEY * 4),
    };
  }, [game.players, game.teams]);

  if (
    game.teams === undefined ||
    (rest.user.role !== Role.ADMIN && game.hidden === true)
  ) {
    return null;
  }

  return (
    <StyledGamesList
      game={game}
      gameCancelled={gameCancelled}
      capacity={capacity}
      index={index}
      confirmedList={confirmedList}
      nextGameDate={nextGameDate}
    >
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
              waitlist={[]}
              nextGameDate={nextGameDate}
            />
          </div>
        ))}
        {waitlist.length > 0 && (
          <PlayersList
            {...rest}
            game={game}
            gameStatus={gameStatus}
            confirmedList={[]}
            waitlist={waitlist}
            nextGameDate={nextGameDate}
          />
        )}
      </div>
    </StyledGamesList>
  );
}
