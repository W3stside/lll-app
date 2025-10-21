import type { NextApiRequest, NextApiResponse } from "next";
import twilio from "twilio";

import type { SendCodeResponse, SendCodeRequestBody } from "@/types/verify";

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
    console.error("Twilio send error:", error);
    res.status(500).json({
      error: "Failed to send verification code",
      message: errorMessage,
    });
  }
}
