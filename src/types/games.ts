import type { ObjectId } from "mongodb";

export type PlaySpeed = "faster" | "mixed" | "slower";
export enum Gender {
  FEMALE = "female",
  MALE = "male",
  UNSPECIFIED = "unspecified",
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
  // Tournaments
  teams?: { players: string[] }[];
  gender?: Gender;
  organisers?: ObjectId[];
  cancelled?: boolean;
  hidden?: boolean;
}

export type GamesByDay = Partial<Record<IGame["day"], IGame[]>>;
