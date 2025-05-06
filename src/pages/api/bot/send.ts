import type { NextApiRequest, NextApiResponse } from "next";

import {
  sendBotNotification,
  type BotMessagePayload,
  type BotMessageResponse,
} from "@/lib/bot/sendBotMessage";

if (
  process.env.WHATSAPP_BOT_API_URL === undefined ||
  process.env.WHATSAPP_BOT_API_CLIENT_ID === undefined ||
  process.env.WHATSAPP_BOT_API_CLIENT_SECRET === undefined ||
  process.env.WHATSAPP_BOT_CHANNEL_ID === undefined
) {
  throw new Error("Missing WhatsApp Bot API environment variables");
}

type ErrorResponse = {
  error: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<BotMessageResponse | ErrorResponse>,
) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const { id, channel, whatsapp_payload } = req.body as BotMessagePayload;

    const recipients = [process.env.WHATSAPP_BOT_CHANNEL_ID] as [string];

    if (!id || !channel || !whatsapp_payload.text) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    const data = await sendBotNotification({
      id,
      channel,
      recipients,
      whatsapp_payload,
    });

    res.status(200).json(data);
  } catch (err) {
    const error =
      err instanceof Error ? err : new Error("Internal server error");
    res.status(500).json({ error: error.message });
  }
}
