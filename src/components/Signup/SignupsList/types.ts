import type { ObjectId } from "mongodb";

import type { GameStatus, IGame, IUser } from "@/types";

export interface IPlayersList {
  game: IGame;
  gameStatus: GameStatus;
  nextGameDate: string;
  user: IUser;
  usersById: Partial<Record<string, IUser>>;
  confirmedList: (ObjectId | string)[];
  waitlist: (ObjectId | string)[];
}
