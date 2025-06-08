import type { ObjectId } from "mongodb";

import type { GameStatus, IGame, IUser } from "@/types";

export interface IPlayersList {
  game: IGame;
  gameStatus: GameStatus;
  capacity: number[];
  index: number;
  nextGameDate: string;
  user: IUser;
  usersById: Record<string, IUser>;
  confirmedList: (ObjectId | string)[];
  waitlist: (ObjectId | string)[];
}
