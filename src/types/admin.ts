import type { ObjectId } from "mongodb";

export type IAdmin<T = string> = {
  _id: T;
  users?: ObjectId[];
  signup_open: boolean;
};
