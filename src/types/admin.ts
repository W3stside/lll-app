import type { ObjectId } from "mongodb";

export interface IAdmin {
  _id: ObjectId;
  users?: ObjectId[];
  signup_open: boolean;
  // Last time every list was cleared, from the admin page or the Monday job
  signups_reset_at?: Date;
  // Weekly schedule claims: "YYYY-MM-DD" of the Monday starting the week each
  // step already ran for, so a repeated cron call is a no-op
  signups_closed_week?: string;
  signups_reset_week?: string;
}
