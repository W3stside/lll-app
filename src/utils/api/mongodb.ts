import type { MongoClient, WithId } from "mongodb";

import { Collection } from "@/types";
import type { IAdmin } from "@/types/admin";
import type { IGame, IUser } from "@/types/users";

export async function fetchGamesFromMongodb(
  client: MongoClient,
  serialised: false,
): Promise<WithId<WithId<IGame>[]>>;
export async function fetchGamesFromMongodb(
  client: MongoClient,
  serialised: true,
): Promise<string>;
export async function fetchGamesFromMongodb(
  client: MongoClient,
  serialised: boolean,
): Promise<WithId<IGame>[] | string> {
  await client.connect();

  const db = client.db("LLL");
  const games = await db.collection<IGame>(Collection.GAMES).find({}).toArray();

  return serialised ? (JSON.parse(JSON.stringify(games)) as string) : games;
}

export async function fetchUsersFromMongodb(
  client: MongoClient,
  serialised: false,
): Promise<WithId<IUser>[]>;
export async function fetchUsersFromMongodb(
  client: MongoClient,
  serialised: true,
): Promise<string>;
export async function fetchUsersFromMongodb(
  client: MongoClient,
  serialised: boolean,
): Promise<WithId<IUser>[] | string> {
  await client.connect();

  const db = client.db("LLL");
  const users = await db.collection<IUser>(Collection.USERS).find({}).toArray();

  return serialised ? (JSON.parse(JSON.stringify(users)) as string) : users;
}

type CollectionToDocument = {
  [Collection.USERS]: IUser;
  [Collection.GAMES]: IGame;
  [Collection.ADMIN]: IAdmin;
};

export function fetchRequiredCollectionsFromMongoDb(
  client: MongoClient,
  { serialised }: { serialised: true },
): () => Promise<[string, string]>;
export function fetchRequiredCollectionsFromMongoDb(
  client: MongoClient,
  { serialised }: { serialised: false },
): () => Promise<[WithId<IGame>[], WithId<IUser>[]]>;
export function fetchRequiredCollectionsFromMongoDb(
  client: MongoClient,
  { serialised }: { serialised: boolean },
): () => Promise<[string, string] | [WithId<IGame>[], WithId<IUser>[]]> {
  return async () => {
    await client.connect();

    const db = client.db("LLL");
    const collectionsResults = (await Promise.all(
      [Collection.GAMES, Collection.USERS].map(
        async (coll) =>
          await db
            .collection<CollectionToDocument[typeof coll]>(coll)
            .find({}, { projection: { password: 0 } })
            .toArray(),
      ),
    )) as [WithId<IGame>[], WithId<IUser>[]];

    return serialised
      ? (collectionsResults.map(
          (unserialised) => JSON.parse(JSON.stringify(unserialised)) as string,
        ) as [string, string])
      : collectionsResults;
  };
}
