export type Action = "create" | "delete" | "get" | "update";
export type AuthAction = "login" | "logout" | "register" | "update";
export type RequestPath = "games" | "me" | "users" | "wall-of-shame";
export type AuthPath = "auth";
export interface JSONResponse<T> {
  data: T;
  error: Error | null;
  message?: string;
}
