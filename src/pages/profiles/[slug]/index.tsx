import { ObjectId } from "mongodb";
import type { GetServerSideProps } from "next";

import { Profile, type IProfile } from "@/components/Profile";
import { NAVLINKS_MAP } from "@/constants/links";
import { JWT_REFRESH_SECRET, JWT_SECRET, verifyToken } from "@/lib/authUtils";
import client from "@/lib/mongodb";
import { Collection } from "@/types";
import type { IGame, IUser, IUserFromCookies } from "@/types/users";
import { getAvatarUrl } from "@/utils/avatar";

export const getServerSideProps: GetServerSideProps = async (context) => {
  try {
    const { params: { slug: userId } = {}, req } = context;

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

    const specificUserId = new ObjectId(
      Array.isArray(userId) ? userId[0] : userId,
    );

    await client.connect();

    const userGames = await client
      .db("LLL")
      .collection<IGame[]>(Collection.GAMES)
      .find({ players: specificUserId.toString() })
      .toArray();

    const fullUser = await client
      .db("LLL")
      .collection<IUser>(Collection.USERS)
      .findOne({
        _id: specificUserId,
      });

    const avatarUrl = await getAvatarUrl(specificUserId.toString());
    const imgBuffer =
      avatarUrl !== null ? Buffer.from(await avatarUrl.arrayBuffer()) : null;
    const base64 = imgBuffer === null ? null : imgBuffer.toString("base64");

    return {
      props: {
        isConnected: true,
        user: JSON.parse(JSON.stringify(fullUser)) as string,
        avatarUrl: base64 === null ? null : `data:image/jpeg;base64,${base64}`,
        games: JSON.parse(JSON.stringify(userGames)) as IGame[],
      },
    };
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(e);
    return {
      props: { isConnected: false, user: null, avatarUrl: null, games: [] },
    };
  }
};

export default function SpecificProfile(props: IProfile) {
  return <Profile {...props} />;
}
