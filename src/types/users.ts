import type { Role } from ".";

export interface IBaseUser {
  first_name: string;
  last_name: string;
  phone_number: string;
  avatarUrl?: string | null;
}

export type INewSignup<T = string> = IBaseUser & {
  _id?: T;
  password: string;
  createdAt: Date;
  shame: { game_id: string; date: Date }[];
  role?: Role;
};

export type IUser<T = string> = INewSignup<T> & {
  _id: T;
};

export type IUserFromCookies = Pick<IUser, "_id">;

export type IUserSafe = Omit<IUser, "_id" | "createdAt" | "password"> & {
  _id: IUser["_id"] | undefined;
  createdAt: IUser["createdAt"] | undefined;
};

export interface IShamer extends IBaseUser {
  _id: string;
  games?: string[];
}

export type PlaySpeed = "faster" | "mixed" | "slower";
export enum Gender {
  FEMALE = "female",
  MALE = "male",
  UNSPECIFIED = "unspecified",
}
export type IGame<T = string> = {
  _id: T;
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
  organisers?: string[];
};

export type GamesByDay = Partial<Record<IGame["day"], IGame[]>>;
