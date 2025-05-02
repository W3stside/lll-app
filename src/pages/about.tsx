import type { GetServerSideProps } from "next";
import Link from "next/link";

import { PartnerProducts } from "@/components/PartnerProducts";
import {
  NAVLINKS_MAP,
  RULEBOOK_URL,
  WHATS_APP_GROUP_URL,
} from "@/constants/links";
import client from "@/lib/mongodb";
import type { IGame } from "@/types/users";
import { fetchGamesFromMongodb } from "@/utils/api/mongodb";
import { sortDaysOfWeek } from "@/utils/sort";

export const getServerSideProps: GetServerSideProps = async () => {
  try {
    await client.connect();

    const games = await fetchGamesFromMongodb(client, false);
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
        games: JSON.parse(JSON.stringify(games)) as string,
      },
    };
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(e);
    return {
      props: {
        isConnected: false,
        gamesByDay: {},
        games: [],
      },
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
          <br />
          <p>
            Sign up for games & view lists{" "}
            <Link href={NAVLINKS_MAP.SIGNUP}>here</Link>
          </p>{" "}
          <br />
          <p>
            !! Cancellations <strong>within 12 hours</strong> of a game pay for
            their spot YOU are responsible for payments of anyone you add to the
            list !!
          </p>
          <br />
          <p>
            <strong>Bring a black AND white shirt</strong> <br />
            <small>
              Just bring both. Don't bring green and call it black. Just bring
              black and white. No, red is not black.
            </small>
          </p>
          <br />
          <p>
            <strong>💵💵 €5/game - CASH ONLY!! 💵💵</strong> <br />
            <small>
              We don't accept MBWay because the amount of payments we would need
              to accept far exceeds their minimum untaxed threshold.
            </small>
          </p>
          <br />
          <p>
            <strong>We have a ladies team!</strong>
          </p>{" "}
          <p>Message Josh for the link if you wanna share it with someone.</p>
          <br />
          <ul>
            <strong>Games:</strong>
            {Object.entries(gamesByDay).map(([day, games], idx) => (
              <li key={day}>
                <div className="flex flex-wrap gap-x-2">
                  {idx + 1}. {day}
                  {games.map((g, i) => (
                    <span key={g._id.toString()}>
                      @ {g.time}
                      {games.length > 1 && i !== games.length - 1 && ","}
                    </span>
                  ))}
                </div>
              </li>
            ))}
          </ul>
          <br />
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
