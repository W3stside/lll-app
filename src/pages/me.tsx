import type { GetServerSideProps } from "next";

import { type IProfile, Profile } from "@/components/Profile";
import { withServerSideProps } from "@/hoc/withServerSideProps";
import client from "@/lib/mongodb";
import { Collection } from "@/types";
import type { IGame } from "@/types/users";

export const getServerSideProps: GetServerSideProps = withServerSideProps(
  // TODO: review
  // @ts-expect-error error in the custom HOC - doesn't break.
  async (context) => {
    const {
      parentProps: { user: fullUser, admin, games, users, usersById },
    } = context;

    try {
      const userGames = await client
        .db("LLL")
        .collection<IGame[]>(Collection.GAMES)
        .find({ players: fullUser._id.toString() })
        .toArray();

      return {
        props: {
          admin: JSON.parse(JSON.stringify(admin)) as string,
          profileUser: JSON.parse(JSON.stringify(fullUser)) as string,
          usersById: JSON.parse(JSON.stringify(usersById)) as string,
          users: JSON.parse(JSON.stringify(users)) as string,
          isConnected: true,
          avatarUrl: fullUser.avatarUrl ?? null,
          games: JSON.parse(JSON.stringify(games)) as string,
          userGames: JSON.parse(JSON.stringify(userGames)) as string,
        },
      };
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
      return {
        props: {
          avatarUrl: null,
          userGames: [],
          games: [],
          users: [],
          admin: null,
          profileUser: null,
          usersById: {},
          isConnected: false,
        },
      };
    }
  },
);

export default function MyProfile(props: IProfile) {
  return <Profile {...props} />;
}
