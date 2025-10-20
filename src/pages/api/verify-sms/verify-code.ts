import type { NextApiRequest, NextApiResponse } from "next";
import twilio from "twilio";

import type { VerifyCodeRequestBody } from "@/types/verify";

if (process.env.TWILIO_VERIFY_SERVICE_SID === undefined) {
  throw new Error("TWILIO_VERIFY_SERVICE_SID is not defined");
}

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN,
);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
  }

  const { phoneNumber, code } = req.body as VerifyCodeRequestBody;

  if (!phoneNumber || !code) {
    res.status(400).json({ error: "Phone number and code are required" });
  }

  const formattedPhone = phoneNumber.startsWith("+")
    ? phoneNumber
    : `+${phoneNumber}`;

  try {
    const verificationCheck = await client.verify.v2
      .services(process.env.TWILIO_VERIFY_SERVICE_SID as string)
      .verificationChecks.create({
        to: formattedPhone,
        code,
      });

    if (verificationCheck.status === "approved") {
      // Here you can create a session, JWT token, etc.
      res.status(200).json({
        success: true,
        verified: true,
        status: verificationCheck.status,
      });
    }
    res.status(400).json({
      success: false,
      verified: false,
      message: "Invalid verification code",
    });
  } catch (error: unknown) {
    console.error("Twilio verify error:", error);
    res.status(500).json({
      error: "Failed to verify code",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
