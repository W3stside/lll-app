import type { IBaseSignup, IGame, Signup } from "@/types/signups";

export function groupSignupsByDayAndGame(signups: Signup[]) {
  return signups.reduce<
    Partial<Record<IGame["day"], Partial<Record<IGame["game_id"], Signup[]>>>>
  >(
    (acc, signup) => ({
      ...acc,
      [signup.day]: {
        ...acc[signup.day],
        [signup.game_id]: [
          ...(acc[signup.day]?.[signup.game_id] ?? []),
          signup,
        ],
      },
    }),
    {},
  );
}

export function checkPlayerIsUser(player?: IBaseSignup, user?: IBaseSignup) {
  if (!player || !user) return false;

  return (
    player.first_name === user.first_name &&
    player.last_name === user.last_name &&
    player.phone_number === user.phone_number
  );
}
