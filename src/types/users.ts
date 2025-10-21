import type { ObjectId } from "mongodb";

import type { IGame, Role } from ".";

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
  missedPayments?: (Pick<IGame, "_id" | "day" | "time"> & { date: string })[];
  role?: Role;
  verified?: boolean;
}

export interface IUser extends INewSignup {
  _id: ObjectId;
}

export type IUserFromCookies = Pick<IUser, "_id" | "verified">;

export type IUserSafe = Omit<IUser, "_id" | "createdAt" | "password"> & {
  _id: IUser["_id"] | undefined;
  createdAt: IUser["createdAt"] | undefined;
};

export interface IShamer extends IBaseUser {
  _id: ObjectId;
  games?: ObjectId[];
}
