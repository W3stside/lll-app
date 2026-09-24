// Server-only: never import from client code (sms.ts is the client side).
// Twilio Verify texts the codes and checks them, including how many guesses a
// code gets and when it expires.

import twilio from "twilio";

// https://www.twilio.com/docs/api/errors/60202
const MAX_CHECK_ATTEMPTS_ERROR_CODE = 60202;

function _createService() {
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_VERIFY_SERVICE_SID } =
    process.env;

  if (TWILIO_VERIFY_SERVICE_SID === undefined) {
    throw new Error("TWILIO_VERIFY_SERVICE_SID is not defined");
  }

  return twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN).verify.v2.services(
    TWILIO_VERIFY_SERVICE_SID,
  );
}

// Created on first use, so a missing env var fails the request, not the build
let _service: ReturnType<typeof _createService> | undefined;

function _verifyService() {
  _service ??= _createService();
  return _service;
}

/** Texts a new code to an E.164 number. Throws when Twilio refuses. */
export async function sendSmsCode(to: string): Promise<void> {
  await _verifyService().verifications.create({ to, channel: "sms" });
}

/**
 * True only when Twilio approves the code for this E.164 number. A code that
 * expired, was already used, or ran out of guesses is simply not approved.
 */
export async function isSmsCodeApproved(
  to: string,
  code: string,
): Promise<boolean> {
  try {
    const check = await _verifyService().verificationChecks.create({
      to,
      code,
    });
    return check.status === "approved";
  } catch (error) {
    // Twilio answers 404 when there's no pending code for the number, and
    // error 60202 once the code has had too many wrong guesses. Either way the
    // player needs a new code, not a retry.
    if (
      typeof error === "object" &&
      error !== null &&
      (("status" in error && error.status === 404) ||
        ("code" in error && error.code === MAX_CHECK_ATTEMPTS_ERROR_CODE))
    ) {
      return false;
    }
    throw error;
  }
}
