import { GameType } from "@/types";

export const MAX_SIGNUPS_PER_GAME = {
  [GameType.STANDARD]: 16,
  [GameType.ELEVENS]: 24,
  [GameType.TOURNAMENT]: 8,
};

export const PASSWORD_MIN_LENGTH = 6;
export const NAME_MIN_LENGTH = 2;
export const PHONE_MIN_LENGTH = 10;
export const PHONE_MAX_LENGTH = 15;
export const ORANGE_THRESHOLD = 5;
export const YELLOW_THRESHOLD = 10;
