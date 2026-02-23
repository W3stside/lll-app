import type { ObjectId } from "mongodb";

import type { GameStatus } from ".";

export type PlaySpeed = "faster" | "mixed" | "slower";
export enum Gender {
  FEMALE = "female",
  MALE = "male",
  UNSPECIFIED = "unspecified",
}
export enum GameType {
  STANDARD = "Standard",
  ELEVENS = "Elevens",
  TOURNAMENT_RANDOM = "Tournament - Random",
  TOURNAMENT_NATIONS = "Tournament - Nations",
}

export interface ITourneyGameType {
  name?: string;
  players: string[];
}

export interface IGame {
  _id: ObjectId;
  game_id: number;
  time: string;
  speed: PlaySpeed;
  location: string;
  address: string;
  mapUrl: string;
  day:
    | "Friday"
    | "Monday"
    | "Saturday"
    | "Sunday"
    | "Thursday"
    | "Tuesday"
    | "Wednesday";
  players: string[];
  gender?: Gender;
  organisers?: ObjectId[];
  cancelled?: boolean;
  hidden?: boolean;
  type?: GameType;
  name?: string;
  // Tournaments
  teams?: ITourneyGameType[];
  // Aux
  status: GameStatus;
  date: string;
}

export type GamesByDay = Partial<Record<IGame["day"], IGame[]>>;
