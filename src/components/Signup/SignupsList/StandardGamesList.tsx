import { PlayersList } from "./PlayersList";
import { StyledGamesList } from "./StyledGamesList";
import type { IPlayersList } from "./types";

import { MAX_SIGNUPS_PER_GAME } from "@/constants/signups";

export function StandardPlayersList({
  game,
  usersById,
  capacity,
  nextGameDate,
  index,
  ...rest
}: Omit<IPlayersList, "confirmedList" | "waitlist">) {
  const gameCancelled = game.cancelled === true || game.hidden === true;
  const confirmedList = game.players.slice(0, MAX_SIGNUPS_PER_GAME);
  const waitlist = game.players.slice(MAX_SIGNUPS_PER_GAME);

  return (
    <StyledGamesList
      game={game}
      gameCancelled={gameCancelled}
      capacity={capacity}
      index={index}
      confirmedList={confirmedList}
      nextGameDate={nextGameDate}
    >
      <div className="flex flex-col gap-y-2">
        <PlayersList
          {...rest}
          game={game}
          usersById={usersById}
          confirmedList={confirmedList}
          waitlist={waitlist}
          nextGameDate={nextGameDate}
        />
      </div>
    </StyledGamesList>
  );
}
