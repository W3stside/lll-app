interface SendCodeResponse {
  success?: boolean;
  error?: string;
}

interface VerifyCodeResponse {
  success?: boolean;
  verified?: boolean;
  message?: string;
  error?: string;
}

// No number sent: the server texts the logged-in user's stored number
export async function sendVerificationCode(): Promise<SendCodeResponse> {
  const res = await fetch("/api/verify-sms/send-code", { method: "POST" });

  return (await res.json()) as SendCodeResponse;
}

export async function verifyCode(code: string): Promise<VerifyCodeResponse> {
  const res = await fetch("/api/verify-sms/verify-code", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });

  return (await res.json()) as VerifyCodeResponse;
}
