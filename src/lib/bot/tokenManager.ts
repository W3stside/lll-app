if (
  process.env.WHATSAPP_BOT_API_URL === undefined ||
  process.env.WHATSAPP_BOT_API_CLIENT_ID === undefined ||
  process.env.WHATSAPP_BOT_API_CLIENT_SECRET === undefined
) {
  throw new Error("Missing WhatsApp Bot API environment variables");
}

interface TokenResponse {
  access_token: string;
  expires_at: string;
  token_type: "Bearer";
}

let cachedToken: TokenResponse | null = null;
let tokenLock: Promise<void> | null = null;

export async function getAccessToken() {
  const now = new Date();

  if (cachedToken !== null && new Date(cachedToken.expires_at) > now) {
    return cachedToken.access_token;
  }
  if (tokenLock) {
    await tokenLock;
    if (cachedToken !== null && new Date(cachedToken.expires_at) > now) {
      return cachedToken.access_token;
    }
  }

  // eslint-disable-next-line require-atomic-updates
  tokenLock = (async () => {
    const res = await fetch(
      `${process.env.WHATSAPP_BOT_API_URL}/oauth2/token`,
      {
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
      },
    );

    if (!res.ok) {
      throw new Error("Failed to authenticate");
    }

    const data = (await res.json()) as TokenResponse;

    cachedToken = {
      access_token: data.access_token,
      expires_at: data.expires_at,
      token_type: "Bearer",
    };
  })();

  await tokenLock;
  // eslint-disable-next-line require-atomic-updates
  tokenLock = null;

  return (cachedToken as TokenResponse).access_token;
}
