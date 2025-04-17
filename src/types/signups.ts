export interface Signup {
  _id: string;
  game_id: string;
  date: Date;
  first_name: string;
  last_name?: string;
  phone_number: string;
}

export type PlaySpeed = "faster" | "mixed" | "slower";
export interface IGame {
  id: number;
  time: string;
  speed: PlaySpeed;
  location: string;
  address: string;
  mapUrl: string;
}
