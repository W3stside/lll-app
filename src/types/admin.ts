import type { ObjectId } from "mongodb";

export interface IAdmin {
  _id: ObjectId;
  users?: ObjectId[];
  signup_open: boolean;
}
