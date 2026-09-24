import type { IUserSafe } from "@/types";

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

export interface PasswordResetResponse {
  // HTTP status, so the page can tell a rejected number from a failed send
  status: number;
  success?: boolean;
  message?: string;
  error?: string;
  // On a successful reset: the player, now logged in
  user?: IUserSafe;
}

async function _postPasswordReset(
  step: "confirm" | "send-code",
  body: object,
): Promise<PasswordResetResponse> {
  const res = await fetch(`/api/auth/reset-password/${step}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const json = (await res.json().catch(() => ({}))) as Omit<
    PasswordResetResponse,
    "status"
  >;
  return { ...json, status: res.status };
}

export async function sendPasswordResetCode(
  phone_number: string,
): Promise<PasswordResetResponse> {
  return await _postPasswordReset("send-code", { phone_number });
}

export async function resetPassword(body: {
  phone_number: string;
  code: string;
  password: string;
}): Promise<PasswordResetResponse> {
  return await _postPasswordReset("confirm", body);
}

export async function verifyCode(code: string): Promise<VerifyCodeResponse> {
  const res = await fetch("/api/verify-sms/verify-code", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });

  return (await res.json()) as VerifyCodeResponse;
}
