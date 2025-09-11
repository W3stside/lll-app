import { GameType } from "@/types";

export const DEFAULT_GAME_STATE = {
  _id: undefined,
  time: "",
  location: "",
  address: "",
  mapUrl: "",
  gender: undefined,
  speed: undefined,
  day: undefined,
  cancelled: false,
  type: GameType.STANDARD,
} as const;
