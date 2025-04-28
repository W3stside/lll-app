export type Action = "create" | "delete" | "get" | "reset" | "update";
export type AuthAction = "login" | "logout" | "register" | "update";
export type RequestPath = "admin" | "games" | "me" | "users";
export type AuthPath = "auth";
export interface JSONResponse<T> {
  data: T;
  error: Error | null;
  message?: string;
}
