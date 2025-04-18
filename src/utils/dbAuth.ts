/* eslint-disable no-console */
import type { AuthAction, JSONResponse } from "@/types/http";

export async function dbAuth<T>(
  action: "logout",
  body?: never,
): Promise<JSONResponse<T>>;
export async function dbAuth<T>(
  action: "login" | "register",
  body: T,
): Promise<JSONResponse<T>>;
export async function dbAuth<T>(
  action: AuthAction,
  body?: T,
): Promise<JSONResponse<T>> {
  try {
    const res = await fetch(`/api/auth/${action}`, {
      method: "POST",
      ...(action === "logout" ? {} : { body: JSON.stringify(body) }),
      headers: {
        "Content-Type": "application/json",
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const json: JSONResponse<T> = await res.json();

    if (!res.ok) {
      console.error("Response NOT OK. Error:", json.message);
      return {
        data: undefined as T,
        error:
          json instanceof Error
            ? json
            : new Error(json.message ?? "Unknown error occurred."),
      };
    }

    return { data: (json.data ?? json) as T, error: null };
  } catch (e) {
    console.error("An error occurred trying to register:", e);
    throw new Error(
      e instanceof Error ? e.message : "Unknown registration error occurred.",
    );
  }
}
