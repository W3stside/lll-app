import Link from "next/link";
import { useRouter } from "next/router";
import React, { useCallback, useEffect, useState } from "react";

import { RED_TW } from "@/constants/colours";
import { NAVLINKS_MAP, WHATS_APP_GROUP_URL } from "@/constants/links";
import {
  PASSWORD_MIN_LENGTH,
  PHONE_FORMAT_EXAMPLE,
  PHONE_FORMAT_HINT,
  RESET_CODE_COOLDOWN_SECONDS,
} from "@/constants/signups";
import { useUser } from "@/context/User/context";
import { resetPassword, sendPasswordResetCode } from "@/lib/verification/sms";
import { isValidPhoneNumber } from "@/utils/signup";

// Same rule as the signup form: digits only, no "+"
const PHONE_INPUT_REGEX = /^(?!.*[+\-*/])\d*$/;
const MIN_CODE_LENGTH = 4;

export default function ResetPassword() {
  const router = useRouter();
  const { setUser } = useUser();

  const [step, setStep] = useState<"code" | "phone">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [notice, setNotice] = useState<string>();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);
  // Seconds until another code can be asked for
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return undefined;

    const timeout = setTimeout(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);

    return () => {
      clearTimeout(timeout);
    };
  }, [cooldown]);

  const sendCode = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();
      setError(undefined);

      if (!isValidPhoneNumber(phone)) {
        setError(PHONE_FORMAT_HINT);
        return;
      }

      setLoading(true);
      try {
        const {
          status,
          success,
          message,
          error: sendError,
        } = await sendPasswordResetCode(phone);

        // Only a rejected number is sure not to have used up a text
        if (status !== 400) setCooldown(RESET_CODE_COOLDOWN_SECONDS);

        if (success === true) {
          setNotice(message);
          setStep("code");
        } else {
          setError(sendError ?? "Couldn't send a code. Try again in a minute.");
        }
      } catch (err) {
        setError("Couldn't send a code. Check your connection and try again.");
      } finally {
        setLoading(false);
      }
    },
    [phone],
  );

  const passwordsMatch = password === confirmation;
  const canReset =
    !loading &&
    code.length >= MIN_CODE_LENGTH &&
    password.length >= PASSWORD_MIN_LENGTH &&
    passwordsMatch;

  const handleReset = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(undefined);
      setLoading(true);

      try {
        const {
          success,
          user,
          error: resetError,
        } = await resetPassword({ phone_number: phone, code, password });

        if (success === true && user !== undefined) {
          // Logged in now: the session cookies came with the response
          setUser(user);
          void router.push(NAVLINKS_MAP.SIGNUP);
          return;
        }

        setError(resetError ?? "Couldn't reset your password. Try again.");
      } catch (err) {
        setError(
          "Couldn't reset your password. Check your connection and try again.",
        );
      } finally {
        setLoading(false);
      }
    },
    [code, password, phone, router, setUser],
  );

  return (
    <div className="flex flex-col gap-y-1 text-black container">
      <div className="container-header !h-auto -mt-2 -mx-1.5">
        <h4 className="mr-auto px-2 py-1">Reset password</h4> X
      </div>
      <div className="px-2 py-2">
        {step === "phone" ? (
          <form onSubmit={sendCode} className="flex flex-col gap-y-2">
            <p className="mb-3">
              Enter the phone number on your account and we&apos;ll text you a
              code to set a new password.
            </p>
            <label htmlFor="reset-phone">Country code and phone number</label>
            <input
              id="reset-phone"
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              placeholder={PHONE_FORMAT_EXAMPLE}
              value={phone}
              onChange={(e) => {
                if (PHONE_INPUT_REGEX.test(e.target.value)) {
                  setPhone(e.target.value);
                }
              }}
              required
            />
            <small>{PHONE_FORMAT_HINT}</small>
            <button
              type="submit"
              className="mt-2 w-full justify-center"
              disabled={loading || cooldown > 0 || phone === ""}
            >
              <b>
                {loading ? "Sending..." : "Text me a code"}
                {!loading && cooldown > 0 && ` (${cooldown}s)`}
              </b>
            </button>
          </form>
        ) : (
          <form onSubmit={handleReset} className="flex flex-col gap-y-2">
            {notice !== undefined && <p className="mb-2">{notice}</p>}
            <label htmlFor="reset-code">Code</label>
            <input
              id="reset-code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="123456"
              maxLength={10}
              value={code}
              onChange={(e) => {
                setCode(e.target.value.replace(/\D/g, ""));
              }}
              required
            />
            <label htmlFor="reset-new-password">New password</label>
            <input
              id="reset-new-password"
              type="password"
              autoComplete="new-password"
              placeholder={`Min. ${PASSWORD_MIN_LENGTH} characters`}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
              }}
              required
            />
            <label htmlFor="reset-new-password-confirmation">
              Confirm new password
            </label>
            <input
              id="reset-new-password-confirmation"
              type="password"
              autoComplete="new-password"
              value={confirmation}
              onChange={(e) => {
                setConfirmation(e.target.value);
              }}
              required
            />
            {confirmation !== "" && !passwordsMatch && (
              <small>The passwords don&apos;t match.</small>
            )}
            <button
              type="submit"
              className="mt-2 w-full justify-center"
              disabled={!canReset}
            >
              <b>{loading ? "Saving..." : "Set new password"}</b>
            </button>
            <div className="flex flex-wrap justify-between gap-2 text-sm">
              <button
                type="button"
                disabled={loading || cooldown > 0}
                onClick={() => {
                  void sendCode();
                }}
              >
                Resend code{cooldown > 0 && ` (${cooldown}s)`}
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => {
                  setStep("phone");
                  setCode("");
                  setNotice(undefined);
                  setError(undefined);
                }}
              >
                Use a different number
              </button>
            </div>
            <small>
              No text after a few minutes? Ask an admin in the{" "}
              <Link href={WHATS_APP_GROUP_URL} target="_blank" rel="noreferrer">
                WhatsApp group
              </Link>
              .
            </small>
          </form>
        )}
        {error !== undefined && (
          <p role="alert" className={`mt-3 px-2 py-1 ${RED_TW}`}>
            {error}
          </p>
        )}
        <p className="mt-4 text-sm">
          <Link href={NAVLINKS_MAP.LOGIN}>Back to login</Link>
        </p>
      </div>
    </div>
  );
}
