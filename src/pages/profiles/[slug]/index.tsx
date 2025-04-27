import { ObjectId } from "mongodb";
import type { GetServerSideProps } from "next";

import { Profile, type IProfile } from "@/components/Profile";
import { NAVLINKS_MAP } from "@/constants/links";
import { JWT_REFRESH_SECRET, JWT_SECRET, verifyToken } from "@/lib/authUtils";
import client from "@/lib/mongodb";
import { Collection } from "@/types";
import type { IGame, IUser, IUserFromCookies } from "@/types/users";
import { fetchUsersFromMongodb } from "@/utils/api/mongodb";
import { getAvatarUrl } from "@/utils/avatar";
import { groupUsersById } from "@/utils/data";

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

    const users = await fetchUsersFromMongodb(client, false);
    const usersById = groupUsersById(users);

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
        usersById: JSON.parse(JSON.stringify(usersById)) as string,
        users: JSON.parse(JSON.stringify(users)) as IUser[],
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
        user: null,
        usersById: {},
        users: [],
        avatarUrl: null,
        userGames: [],
      },
    };
  }
};

export default function SpecificProfile(props: IProfile) {
  return <Profile {...props} />;
}
