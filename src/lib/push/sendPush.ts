/* eslint-disable no-console */
import {
  type SendResult,
  type Urgency,
  sendNotification,
  setVapidDetails,
  WebPushError,
} from "web-push";

import client from "../mongodb";

import {
  Collection,
  type IPushPayload,
  type IPushSubscriptionDocument,
} from "@/types";

// Big broadcasts (e.g. "signups open") are sent in slices so a serverless
// function doesn't open hundreds of TLS connections at once
const SEND_BATCH_SIZE = 50;
// Push services answer 404/410 once a subscription is revoked or expired
const GONE_STATUS_CODES = new Set([404, 410]);

export interface ISendPushOptions {
  // Seconds the push service keeps retrying an offline device
  ttl?: number;
  urgency?: Urgency;
}

let _vapidConfigured: boolean | undefined;

// Configured lazily (not at import) so a missing key disables push instead of
// crashing every API route that imports this module
function _ensureVapid(): boolean {
  if (_vapidConfigured !== undefined) return _vapidConfigured;

  const { NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } =
    process.env;

  if (
    NEXT_PUBLIC_VAPID_PUBLIC_KEY === undefined ||
    VAPID_PRIVATE_KEY === undefined ||
    VAPID_SUBJECT === undefined
  ) {
    console.warn(
      "[push] VAPID env vars missing - push notifications are disabled",
    );
    _vapidConfigured = false;
    return false;
  }

  setVapidDetails(
    VAPID_SUBJECT,
    NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY,
  );
  _vapidConfigured = true;
  return true;
}

function _collection() {
  return client
    .db("LLL")
    .collection<IPushSubscriptionDocument>(Collection.PUSH_SUBSCRIPTIONS);
}

function _chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

async function _deliver(
  subscriptions: IPushSubscriptionDocument[],
  payload: IPushPayload,
  { ttl = 60 * 60 * 24, urgency = "normal" }: ISendPushOptions,
): Promise<number> {
  const body = JSON.stringify(payload);
  const goneEndpoints: string[] = [];
  let delivered = 0;

  for (const batch of _chunk(subscriptions, SEND_BATCH_SIZE)) {
    // eslint-disable-next-line no-await-in-loop
    const results = await Promise.allSettled<SendResult>(
      batch.map(
        async (sub) =>
          await sendNotification(
            { endpoint: sub.endpoint, keys: sub.keys },
            body,
            {
              TTL: ttl,
              urgency,
              topic: payload.tag,
            },
          ),
      ),
    );

    delivered += results.filter(
      (result) => result.status === "fulfilled",
    ).length;

    results.forEach((result, idx) => {
      if (result.status === "fulfilled") return;

      const reason: unknown = result.reason;
      if (
        reason instanceof WebPushError &&
        GONE_STATUS_CODES.has(reason.statusCode)
      ) {
        goneEndpoints.push(batch[idx].endpoint);
      } else {
        console.error("[push] Failed to deliver notification:", reason);
      }
    });
  }

  if (goneEndpoints.length > 0) {
    await _collection().deleteMany({ endpoint: { $in: goneEndpoints } });
  }

  return delivered;
}

/**
 * Sends a notification to every device of the given users.
 * Never throws: notifications are best-effort and must not fail the request
 * that triggered them. Resolves with the number of devices reached.
 */
export async function sendPushToUsers(
  userIds: string[],
  payload: IPushPayload,
  options: ISendPushOptions = {},
): Promise<number> {
  if (userIds.length === 0 || !_ensureVapid()) return 0;

  try {
    const subscriptions = await _collection()
      .find({ user_id: { $in: userIds } })
      .toArray();

    return await _deliver(subscriptions, payload, options);
  } catch (error) {
    console.error("[push] sendPushToUsers failed:", error);
    return 0;
  }
}

/** Broadcast to every subscribed device. Never throws. */
export async function sendPushToAll(
  payload: IPushPayload,
  options: ISendPushOptions = {},
): Promise<number> {
  if (!_ensureVapid()) return 0;

  try {
    const subscriptions = await _collection().find().toArray();

    return await _deliver(subscriptions, payload, options);
  } catch (error) {
    console.error("[push] sendPushToAll failed:", error);
    return 0;
  }
}
