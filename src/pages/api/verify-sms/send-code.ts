import { ObjectId } from "mongodb";
import type { NextApiRequest, NextApiResponse } from "next";
import twilio from "twilio";

import { PHONE_FORMAT_ERROR } from "@/constants/signups";
import { getUserIdFromApiRequest } from "@/lib/authUtils";
import mongoClient from "@/lib/mongodb";
import { Collection } from "@/types";
import type { IUser } from "@/types/users";
import type { SendCodeResponse } from "@/types/verify";
import { isValidInternationalPhoneNumber } from "@/utils/signup";

const SEND_CODE_FALLBACK_ERROR = "Failed to send verification code";

// Failures a user can act on, keyed by Twilio error code
// https://www.twilio.com/docs/api/errors
const TWILIO_ERROR_MESSAGES: Partial<Record<number, string>> = {
  // Our own check already enforced the format, so this means Twilio doesn't
  // recognise the number as real (e.g. an unassigned range like +351 555...)
  60200:
    "This doesn't look like a real mobile number. Check the digits and try again.",
  60203:
    "Too many codes requested for this number. Wait 10 minutes before trying again.",
  60205: "This is a landline and can't receive SMS. Use a mobile number.",
  60410:
    "SMS to this number is currently blocked. Ask an admin in the WhatsApp group for help.",
  60605:
    "SMS to this number's country is blocked. Ask an admin in the WhatsApp group for help.",
};

function _getSendCodeErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) {
    return SEND_CODE_FALLBACK_ERROR;
  }

  const knownMessage =
    "code" in error && typeof error.code === "number"
      ? TWILIO_ERROR_MESSAGES[error.code]
      : undefined;

  return knownMessage ?? `${SEND_CODE_FALLBACK_ERROR}: ${error.message}`;
}

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN,
  {
    logLevel: "debug",
  },
);

if (process.env.TWILIO_VERIFY_SERVICE_SID === undefined) {
  throw new Error("TWILIO_VERIFY_SERVICE_SID is not defined");
}

const usersCollection = mongoClient
  .db("LLL")
  .collection<IUser>(Collection.USERS);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SendCodeResponse>,
) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  // Sent only to the logged-in user's stored number, never one from the body:
  // an open "text any number" endpoint gets abused for SMS pumping (bots
  // sending to premium-rate numbers they own, billed to our Twilio account)
  const userId = getUserIdFromApiRequest(req.cookies);
  if (userId === null) {
    res.status(401).json({ error: "Not logged in" });
    return;
  }

  const user = await usersCollection.findOne(
    { _id: new ObjectId(userId) },
    { projection: { phone_number: 1, verified: 1 } },
  );

  if (user === null) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  if (user.verified === true) {
    res.status(400).json({ error: "Account is already verified" });
    return;
  }

  const phoneNumber = user.phone_number.replace(/^\+/, "");

  // Only a "+" gets prepended below, so the digits must already lead with the
  // country code. Rejecting here gives a clear message instead of Twilio's.
  if (!isValidInternationalPhoneNumber(phoneNumber)) {
    res.status(400).json({ error: PHONE_FORMAT_ERROR });
    return;
  }

  const formattedPhone = `+${phoneNumber}`;

  try {
    const verification = await client.verify.v2
      .services(process.env.TWILIO_VERIFY_SERVICE_SID as string)
      .verifications.create({
        to: formattedPhone,
        channel: "sms",
      });

    res.status(200).json({
      success: true,
      status: verification.status,
      to: verification.to,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    // eslint-disable-next-line no-console
    console.error("Twilio send error:", error);
    res.status(500).json({
      error: _getSendCodeErrorMessage(error),
      message: errorMessage,
    });
  }
}
