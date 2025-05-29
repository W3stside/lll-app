import type { ObjectId } from "mongodb";

import type { Role } from ".";

export interface IBaseUser {
  first_name: string;
  last_name: string;
  phone_number: string;
  avatarUrl?: string | null;
}

export interface INewSignup extends IBaseUser {
  _id?: ObjectId;
  password: string;
  createdAt: Date;
  shame: { game_id: ObjectId; date: string }[];
  role?: Role;
}

export interface IUser extends INewSignup {
  _id: ObjectId;
}

export type IUserFromCookies = Pick<IUser, "_id">;

export type IUserSafe = Omit<IUser, "_id" | "createdAt" | "password"> & {
  _id: IUser["_id"] | undefined;
  createdAt: IUser["createdAt"] | undefined;
};

export interface IShamer extends IBaseUser {
  _id: ObjectId;
  games?: ObjectId[];
}

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
  players: ObjectId[];
  gender?: Gender;
  organisers?: ObjectId[];
}

export type GamesByDay = Partial<Record<IGame["day"], IGame[]>>;
