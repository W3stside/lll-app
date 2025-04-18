/* eslint-disable no-console */
import type { Signup } from "@/types/signups";

type Action = "create" | "delete" | "get" | "update";
type Path = "games" | "signups" | "wall-of-shame";
interface JSONResponse<T> {
  data: T;
  error: Error | null;
}

function _crudFromAction(action: Action) {
  switch (action) {
    case "create":
      return "POST";
    case "delete":
      return "DELETE";
    case "get":
      return "GET";
    case "update":
      return "PATCH";
    default:
      throw new Error("Unsupported action!");
  }
}

export async function dbRequest<T>(
  action: "get",
  path: Path,
  request?: never,
  callback?: (json: JSONResponse<T>) => void,
): Promise<JSONResponse<T>>;
export async function dbRequest<T>(
  action: "create" | "delete" | "update",
  path: Path,
  request?: Partial<Signup>,
  callback?: (json: JSONResponse<T>) => void,
): Promise<JSONResponse<T>>;
export async function dbRequest<T>(
  action: Action,
  path: Path,
  request?: Partial<Signup>,
  callback?: (json: JSONResponse<T>) => void,
): Promise<JSONResponse<T>> {
  try {
    const res = await fetch(`/api/requests/${path}/${action}`, {
      method: _crudFromAction(action),
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
