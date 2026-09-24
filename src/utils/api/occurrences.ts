import type {
  IAttendanceUpdate,
  IGameOccurrence,
  IPaymentUpdate,
  IUser,
} from "@/types";

const ATTENDANCE_API = "/api/requests/occurrences/update";
const PAYMENTS_API = "/api/requests/payments/update";
export const GAME_HISTORY_CSV_URL = "/api/requests/occurrences/export";

async function _patch<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "PATCH",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const json = (await res.json().catch(() => ({}))) as Partial<T> & {
    message?: string;
  };

  if (!res.ok) {
    throw new Error(json.message ?? `Request failed (${res.status})`);
  }

  return json as T;
}

/** Resolves with the week's updated history row (null if clearing found none). */
export async function updateAttendance(
  update: IAttendanceUpdate,
): Promise<IGameOccurrence | null> {
  const { occurrence } = await _patch<{ occurrence: IGameOccurrence | null }>(
    ATTENDANCE_API,
    update,
  );
  return occurrence;
}

/** Resolves with the player's updated ledger and the week's history row. */
export async function updatePayment(update: IPaymentUpdate): Promise<{
  user: IUser;
  occurrence: IGameOccurrence | null;
}> {
  return await _patch(PAYMENTS_API, update);
}
