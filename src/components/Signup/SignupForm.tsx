import type { ObjectId } from "mongodb";
import type { Dispatch, SetStateAction } from "react";

import { GameStatus, type IGame } from "@/types";
import { computeGameStatus } from "@/utils/games";
import { cn } from "@/utils/tailwind";

export interface ISignupForm {
  games: IGame[];
  userId: ObjectId;
  gameId: string | undefined;
  disabled?: boolean;
  setGameId: Dispatch<SetStateAction<string | undefined>>;
}

export function SignupForm({
  games,
  userId,
  gameId,
  disabled = false,
  setGameId,
}: ISignupForm) {
  return (
    <div className="container flex flex-col items-center gap-y-2 p-4 w-full">
      <div className="flex flex-col items-center gap-y-2 p-2 w-full [&>input]:h-12">
        <select
          disabled={disabled || games.length === 0}
          required
          name="game"
          id="game_id"
          className={cn("cursor-pointer", {
            "!bg-gray-400 text-gray-600": disabled,
          })}
          defaultValue={undefined}
          value={gameId}
          onChange={(e) => {
            setGameId(e.target.value);
          }}
        >
          <option value={""}>- Please select a game -</option>
          {games.map((game) => {
            const { _id, day, game_id, time, players } = game;
            return (
              <option
                disabled={
                  players.includes(userId.toString()) ||
                  computeGameStatus(games, day, game).gameStatus ===
                    GameStatus.PAST
                }
                value={_id.toString()}
                key={_id.toString()}
              >
                Game {game_id} @ {time}
              </option>
            );
          })}
        </select>
      </div>
    </div>
  );
}
