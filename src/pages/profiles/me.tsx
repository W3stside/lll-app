import type { GetServerSideProps } from "next";

import { type IProfile, Profile } from "@/components/Profile";
import { NAVLINKS_MAP } from "@/constants/links";
import { JWT_REFRESH_SECRET, JWT_SECRET, verifyToken } from "@/lib/authUtils";
import client from "@/lib/mongodb";
import { Collection } from "@/types";
import type { IGame, IUser } from "@/types/users";
import { getAvatarUrl } from "@/utils/avatar";

type ConnectionStatus = {
  isConnected: boolean;
};

export const getServerSideProps: GetServerSideProps<ConnectionStatus> = async (
  context,
) => {
  try {
    const { req } = context;
    const { token } = req.cookies;
    const user =
      token !== undefined
        ? verifyToken<IUser>(token, JWT_SECRET as string, JWT_REFRESH_SECRET)
        : null;

    if (user === null) {
      return {
        redirect: {
          destination: NAVLINKS_MAP.LOGIN,
          permanent: false,
        },
      };
    }

    await client.connect();
    const userGames = await client
      .db("LLL")
      .collection<IGame[]>(Collection.GAMES)
      .find({ players: user._id.toString() })
      .toArray();

    const avatarUrl = getAvatarUrl(user._id.toString(), "png");

    return {
      props: {
        isConnected: true,
        user: JSON.parse(JSON.stringify(user)) as string,
        avatarUrl: JSON.parse(JSON.stringify(avatarUrl)) as string,
        games: JSON.parse(JSON.stringify(userGames)) as IGame[],
      },
    };
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(e);
    return {
      props: { isConnected: false, user: null, avatarUrl: "", games: [] },
    };
  }
};

export default function MyProfile(props: IProfile) {
  return <Profile {...props} />;
}
