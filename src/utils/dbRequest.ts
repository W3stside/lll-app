/* eslint-disable no-console */
import type { Signup } from "@/types/signups";

type Action = "create" | "delete" | "get";
interface JSONResponse<T> {
  data: T;
  error: Error | null;
}
export async function dbRequest<T>(
  action: "get",
  request?: never,
  callback?: (json: JSONResponse<T>) => void,
): Promise<JSONResponse<T>>;
export async function dbRequest<T>(
  action: "create" | "delete",
  request?: Partial<Signup>,
  callback?: (json: JSONResponse<T>) => void,
): Promise<JSONResponse<T>>;
export async function dbRequest<T>(
  action: Action,
  request?: Partial<Signup>,
  callback?: (json: JSONResponse<T>) => void,
): Promise<JSONResponse<T>> {
  try {
    const res = await fetch(`/api/requests/${action}`, {
      method:
        action === "create" ? "POST" : action === "delete" ? "DELETE" : "GET",
      ...(action !== "get" ? { body: JSON.stringify(request) } : {}),
      headers: {
        "Content-Type": "application/json",
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const json: JSONResponse<T> = await res.json();

    if (!res.ok) {
      console.error(json.error);
    } else {
      console.log("success", json);
      callback?.(json);
    }

    return json;
  } catch (e) {
    console.error("An error occurred trying to submit the request:", e);
    throw new Error(e instanceof Error ? e.message : "Unknown error occurred.");
  }
}
