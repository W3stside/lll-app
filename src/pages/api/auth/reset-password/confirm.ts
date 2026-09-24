/* eslint-disable no-console */
// Step two of "Forgot your password?": a correct code sets the new password
// and logs the player in. Twilio limits the guesses per code, and every
// failure gets the same answer.

import bcrypt from "bcryptjs";
import type { NextApiRequest, NextApiResponse } from "next";

import { SALT_ROUNDS } from "@/constants/api";
import { PASSWORD_MIN_LENGTH } from "@/constants/signups";
import { refreshAndSetJwtTokens } from "@/lib/authUtils";
import client from "@/lib/mongodb";
import { findResettableUser } from "@/lib/passwordReset";
import { isSmsCodeApproved } from "@/lib/verification/twilioVerify";
import { Collection, type IUser } from "@/types";
import { isValidPhoneNumber, toE164 } from "@/utils/signup";

// bcrypt only reads 72 bytes; this just bounds the work one request can ask for
const PASSWORD_MAX_LENGTH = 128;
const CODE_REGEX = /^\d{4,10}$/;
const INVALID_CODE_MESSAGE =
  "That code is wrong or has expired. Check it, or ask for a new one.";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { phone_number, code, password } = (req.body ?? {}) as Record<
    string,
    unknown
  >;

  if (
    typeof password !== "string" ||
    password.length < PASSWORD_MIN_LENGTH ||
    password.length > PASSWORD_MAX_LENGTH
  ) {
    res.status(400).json({
      error: `Your new password needs ${PASSWORD_MIN_LENGTH} to ${PASSWORD_MAX_LENGTH} characters.`,
    });
    return;
  }

  if (
    typeof phone_number !== "string" ||
    !isValidPhoneNumber(phone_number) ||
    typeof code !== "string" ||
    !CODE_REGEX.test(code)
  ) {
    res.status(400).json({ error: INVALID_CODE_MESSAGE });
    return;
  }

  try {
    const user = await findResettableUser(phone_number);
    const to = user !== null ? toE164(user.phone_number) : null;

    if (user === null || to === null || !(await isSmsCodeApproved(to, code))) {
      res.status(400).json({ error: INVALID_CODE_MESSAGE });
      return;
    }

    // The code proves the number is theirs, the same proof SMS verification
    // asks for, so accounts from before verification come out verified too
    const updated = await client
      .db("LLL")
      .collection<IUser>(Collection.USERS)
      .findOneAndUpdate(
        { _id: user._id },
        {
          $set: {
            password: await bcrypt.hash(password, SALT_ROUNDS),
            verified: true,
          },
        },
        { returnDocument: "after", projection: { password: 0 } },
      );

    // Deleted between the check and the update
    if (updated === null) {
      res.status(400).json({ error: INVALID_CODE_MESSAGE });
      return;
    }

    refreshAndSetJwtTokens({ _id: updated._id }, res);
    res.status(200).json({ success: true, user: updated });
  } catch (error) {
    console.error("[reset-password] Failed to reset the password:", error);
    res.status(500).json({
      error: "Couldn't reset your password right now. Try again in a minute.",
    });
  }
}
