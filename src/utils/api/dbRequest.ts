/* eslint-disable no-console */
import type { ObjectId } from "mongodb";

import type { Action, JSONResponse, RequestPath } from "@/types/http";

function _crudFromAction(action: Action) {
  switch (action) {
    case "create":
      return "POST";
    case "delete":
      return "DELETE";
    case "get":
      return "GET";
    case "update":
    case "reset":
      return "PATCH";
    default:
      throw new Error("Unsupported action!");
  }
}

export async function dbRequest<T, R = undefined>(
  action: "create",
  path: RequestPath,
  request?: Partial<T> & { _id?: never },
): Promise<JSONResponse<R extends undefined ? T : R>>;
export async function dbRequest<T, R = undefined>(
  action: "delete" | "get" | "reset" | "update",
  path: RequestPath,
  request?: Partial<T> & { _id: ObjectId },
): Promise<JSONResponse<R extends undefined ? T : R>>;
export async function dbRequest<T, R = undefined>(
  action: Action,
  path: RequestPath,
  request?: Partial<T> & { _id?: ObjectId },
): Promise<JSONResponse<R extends undefined ? T : R>> {
  try {
    const res = await fetch(`/api/requests/${path}/${action}`, {
      method: _crudFromAction(action),
      ...(request !== undefined ? { body: JSON.stringify(request) } : {}),
      headers: {
        "Content-Type": "application/json",
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const json: JSONResponse<T> = await res.json();

    if (!res.ok) {
      console.error("Request response NOT ok. json.error: ", json);
      return {
        data: undefined as R extends undefined ? T : R,
        error:
          json instanceof Error ? json : new Error("Unknown error occurred."),
      };
    }

    return {
      data: (json.data ?? json) as R extends undefined ? T : R,
      error: null,
    };
  } catch (e) {
    console.error("An error occurred trying to submit the request:", e);
    throw new Error(e instanceof Error ? e.message : "Unknown error occurred.");
  }
}
