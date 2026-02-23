import { useMemo } from "react";

import { PlayersList } from "./PlayersList";
import { StyledGamesList } from "./StyledGamesList";
import type { IPlayersList } from "./types";

import { MAX_SIGNUPS_PER_GAME } from "@/constants/signups";
import { GameType, Role } from "@/types";

export function TourneyPlayersList({
  game,
  gameStatus,
  nextGameDate,
  ...rest
}: Omit<IPlayersList, "confirmedList" | "waitlist">) {
  const gameCancelled = game.cancelled === true || game.hidden === true;
  const { confirmedList, waitlist } = useMemo(() => {
    const flatTourneyPlayers = Object.values(game.teams ?? {}).flatMap((t) => [
      ...t.players,
    ]);

    const maxConfirmed =
      MAX_SIGNUPS_PER_GAME[GameType.TOURNAMENT_RANDOM] *
      (game.teams?.length ?? 4);

    return {
      confirmedList: flatTourneyPlayers.slice(0, maxConfirmed),
      waitlist: game.players.slice(maxConfirmed),
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
      waitlistAmt={waitlist.length}
      confirmedList={confirmedList}
      nextGameDate={nextGameDate}
      collapsible={{
        collapsedHeight: 200,
        disabled: true,
      }}
    >
      <div className="flex flex-col gap-y-8">
        {game.teams.map(({ name, players }, teamIndex) => {
          const teamName = name ?? `Team ${teamIndex}`;
          return (
            <div key={teamName} className="flex flex-col gap-y-0">
              <div
                className="container ml-auto w-[90%] sm:w-[350px] flex items-center gap-x-2 font-bold justify-end !py-0.5"
                onClick={(e) => {
                  e.stopPropagation();
                }}
              >
                {teamName}
                {name === undefined && <div className="w-7.5 h-5" />}
              </div>
              <PlayersList
                {...rest}
                game={game}
                gameStatus={gameStatus}
                confirmedList={players.slice(
                  0,
                  MAX_SIGNUPS_PER_GAME[GameType.TOURNAMENT_RANDOM],
                )}
                waitlist={[]}
                nextGameDate={nextGameDate}
              />
            </div>
          );
        })}
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
