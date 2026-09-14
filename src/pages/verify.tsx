import { ObjectId } from "mongodb";
import type { GetServerSideProps } from "next";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import React, { useCallback, useEffect, useRef, useState } from "react";

import mail from "@/assets/mail.png";
import { Loader } from "@/components/ui";
import { RED_TW } from "@/constants/colours";
import { NAVLINKS_MAP, WHATS_APP_GROUP_URL } from "@/constants/links";
import {
  PHONE_FORMAT_ERROR,
  PHONE_FORMAT_EXAMPLE,
  PHONE_FORMAT_HINT,
  VERIFICATION_COOLDOWN_KEY,
  VERIFICATION_STEP_KEY,
} from "@/constants/signups";
import { useActions } from "@/context/Actions/context";
import { useUser } from "@/context/User/context";
import { JWT_REFRESH_SECRET, JWT_SECRET, verifyToken } from "@/lib/authUtils";
import client from "@/lib/mongodb";
import { sendVerificationCode, verifyCode } from "@/lib/verification/sms";
import { type IUser, type IUserFromCookies, Collection } from "@/types";
import { isValidInternationalPhoneNumber } from "@/utils/signup";
import { cn } from "@/utils/tailwind";

const COOLDOWN_SECONDS = 60;

export const getServerSideProps: GetServerSideProps = async (context) => {
  // 1. Get the session (accessing cookies/headers on the server)
  const { token } = context.req.cookies;
  const user =
    token === undefined
      ? undefined
      : verifyToken<IUserFromCookies>(
          token,
          JWT_SECRET as string,
          JWT_REFRESH_SECRET,
        );

  // User is not verified, redirect them to login
  if (user === undefined) {
    return {
      redirect: {
        destination: NAVLINKS_MAP.LOGIN,
        permanent: false,
      },
    };
  }

  await client.connect();
  const currUser = await client
    .db("LLL")
    .collection<IUser>(Collection.USERS)
    .findOne({ _id: new ObjectId(user._id) });

  if (currUser?.verified === true) {
    return {
      redirect: {
        destination: NAVLINKS_MAP.HOME,
        permanent: false,
      },
    };
  }

  return {
    props: {},
  };
};

