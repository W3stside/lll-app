// Hoc/withServerSideProps.ts
import { ObjectId } from "mongodb";
import type {
  GetServerSideProps,
  GetServerSidePropsContext,
  GetServerSidePropsResult,
} from "next";

import { getUserFromServerSideRequest } from "@/lib/authUtils";
import client from "@/lib/mongodb";
import type { IServerSideProps } from "@/pages/_app";
import { Collection } from "@/types";
import type { IAdmin } from "@/types/admin";
import type { IUser } from "@/types/users";
import { fetchRequiredCollectionsFromMongoDb } from "@/utils/api/mongodb";
import { groupUsersById } from "@/utils/data";

interface InjectedServerSideProps {
  isConnected: boolean;
  admin: string | null;
  user: string;
  users: string;
  games: string;
  usersById: string;
}

interface CustomServerSidePropsContext extends GetServerSidePropsContext {
  parentProps: IServerSideProps;
}

export function withServerSideProps<P extends object>(
  getServerSidePropsFunc?: (
    context: CustomServerSidePropsContext,
  ) => Promise<GetServerSidePropsResult<InjectedServerSideProps & P>>,
): GetServerSideProps<InjectedServerSideProps & P> {
  return async (
    context: GetServerSidePropsContext,
  ): Promise<GetServerSidePropsResult<InjectedServerSideProps & P>> => {
    try {
      const { user: userFromCookies, redirect } =
        getUserFromServerSideRequest(context);

      if (userFromCookies === null) {
        return { redirect };
      }

      const fullUser = await client
        .db("LLL")
        .collection<IUser>(Collection.USERS)
        .findOne(
          {
            _id: new ObjectId(userFromCookies._id),
          },
          { projection: { password: 0 } },
        );

      const [admin] = await client
        .db("LLL")
        .collection<IAdmin>(Collection.ADMIN)
        .find({})
        .toArray();

      const [games, users] = await fetchRequiredCollectionsFromMongoDb(client, {
        serialised: false,
      })();

      const usersById = groupUsersById(users);

      let result: GetServerSidePropsResult<P> = { props: {} as P };
      if (getServerSidePropsFunc) {
        result = await getServerSidePropsFunc({
          ...context,
          parentProps: {
            admin,
            user: fullUser,
            games,
            users,
            usersById,
          },
        } as CustomServerSidePropsContext);
      }

      const injectedProps: InjectedServerSideProps & { user: string } = {
        isConnected: true,
        admin: JSON.parse(JSON.stringify(admin)) as string,
        user: JSON.parse(JSON.stringify(fullUser)) as string,
        games: JSON.parse(JSON.stringify(games)) as string,
        users: JSON.parse(JSON.stringify(users)) as string,
        usersById: JSON.parse(JSON.stringify(usersById)) as string,
      };

      if ("props" in result) {
        return {
          props: {
            ...(await result.props),
            ...injectedProps,
          },
        };
      }

      return result;
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
      return {
        props: {
          isConnected: true,
          admin: null,
          games: [],
          user: null,
          users: [],
          usersById: {},
        } as InjectedServerSideProps & P,
      };
    }
  };
}
