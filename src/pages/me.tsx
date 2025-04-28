import { ObjectId } from "mongodb";
import type { GetServerSideProps } from "next";

import { type IProfile, Profile } from "@/components/Profile";
import { NAVLINKS_MAP } from "@/constants/links";
import { JWT_REFRESH_SECRET, JWT_SECRET, verifyToken } from "@/lib/authUtils";
import client from "@/lib/mongodb";
import { Collection } from "@/types";
import type { IAdmin } from "@/types/admin";
import type { IGame, IUser, IUserFromCookies } from "@/types/users";
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
        ? verifyToken<IUserFromCookies>(
            token,
            JWT_SECRET as string,
            JWT_REFRESH_SECRET,
          )
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

    const admin = await client
      .db("LLL")
      .collection<IAdmin>(Collection.ADMIN)
      .find({})
      .toArray();

    const userGames = await client
      .db("LLL")
      .collection<IGame[]>(Collection.GAMES)
      .find({ players: user._id })
      .toArray();

    const fullUser = await client
      .db("LLL")
      .collection<IUser>(Collection.USERS)
      .findOne({
        _id: new ObjectId(user._id),
      });

    const avatarUrl = await getAvatarUrl(user._id.toString());
    const imgBuffer =
      avatarUrl !== null ? Buffer.from(await avatarUrl.arrayBuffer()) : null;
    const base64 = imgBuffer === null ? null : imgBuffer.toString("base64");

    return {
      props: {
        isConnected: true,
        admin: JSON.parse(JSON.stringify(admin)) as IAdmin[],
        user: JSON.parse(JSON.stringify(fullUser)) as string,
        avatarUrl: base64 === null ? null : `data:image/jpeg;base64,${base64}`,
        userGames: JSON.parse(JSON.stringify(userGames)) as IGame[],
      },
    };
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(e);
    return {
      props: {
        isConnected: false,
        admin: null,
        user: null,
        avatarUrl: null,
        userGames: [],
      },
    };
  }
};

export default function MyProfile(props: IProfile) {
  return <Profile {...props} />;
}
