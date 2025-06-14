export const BANNED_USERS_SET = new Set(
  JSON.parse(process.env.USER_BLACKLIST ?? "[]") as string[],
);
