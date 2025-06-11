import { ObjectId } from "mongodb";

import client from "../mongodb";

import { Collection } from "@/types";

const BOT_DB_ID = "6849632ec3f345d34cfee31e";

interface ITokenDocument {
  _id: ObjectId;
  access_token: string;
  expires_at: Date;
}

export async function getAccessToken(): Promise<string> {
  const now = new Date();
  const tokenId = new ObjectId(BOT_DB_ID);

  const tokens = client.db("LLL").collection<ITokenDocument>(Collection.TOKENS);
  const existingToken = await tokens.findOne(
    { _id: tokenId },
    { projection: { access_token: 1, expires_at: 1 } },
  );

  // Existing token exists, return that
  if (existingToken && existingToken.expires_at > now) {
    return existingToken.access_token;
  }

  const res = await fetch(`${process.env.WHATSAPP_BOT_API_URL}/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      grant_type: "client_credentials",
      client_id: process.env.WHATSAPP_BOT_API_CLIENT_ID,
      client_secret: process.env.WHATSAPP_BOT_API_CLIENT_SECRET,
    }),
  });

  if (!res.ok) {
    throw new Error("Failed to authenticate with WhatsApp Bot API");
  }

  const data = (await res.json()) as {
    access_token: string;
    expires_at: string;
    token_type: "Bearer";
  };

  const newToken: ITokenDocument = {
    _id: tokenId,
    access_token: data.access_token,
    expires_at: new Date(data.expires_at),
  };

  await tokens.updateOne(
    { _id: newToken._id },
    { $set: newToken },
    { upsert: true },
  );

  return newToken.access_token;
}
