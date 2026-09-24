/* eslint-disable no-console */
// Step one of "Forgot your password?": texts a code to an account's number.
// Anyone can call this, so it only ever texts numbers already on an account,
// within the limits in lib/passwordReset, and it gives the same answer whether
// or not the number has an account.

import type { NextApiRequest, NextApiResponse } from "next";

import { PHONE_FORMAT_HINT } from "@/constants/signups";
import {
  claimPasswordResetText,
  findResettableUser,
} from "@/lib/passwordReset";
import { sendSmsCode } from "@/lib/verification/twilioVerify";
import { isValidPhoneNumber, toE164 } from "@/utils/signup";

const SENT_MESSAGE = "If that number has an account, we've texted it a code.";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { phone_number } = (req.body ?? {}) as { phone_number?: unknown };
  if (typeof phone_number !== "string" || !isValidPhoneNumber(phone_number)) {
    res.status(400).json({ error: PHONE_FORMAT_HINT });
    return;
  }

  try {
    const user = await findResettableUser(phone_number);
    const to = user !== null ? toE164(user.phone_number) : null;

    // No such account, or no text allowed yet: same answer, nothing sent
    if (
      user === null ||
      to === null ||
      !(await claimPasswordResetText(user._id.toString()))
    ) {
      res.status(200).json({ success: true, message: SENT_MESSAGE });
      return;
    }

    await sendSmsCode(to);
    res.status(200).json({ success: true, message: SENT_MESSAGE });
  } catch (error) {
    console.error("[reset-password] Failed to send a code:", error);
    res.status(500).json({
      error: "Couldn't send a code right now. Try again in a minute.",
    });
  }
}
