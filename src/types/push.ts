import type { ObjectId } from "mongodb";

export interface IPushSubscriptionKeys {
  p256dh: string;
  auth: string;
}

// Shape the browser produces via PushSubscription.toJSON()
export interface IPushSubscriptionJSON {
  endpoint: string;
  expirationTime?: number | null;
  keys: IPushSubscriptionKeys;
}

export interface IPushSubscriptionDocument {
  _id?: ObjectId;
  // Stored as a string to match how player ids are stored on games
  user_id: string;
  endpoint: string;
  keys: IPushSubscriptionKeys;
  user_agent: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Payload read by public/sw.js - keep both in sync
export interface IPushPayload {
  title: string;
  body: string;
  url: string;
  // Notifications sharing a tag replace each other instead of stacking.
  // Also used as the Web Push "Topic" header, so max 32 chars of [A-Za-z0-9_-]
  tag?: string;
}
