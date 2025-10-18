import { PlayersList } from "./PlayersList";
import { StyledGamesList, type IStyledGamesList } from "./StyledGamesList";
import type { IPlayersList } from "./types";

import { MAX_SIGNUPS_PER_GAME } from "@/constants/signups";
import { GameType } from "@/types/games";

export function StandardPlayersList({
  game,
  usersById,
  nextGameDate,
  collapsedHeight,
  ...rest
}: Omit<IPlayersList, "confirmedList" | "waitlist"> &
  Pick<IStyledGamesList, "collapsedHeight">) {
  const gameCancelled = game.cancelled === true || game.hidden === true;
  const confirmedList = game.players.slice(
    0,
    MAX_SIGNUPS_PER_GAME[game.type ?? GameType.STANDARD],
  );
  const waitlist = game.players.slice(
    MAX_SIGNUPS_PER_GAME[game.type ?? GameType.STANDARD],
  );

  return (
    <StyledGamesList
      game={game}
      gameCancelled={gameCancelled}
      waitlistAmt={waitlist.length}
      confirmedList={confirmedList}
      nextGameDate={nextGameDate}
      collapsedHeight={collapsedHeight}
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
