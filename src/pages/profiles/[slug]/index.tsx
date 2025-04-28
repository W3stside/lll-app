import { ObjectId } from "mongodb";
import type { GetServerSideProps } from "next";

import { Profile, type IProfile } from "@/components/Profile";
import { withServerSideProps } from "@/hoc/withServerSideProps";
import client from "@/lib/mongodb";
import { Collection } from "@/types";
import type { IAdmin } from "@/types/admin";
import type { IGame, IUser } from "@/types/users";

export const getServerSideProps: GetServerSideProps = withServerSideProps(
  // TODO: review
  // @ts-expect-error error in the custom HOC - doesn't break.
  async (context) => {
    try {
      const {
        parentProps: { admin, users, usersById },
        params: { slug: userId } = {},
      } = context;

      const specificUserId = new ObjectId(
        Array.isArray(userId) ? userId[0] : userId,
      );

      const userGames = await client
        .db("LLL")
        .collection<IGame[]>(Collection.GAMES)
        .find({ players: specificUserId.toString() })
        .toArray();

      const fullUser = await client
        .db("LLL")
        .collection<IUser>(Collection.USERS)
        .findOne(
          {
            _id: specificUserId,
          },
          { projection: { password: 0 } },
        );

      return {
        props: {
          isConnected: true,
          admin: JSON.parse(JSON.stringify(admin)) as IAdmin[],
          profileUser: JSON.parse(JSON.stringify(fullUser)) as IUser,
          usersById: JSON.parse(JSON.stringify(usersById)) as Record<
            string,
            IUser
          >,
          users: JSON.parse(JSON.stringify(users)) as IUser[],
          avatarUrl: fullUser?.avatarUrl ?? null,
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
          profileUser: null,
          usersById: {},
          users: [],
          avatarUrl: null,
          userGames: [],
        },
      };
    }
  },
);

export default function SpecificProfile(props: IProfile) {
  return <Profile {...props} user={props.profileUser} />;
}
