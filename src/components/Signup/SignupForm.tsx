import type { ObjectId } from "mongodb";
import type { Dispatch, SetStateAction } from "react";

import type { IGame } from "@/types";
import { cn } from "@/utils/tailwind";

export interface ISignupForm {
  userId: ObjectId;
  games: IGame[] | null;
  gameId: string | undefined;
  disabled?: boolean;
  setGameId: Dispatch<SetStateAction<string | undefined>>;
}

export function SignupForm({
  userId,
  games,
  gameId,
  disabled = false,
  setGameId,
}: ISignupForm) {
  return (
    <div className="container flex flex-col items-center gap-y-2 p-4 w-full">
      <div className="flex flex-col items-center gap-y-2 p-2 w-full [&>input]:h-12">
        <select
          disabled={disabled || games === null || games.length === 0}
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
          {games?.map(({ _id, game_id, time, players }) => (
            <option
              disabled={players.includes(userId.toString())}
              value={_id.toString()}
              key={_id.toString()}
            >
              Game {game_id} @ {time}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
