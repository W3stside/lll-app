/* eslint-disable no-console */
import type { GetServerSideProps } from "next";
import Link from "next/link";

import { PartnerProducts } from "@/components/PartnerProducts";
import {
  NAVLINKS_MAP,
  RULEBOOK_URL,
  WHATS_APP_GROUP_URL,
} from "@/constants/links";
import client from "@/lib/mongodb";
import { Collection } from "@/types";
import type { IGame } from "@/types/users";
import { sortDaysOfWeek } from "@/utils/sort";

type ConnectionStatus = {
  isConnected: boolean;
};

export const getServerSideProps: GetServerSideProps<
  ConnectionStatus
> = async () => {
  try {
    await client.connect();
    const db = client.db("LLL");
    const games = await db
      .collection<IGame>(Collection.GAMES)
      .find({})
      .toArray();

    const gamesByDay = sortDaysOfWeek(games).reduce<
      Partial<Record<IGame["day"], IGame[]>>
    >(
      (acc, game) => ({
        ...acc,
        [game.day]: [...(acc[game.day] ?? []), game],
      }),
      {},
    );

    return {
      props: {
        isConnected: true,
        gamesByDay: JSON.parse(JSON.stringify(gamesByDay)) as string,
      },
    };
  } catch (e) {
    console.error(e);
    return {
      props: { isConnected: false, gamesByDay: {} },
    };
  }
};

interface IAbout {
  isConnected: boolean;
  gamesByDay: Partial<Record<IGame["day"], IGame[]>>;
}

export default function About({ isConnected, gamesByDay }: IAbout) {
  if (!isConnected) return <h1>Connecting to db...</h1>;

  return (
    <>
      <div className="flex flex-col gap-y-1 text-black container">
        <div className="container-header !h-auto -mt-2 -mx-1.5">
          <h4 className="mr-auto px-2 py-1">About the footie</h4> X
        </div>
        <div className="px-2 py-2">
          <h5 className="mb-3">
            Non-profit social group. <strong>All welcome!</strong>
          </h5>
          <p>
            Sign up for games & view lists{" "}
            <Link href={NAVLINKS_MAP.SIGNUP}>here</Link>
          </p>{" "}
          <p>
            Cancellations <strong>within 12 hours</strong> of a game pay for
            their spot YOU are responsible for payments of anyone you add to the
            list.
          </p>
          <p>
            <strong>We have a ladies team!</strong>
          </p>{" "}
          <p>Message Josh for the link if you wanna share it with someone.</p>
          <ul>
            <strong>Games:</strong>
            {Object.entries(gamesByDay).map(([day, games]) => (
              <li key={day}>
                <div className="flex gap-x-2">
                  {games.map((g, i) => (
                    <span key={g._id.toString()}>
                      {g.day} @ {g.time}{" "}
                      {games.length > 1 && i !== games.length - 1 && "//"}
                    </span>
                  ))}
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-2">
            <strong>Group link:</strong>{" "}
            <Link href={WHATS_APP_GROUP_URL} target="_blank" rel="noreferrer">
              WhatsApp group
            </Link>{" "}
          </div>
          <div>
            <strong>Rules:</strong>{" "}
            <Link href={RULEBOOK_URL} target="_blank" rel="noreferrer">
              General group rulebook
            </Link>
          </div>
          <div>
            <strong>Insta:</strong> lowest_league_in_lisbon
          </div>
        </div>
      </div>
      <PartnerProducts />
    </>
  );
}