export default function Verify() {
  const { user, setUser } = useUser();
  const phoneNumberRef = useRef<string>(user.phone_number);

  const [step, setStep] = useState<"code" | "phone">();
  const [code, setCode] = useState("");
  const [cooldown, setCooldown] = useState<number>();

  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  const sendCode = useCallback(
    async (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      setError(undefined);

      if (!isValidInternationalPhoneNumber(user.phone_number)) {
        setError(PHONE_FORMAT_ERROR);
        return;
      }

      setLoading(true);

      try {
        const data = await sendVerificationCode();

        if (data.success === true) {
          setStep("code");
          // Start cooldown for resend
          setCooldown(COOLDOWN_SECONDS);
        } else {
          setError(data.error ?? "Failed to send code");
        }
      } catch (err) {
        setError(
          `Error: ${
            err instanceof Error ? err.message : "Check with an admin."
          }`,
        );
      } finally {
        setLoading(false);
      }
    },
    [user.phone_number],
  );

  const handleVerifyCode = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      setError(undefined);

      try {
        // The server marks the account verified itself when the code matches
        const {
          message,
          error: verifyError,
          verified = false,
        } = await verifyCode(code);

        if (verified) {
          setUser((prev) => ({ ...prev, verified: true }));
          setStep(undefined);
          setCooldown(0);
          void router.push(NAVLINKS_MAP.HOME);
        } else {
          setError(message ?? verifyError ?? "Invalid verification code");
        }
      } catch (err) {
        setError(
          `Error: ${
            err instanceof Error ? err.message : "Check with an admin."
          }`,
        );
      } finally {
        setLoading(false);
      }
    },
    [code, router, setUser],
  );

  // updateUser rethrows into the catch below, so its context error isn't read:
  // that one only resets on the next updateUser call and would linger on screen
  const { updateUser } = useActions();
  const [numberEditable, setNumberEditable] = useState(false);
  const handleChangePhoneNumber = useCallback(async () => {
    setError(undefined);
    try {
      if (!isValidInternationalPhoneNumber(user.phone_number)) {
        throw new Error(PHONE_FORMAT_ERROR);
      }

      await updateUser({
        ...user,
        phone_number: user.phone_number.replace(/^\+/, ""),
      });

      setNumberEditable(false);
    } catch (e) {
      const err = e instanceof Error ? e : new Error("Unknown error");
      setError(err.message);
    }
  }, [updateUser, user]);

  const handleCancelChangePhoneNumber = useCallback(() => {
    setError(undefined);
    setNumberEditable(false);
    setUser((u) => ({ ...u, phone_number: phoneNumberRef.current }));
  }, [setUser]);

  // Track the saved number whenever it isn't being edited, so cancelling or a
  // rejected change can restore it. It arrives after mount on a page refresh.
  useEffect(() => {
    if (!numberEditable) {
      phoneNumberRef.current = user.phone_number;
    }
  }, [numberEditable, user.phone_number]);

  useEffect(() => {
    setCooldown(
      localStorage.getItem(VERIFICATION_COOLDOWN_KEY) !== null
        ? Number(localStorage.getItem(VERIFICATION_COOLDOWN_KEY))
        : 0,
    );
    setStep(
      localStorage.getItem(VERIFICATION_STEP_KEY) === "code" ? "code" : "phone",
    );
  }, []);

  useEffect(() => {
    localStorage.setItem(
      VERIFICATION_STEP_KEY,
      step === undefined ? "phone" : step,
    );
  }, [step]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCooldown((prev) => {
        if (prev === undefined) return undefined;
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(interval);
      if (cooldown !== undefined) {
        localStorage.setItem(VERIFICATION_COOLDOWN_KEY, cooldown.toString());
      }
    };
  }, [cooldown]);

  // Reset number to prev if new change exists
  useEffect(() => {
    if (
      error !== undefined &&
      error.includes("User with this number already exists")
    ) {
      setUser((u) => ({
        ...u,
        phone_number: phoneNumberRef.current || u.phone_number,
      }));
    }
  }, [error, setUser]);

  return (
    <div className="flex flex-col gap-y-1 text-black container">
      <div className="container-header !h-auto -mt-2 -mx-1.5">
        <h4 className="mr-auto px-2 py-1">Verify</h4> X
      </div>
      <div className="px-2 py-2">
        <p className="mb-5">
          Enter the phone number you're using in the{" "}
          <Link href={WHATS_APP_GROUP_URL} target="_blank" rel="noreferrer">
            LLL WhatsApp group
          </Link>{" "}
          to receive your verification code. If you haven't joined the group
          yet, click the link above and send us a message!
        </p>
        {step !== undefined ? (
          <div className="m-auto w-[90%]">
            {step === "phone" ? (
              <form onSubmit={sendCode}>
                <div className="mb-[15px] w-full">
                  <label htmlFor="phone">Country Code and Phone Number</label>
                  <input
                    id="phone"
                    type="tel"
                    placeholder={PHONE_FORMAT_EXAMPLE}
                    value={user.phone_number}
                    onChange={(e) => {
                      if (!/^(?!.*[+\-*/])\d*$/.test(e.target.value)) {
                        return;
                      }

                      setUser((u) => ({
                        ...u,
                        phone_number: e.target.value,
                      }));
                    }}
                    required
                    disabled={!numberEditable}
                    className={cn(
                      "w-full p-2 [&:disabled]:bg-[var(--background-color-2)] ",
                    )}
                  />
                  <small className="block">{PHONE_FORMAT_HINT}</small>
                </div>

                {error !== undefined && <p style={{ color: "red" }}>{error}</p>}

                <div className="flex flex-col gap-y-2 [&>*]:flex [&>*]:justify-center">
                  {/* Not disabled by an error, so a failed send can be retried */}
                  <button
                    type="submit"
                    disabled={
                      numberEditable ||
                      loading ||
                      cooldown === undefined ||
                      cooldown > 0
                    }
                    className="flex items-center justify-center gap-x-2 w-full"
                  >
                    <Image src={mail} alt="Mail Icon" className="size-8 mr-2" />{" "}
                    <b>
                      {loading ? "Sending..." : "Send verification code"}
                      {!loading &&
                        cooldown !== undefined &&
                        cooldown > 0 &&
                        ` (${cooldown}s)`}
                    </b>
                  </button>
                  {!numberEditable ? (
                    <p
                      onClick={() => {
                        setNumberEditable(true);
                      }}
                      className="mx-auto py-2.5 px-0 w-max cursor-pointer"
                    >
                      <i>
                        <u>Change phone number</u>
                      </i>
                    </p>
                  ) : (
                    // Outside any clickable <p> and typed "button" so saving doesn't
                    // also toggle edit mode or submit the send-code form
                    <div className="gap-x-2">
                      <button
                        type="button"
                        onClick={handleChangePhoneNumber}
                        disabled={
                          cooldown === undefined || cooldown > 0 || loading
                        }
                      >
                        {cooldown !== undefined && cooldown > 0
                          ? `Retry in (${cooldown}s)`
                          : "Save changes"}
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelChangePhoneNumber}
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              </form>
            ) : (
              <form onSubmit={handleVerifyCode}>
                <p>Code sent to {user.phone_number}</p>

                <div className="mb-4">
                  <label
                    htmlFor="code"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Verification Code
                  </label>
                  <input
                    id="code"
                    type="text"
                    placeholder="123456"
                    value={code}
                    onChange={(e) => {
                      setCode(e.target.value);
                    }}
                    required
                    maxLength={6}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                {error !== undefined && (
                  <p className={`pl-4 ${RED_TW}`}>{error}</p>
                )}

                <div className="flex justify-between gap-x-6">
                  <button
                    type="submit"
                    disabled={loading || code.length !== 6}
                    className="flex justify-center w-full px-4 py-2 mb-2 text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {loading ? "Verifying..." : "Verify Code"}
                  </button>

                  <button
                    type="button"
                    onClick={sendCode}
                    disabled={cooldown === undefined || cooldown > 0 || loading}
                    className={`flex justify-center w-full py-2 px-4 mb-2 ${(cooldown !== undefined && cooldown > 0) || loading ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    {cooldown !== undefined && cooldown > 0
                      ? `Resend Code (${cooldown}s)`
                      : "Resend Code"}
                  </button>
                </div>
                {/* The step survives reloads, so this is the only way back to
                    fix a mistyped number once a code has been sent */}
                <p
                  onClick={() => {
                    setCode("");
                    setError(undefined);
                    setNumberEditable(true);
                    setStep("phone");
                  }}
                  className="mx-auto py-2.5 px-0 w-max cursor-pointer"
                >
                  <i>
                    <u>Wrong number? Change it</u>
                  </i>
                </p>
              </form>
            )}
          </div>
        ) : (
          <Loader className="size-[300px] mx-auto" />
        )}
      </div>
    </div>
  );
}
