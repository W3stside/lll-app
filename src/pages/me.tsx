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
          isConnected: true,
          admin: JSON.parse(JSON.stringify(admin)) as string,
          avatarUrl: fullUser.avatarUrl ?? null,
          games: JSON.parse(JSON.stringify(games)) as string,
          users: JSON.parse(JSON.stringify(users)) as string,
          userGames: JSON.parse(JSON.stringify(userGames)) as string,
          usersById: JSON.parse(JSON.stringify(usersById)) as string,
          profileUser: JSON.parse(JSON.stringify(fullUser)) as string,
        },
      };
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
      return {
        props: {
          isConnected: false,
          admin: null,
          avatarUrl: null,
          games: [],
          users: [],
          userGames: [],
          usersById: {},
          profileUser: null,
        },
      };
    }
  },
);

export default function MyProfile(props: IProfile) {
  return <Profile {...props} />;
}
