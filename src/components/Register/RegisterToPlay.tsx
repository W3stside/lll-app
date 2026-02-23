import Link from "next/link";
import { useState, useEffect, useCallback } from "react";

import { type ISignupForm, SignupForm } from "../Signup/SignupForm";
import { Loader } from "../ui";

import { DialogVariant, useDialog } from "@/context/Dialog/context";
import { cn } from "@/utils/tailwind";

interface IRegisterToPlay extends Omit<ISignupForm, "handleSubmit"> {
  loading: boolean;
  label: string;
  submitDisabled?: boolean;
  handleSignup: () => Promise<void>;
}

interface IDisclaimerContentProps {
  onAgreed: (agreed: boolean) => void;
}

function DisclaimerContent({ onAgreed }: IDisclaimerContentProps) {
  const [agreedToCancel, setAgreedToCancel] = useState(false);
  const [agreedToCash, setAgreedToCash] = useState(false);

  useEffect(() => {
    onAgreed(agreedToCancel && agreedToCash);
  }, [agreedToCancel, agreedToCash, onAgreed]);

  return (
    <div className="flex flex-col gap-y-4 p-4 w-full text-black text-sm">
      <label className="flex items-start gap-x-3 cursor-pointer">
        <input
          type="checkbox"
          className="mt-1 w-4 h-4 !w-auto"
          checked={agreedToCancel}
          onChange={(e) => {
            setAgreedToCancel(e.target.checked);
          }}
        />
        <span>
          I accept the{" "}
          <Link href="/about" className="underline font-bold" target="_blank">
            cancellation policy
          </Link>
        </span>
      </label>
      <label className="flex items-start gap-x-3 cursor-pointer">
        <input
          type="checkbox"
          className="mt-1 w-4 h-4 !w-auto"
          checked={agreedToCash}
          onChange={(e) => {
            setAgreedToCash(e.target.checked);
          }}
        />
        <span>
          I understand that payment methods are <strong>CASH ONLY</strong>
        </span>
      </label>
    </div>
  );
}

export function RegisterToPlay({
  games,
  label,
  loading,
  gameId,
  userId,
  disabled = false,
  submitDisabled = false,
  setGameId,
  handleSignup,
}: IRegisterToPlay) {
  const { variant, openDialog } = useDialog();
  const [canConfirm, setCanConfirm] = useState(false);

  const onConfirm = useCallback(() => {
    localStorage.setItem("disclaimer-agreed", "true");
    openDialog(undefined);
    void handleSignup();
  }, [handleSignup, openDialog]);

  const showDisclaimer = useCallback(
    (isConfirmDisabled: boolean) => {
      openDialog({
        variant: DialogVariant.CONFIRM,
        title: "Disclaimer",
        content: <DisclaimerContent onAgreed={setCanConfirm} />,
        action: onConfirm,
        confirmDisabled: isConfirmDisabled,
      });
    },
    [onConfirm, openDialog],
  );

  useEffect(() => {
    const hasAgreed = localStorage.getItem("disclaimer-agreed") === "true";
    if (!hasAgreed && variant === DialogVariant.CONFIRM) {
      showDisclaimer(!canConfirm);
    }
  }, [canConfirm, showDisclaimer, variant]);

  const handleRegisterClick = useCallback(() => {
    const hasAgreed = localStorage.getItem("disclaimer-agreed") === "true";
    if (hasAgreed) {
      void handleSignup();
    } else {
      showDisclaimer(!canConfirm);
    }
  }, [canConfirm, handleSignup, showDisclaimer]);

  const isDisabled =
    loading ||
    submitDisabled ||
    gameId === "" ||
    gameId === undefined ||
    disabled;

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
          games={games}
          gameId={gameId}
          disabled={disabled}
          setGameId={setGameId}
        />
      )}
      <button
        className="h-[56px] overflow-hidden w-full lg:w-[350px] text-2xl p-4 justify-center"
        disabled={isDisabled}
        onClick={handleRegisterClick}
      >
        {loading ? <Loader className="-mt-[30px] w-30 h-[90px]" /> : label}
      </button>
    </div>
  );
}
