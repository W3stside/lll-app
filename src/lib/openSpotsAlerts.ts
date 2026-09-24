// Server-only. See lib/occurrenceClaims for how a claim works.

import { createOccurrenceClaim } from "./occurrenceClaims";

import { Collection } from "@/types";

/** Marks the open spots alert for this game occurrence as sent. */
export const claimOpenSpotsAlert = createOccurrenceClaim(
  Collection.OPEN_SPOTS_ALERTS,
  "open-spots",
);

/** Marks the cancellation reminder for this game occurrence as sent. */
export const claimGameReminder = createOccurrenceClaim(
  Collection.GAME_REMINDERS,
  "reminders",
);
