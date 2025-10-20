export interface SendCodeRequestBody {
  phoneNumber: string;
}

export interface VerifyCodeRequestBody extends SendCodeRequestBody {
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
