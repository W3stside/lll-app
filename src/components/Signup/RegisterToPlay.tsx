import type { Dispatch, SetStateAction } from "react";

import { SignupForm } from "./SignupForm";

import type { IGame, Signup } from "@/types/signups";
import { isValidPlayer } from "@/utils/signup";

interface IRegisterToPlay {
  games?: IGame[] | null;
  playerStore: [Partial<Signup>, Dispatch<SetStateAction<Partial<Signup>>>];
  loading: boolean;
  handleSignup: () => Promise<void>;
}

export function RegisterToPlay({
  games,
  playerStore,
  loading,
  handleSignup,
}: IRegisterToPlay) {
  const [player] = playerStore;

  return (
    <div className="flex flex-col items-center mt-auto mb-8 w-full gap-y-6">
      <div className="container-header !h-auto !text-2xl p-1 w-full -mb-3.5">
        Register to play
      </div>
      <SignupForm games={games ?? undefined} playerStore={playerStore} />
      <button
        className="w-full lg:w-[350px] text-2xl p-4 justify-center"
        disabled={
          loading ||
          !isValidPlayer({
            ...player,
            game_id: games === null ? 0 : player.game_id,
          })
        }
        onClick={async () => {
          await handleSignup();
        }}
      >
        {!loading ? "Sign up" : "Signing up..."}
      </button>
    </div>
  );
}
