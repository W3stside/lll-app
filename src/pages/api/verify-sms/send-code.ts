import type { NextApiRequest, NextApiResponse } from "next";
import twilio from "twilio";

import { PHONE_FORMAT_ERROR } from "@/constants/signups";
import type { SendCodeResponse, SendCodeRequestBody } from "@/types/verify";
import { isValidInternationalPhoneNumber } from "@/utils/signup";

const SEND_CODE_FALLBACK_ERROR = "Failed to send verification code";

// Failures a user can act on, keyed by Twilio error code
// https://www.twilio.com/docs/api/errors
const TWILIO_ERROR_MESSAGES: Partial<Record<number, string>> = {
  60200: PHONE_FORMAT_ERROR,
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

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SendCodeResponse>,
) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { phoneNumber } = req.body as SendCodeRequestBody;

  if (!phoneNumber || typeof phoneNumber !== "string") {
    res.status(400).json({ error: "Phone number is required" });
    return;
  }

  // Only a "+" gets prepended below, so the digits must already lead with the
  // country code. Rejecting here gives a clear message instead of Twilio's.
  if (!isValidInternationalPhoneNumber(phoneNumber.replace(/^\+/, ""))) {
    res.status(400).json({ error: PHONE_FORMAT_ERROR });
    return;
  }

  // Format: +1234567890 (must include country code)
  const formattedPhone = phoneNumber.startsWith("+")
    ? phoneNumber
    : `+${phoneNumber}`;

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
