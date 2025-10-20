export enum Collection {
  USERS = "users",
  GAMES = "games",
  ADMIN = "admin",
  ME = "me",
  TOKENS = "tokens",
}

export enum GameStatus {
  PAST = "past",
  LOCKED = "locked",
  UPCOMING = "upcoming",
}

export enum Role {
  ADMIN = "admin",
}

export * from "./games";
export * from "./users";
export * from "./admin";
export * from "./http";
