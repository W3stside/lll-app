import { GameType } from "@/types";

export const MAX_SIGNUPS_PER_GAME = {
  [GameType.STANDARD]: 16,
  [GameType.ELEVENS]: 26,
  [GameType.TOURNAMENT_RANDOM]: 8,
  [GameType.TOURNAMENT_NATIONS]: 8,
};

export const MINIMUM_TOURNAMENT_TEAMS = 2;

// Weekly cycle, in Lisbon time: signups close on Sunday night, then every
// list is cleared and signups re-open on Monday from this hour. The
// reset-signups cron in vercel.json is scheduled around it
export const SIGNUPS_RESET_HOUR = 7;

export const PASSWORD_MIN_LENGTH = 6;
export const NAME_MIN_LENGTH = 2;
export const PHONE_MIN_LENGTH = 10;
export const PHONE_MAX_LENGTH = 15;
export const PHONE_FORMAT_EXAMPLE = "351999999999";
export const PHONE_FORMAT_HINT = `Format: <COUNTRY_CODE><NUMBER> with no "+" (e.g. ${PHONE_FORMAT_EXAMPLE} for Portugal)`;
export const PHONE_FORMAT_ERROR = `Phone number must start with the country code, with no "+" or leading 0 (e.g. ${PHONE_FORMAT_EXAMPLE} for Portugal).`;
export const VERIFICATION_STEP_KEY = "verification-step";
export const VERIFICATION_COOLDOWN_KEY = "verification-cooldown";
export const ORANGE_THRESHOLD = 5;
export const YELLOW_THRESHOLD = 10;
