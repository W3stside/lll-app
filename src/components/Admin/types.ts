import type { IGame } from "@/types";

export type ErrorUser = Omit<Partial<IGame>, "_id" | "game_id" | "players">;
