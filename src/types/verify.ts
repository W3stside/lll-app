// No phone number: send-code and verify-code both use the logged-in user's
// stored one
export interface VerifyCodeRequestBody {
  code: string;
}

export interface SendCodeSuccessResponse {
  success: true;
  status: string;
  to: string;
}

export interface SendCodeErrorResponse {
  error: string;
  message?: string;
}

export type SendCodeResponse = SendCodeErrorResponse | SendCodeSuccessResponse;
