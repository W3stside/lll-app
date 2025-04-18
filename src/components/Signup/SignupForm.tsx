import type { Dispatch, SetStateAction } from "react";

import { useStorageUser } from "@/hooks/useStorageUser";
import type { IGame, Signup } from "@/types/signups";

interface ISignupForm {
  playerStore: [
    Partial<Signup> | undefined,
    Dispatch<SetStateAction<Partial<Signup>>>,
  ];
  games: IGame[] | undefined;
}

export function SignupForm({
  games,
  playerStore: [player, setPlayer],
}: ISignupForm) {
  const user = useStorageUser();

  return (
    <div className="container flex flex-col items-center gap-y-2 p-4 w-full">
      <div className="flex flex-col items-center gap-y-2 p-2 w-full [&>input]:h-12">
        {games !== undefined && (
          <select
            name="game"
            id="game_id"
            defaultValue={undefined}
            value={player?.game_id}
            onChange={(e) => {
              const targetAsNumber = Number(e.target.value);
              if (isNaN(targetAsNumber)) return;

              setPlayer((prev) => ({
                ...prev,
                ...user,
                game_id: targetAsNumber,
              }));
            }}
          >
            <option value={undefined}>Please select a game</option>
            {games.map(({ game_id, time }) => (
              <option value={game_id} key={game_id}>
                Game {game_id} @ {time}
              </option>
            ))}
          </select>
        )}
        {user === undefined && (
          <>
            <input
              type="text"
              value={player?.first_name}
              onChange={(e) => {
                setPlayer((prev) => ({
                  ...prev,
                  first_name: e.target.value || undefined,
                }));
              }}
              placeholder="First name"
            />
            <input
              type="text"
              value={player?.last_name}
              onChange={(e) => {
                setPlayer((prev) => ({
                  ...prev,
                  last_name: e.target.value || undefined,
                }));
              }}
              placeholder="Last name"
            />
            <input
              type="number"
              value={player?.phone_number}
              onChange={(e) => {
                const targetAsNumber = Number(e.target.value);
                if (isNaN(targetAsNumber)) return;

                setPlayer((prev) => ({
                  ...prev,
                  phone_number: e.target.value,
                }));
              }}
              placeholder="351961666666"
            />
          </>
        )}
      </div>
    </div>
  );
}
