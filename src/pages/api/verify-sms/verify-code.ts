/* eslint-disable no-console */
import { ObjectId } from "mongodb";
import type { NextApiRequest, NextApiResponse } from "next";
import twilio from "twilio";

import { getUserIdFromApiRequest } from "@/lib/authUtils";
import client from "@/lib/mongodb";
import { Collection } from "@/types";
import type { IUser } from "@/types/users";
import type { VerifyCodeRequestBody } from "@/types/verify";

if (process.env.TWILIO_VERIFY_SERVICE_SID === undefined) {
  throw new Error("TWILIO_VERIFY_SERVICE_SID is not defined");
}

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN,
);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const userId = getUserIdFromApiRequest(req.cookies);
  if (userId === null) {
    res.status(401).json({ error: "Not logged in" });
    return;
  }

  const { code } = req.body as Partial<VerifyCodeRequestBody>;
  if (typeof code !== "string" || code.length === 0) {
    res.status(400).json({ error: "Code is required" });
    return;
  }

  try {
    const users = client.db("LLL").collection<IUser>(Collection.USERS);
    const user = await users.findOne(
      { _id: new ObjectId(userId) },
      { projection: { phone_number: 1 } },
    );

    // Gone if register replaced this unverified account since the session began
    if (user === null) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    // Checked against the stored number rather than the request, or anyone could
    // verify an account with a phone they own that isn't the one on the account
    const formattedPhone = user.phone_number.startsWith("+")
      ? user.phone_number
      : `+${user.phone_number}`;

    const verificationCheck = await twilioClient.verify.v2
      .services(process.env.TWILIO_VERIFY_SERVICE_SID as string)
      .verificationChecks.create({
        to: formattedPhone,
        code,
      });

    if (verificationCheck.status !== "approved") {
      res.status(400).json({
        success: false,
        verified: false,
        message: "Invalid verification code",
      });
      return;
    }

    // Set here, not by the client, now that the users update API is admin-only
    await users.updateOne({ _id: user._id }, { $set: { verified: true } });

    res.status(200).json({
      success: true,
      verified: true,
      status: verificationCheck.status,
    });
  } catch (error: unknown) {
    console.error("Twilio verify error:", error);
    res.status(500).json({
      error: "Failed to verify code",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
