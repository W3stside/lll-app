export interface IBaseSignup {
  first_name: string;
  last_name: string;
  phone_number: string;
}

export interface Signup extends IBaseSignup {
  _id: string;
  game_id: number;
  date: string;
  day: IGame["day"];
}

export type PlaySpeed = "faster" | "mixed" | "slower";
export interface IGame {
  _id: string;
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
}
