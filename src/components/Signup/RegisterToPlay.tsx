import { type ISignupForm, SignupForm } from "./SignupForm";
import { Loader } from "../ui";

import { cn } from "@/utils/tailwind";

interface IRegisterToPlay extends Omit<ISignupForm, "handleSubmit"> {
  loading: boolean;
  label: string;
  handleSignup: () => Promise<void>;
}

export function RegisterToPlay({
  games,
  label,
  loading,
  gameId,
  userId,
  disabled = false,
  setGameId,
  handleSignup,
}: IRegisterToPlay) {
  const isDisabled =
    loading || gameId === "" || gameId === undefined || disabled;
  return (
    <div
      className={cn("flex flex-col items-center mt-auto mb-8 w-full gap-y-6", {
        "cursor-auto": isDisabled,
      })}
    >
      <div className="container-header !h-auto !text-2xl p-1 w-full -mb-3.5">
        Register to play
      </div>
      {disabled ? (
        <div className="container h-20 font-bold justify-center items-center">
          You're fully registered ✅
        </div>
      ) : (
        <SignupForm
          userId={userId}
          games={games ?? null}
          gameId={gameId}
          disabled={disabled}
          setGameId={setGameId}
        />
      )}
      <button
        className="h-[56px] overflow-hidden w-full lg:w-[350px] text-2xl p-4 justify-center"
        disabled={isDisabled}
        onClick={handleSignup}
      >
        {loading ? <Loader className="-mt-[30px] w-30 h-[90px]" /> : label}
      </button>
    </div>
  );
}
