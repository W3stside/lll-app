import { getAccessToken } from "./tokenManager";

if (
  process.env.WHATSAPP_BOT_API_URL === undefined ||
  process.env.WHATSAPP_BOT_API_CLIENT_ID === undefined ||
  process.env.WHATSAPP_BOT_API_CLIENT_SECRET === undefined ||
  process.env.WHATSAPP_BOT_CHANNEL_ID === undefined
) {
  throw new Error("Missing WhatsApp Bot API environment variables");
}

export interface BotMessagePayload {
  id: string;
  channel: string;
  recipients: string[];
  whatsapp_payload: {
    text: string;
    mentions?: string[];
  };
}

export interface BotMessageResponse {
  id: string;
  status: string;
}

export async function sendBotNotification(payload: BotMessagePayload) {
  const accessToken = await getAccessToken();

  const res = await fetch(
    `${process.env.WHATSAPP_BOT_API_URL}/api/v1/notifications`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    },
  );

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Failed to send notification: ${error}`);
  }

  return (await res.json()) as BotMessageResponse;
}
