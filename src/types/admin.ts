import type { ObjectId } from "mongodb";

export interface IAdmin {
  _id: string;
  users: ObjectId[];
  signup_open: boolean;
}
