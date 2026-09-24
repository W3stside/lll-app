import type { ObjectId } from "mongodb";

export interface IAdmin {
  _id: ObjectId;
  users?: ObjectId[];
  signup_open: boolean;
  // Weekly schedule, each a "YYYY-MM-DD" of the Monday starting a week:
  // - lists: the week every list was last cleared for, by the admin page or
  //   the Monday reset
  // - closed/reset: the week each cron step already ran for, so a repeated
  //   call is a no-op
  signups_lists_week?: string;
  signups_closed_week?: string;
  signups_reset_week?: string;
}
