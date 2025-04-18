import type { GetServerSideProps } from "next";
import { useMemo, useState } from "react";

import client from "../lib/mongodb";

import { Signees } from "@/components/Signup";
import { Games } from "@/components/Signup/Games";
import { RegisterToPlay } from "@/components/Signup/RegisterToPlay";
import { Collapsible, RemainingSpots } from "@/components/ui";
import {
  MAX_WAITLIST_PER_GAME,
  MAX_SIGNUPS_PER_GAME,
} from "@/constants/signups";
import { useSignup } from "@/hooks/useSignup";
import type { IGame, Signup } from "@/types/signups";
import { groupSignupsByDayAndGame } from "@/utils/data";
import { sortDaysOfWeek } from "@/utils/sort";
import { cn } from "@/utils/tailwind";

export interface ISignups {
  signups: Signup[];
  gamesByDay: Record<IGame["day"], IGame[]>;
}

const Signups: React.FC<ISignups> = ({
  signups: signupsInitialState,
  gamesByDay,
}) => {
  const [player, setPlayer] = useState<Partial<Signup>>({});
  const {
    signupStore: [signups, setSignups],
    loadingStore: [loading],
    handleDbSignup: handleSignup,
  } = useSignup({
    games: gamesByDay,
    initialState: signupsInitialState,
    player,
  });

  const signupsByDayAndGame = useMemo(
    () => groupSignupsByDayAndGame(signups),
    [signups],
  );

  const [collapsed, setCollapse] = useState<Record<string, boolean>>(
    Object.keys(gamesByDay).reduce(
      (acc, d) => ({
        ...acc,
        [d]: true,
      }),
      {},
    ),
  );

  return (
    <>
      <div className="flex flex-col gap-y-1 text-black container">
        <div className="container-header !h-auto -mt-2 -mx-1.5">
          <h3 className="mr-auto px-2 py-1">Weekly Games</h3>{" "}
          <strong className="pr-2">x</strong>
        </div>
        <p>Sign up for the weekly games here. </p>
      </div>
      <div className="flex flex-col gap-y-6 px-5 !pt-5 !pb-4 w-full container !bg-[var(--background-color-2)]">
        <div className="container-header !h-7 -mt-4 -mx-1.5">
          <strong className="pr-2">X</strong>
        </div>
        {Object.entries(gamesByDay).map(([day, games]) => {
          const signupsByGameId = signupsByDayAndGame[day as IGame["day"]];
          const signedUp = Object.values(signupsByGameId ?? {}).reduce(
            (acc, signees = []) => acc + signees.length,
            0,
          );
          const maxSignups = MAX_SIGNUPS_PER_GAME * games.length;

          const waitlistSignedup =
            Math.max(0, signedUp - maxSignups) || undefined;
          const maxWaitlist = MAX_WAITLIST_PER_GAME * games.length;

          if (games.length === 0) {
            return (
              <div className="container flex-col">
                <div className="container-header !h-auto -mt-2 -mx-1.5">x</div>
                <p className="ml-0 pl-6 text-black p-6 m-auto">
                  <span className="text-3xl mr-2">ಠ_ಠ</span> No {day} games
                  listed yet. Check back later!
                </p>
              </div>
            );
          }

          return (
            <Collapsible
              key={day}
              className="flex flex-col items-center justify-start w-full md:px-5 gap-y-8 mb-30 hover:bg-[var(--background-color-2)]"
              collapsedClassName="container mb-0"
              collapsedHeight={signedUp > maxSignups ? 145 : 110}
              customState={collapsed[day]}
            >
              <div
                className={cn(
                  "flex flex-col !bg-[var(--background-window-highlight)] -mb-4 h-auto w-full container !px-4 !py-3 -mt-4 gap-y-2 cursor-pointer",
                  {
                    "p-2 mt-0 !border-0 -container !bg-revert": collapsed[day],
                  },
                )}
                onClick={() => {
                  setCollapse((prev) => ({
                    ...prev,
                    [day]: !prev[day],
                  }));
                }}
              >
                <div className="flex items-center justify-start gap-4">
                  <h2 className="font-thinner text-md font-serif pb-1">
                    {collapsed[day] ? "+" : "-"}
                  </h2>
                  <div className="flex items-center w-full font-bold text-3xl italic uppercase tracking-tight">
                    {day}
                    <strong className="ml-auto">
                      {games.length} {games.length > 1 ? "games" : "game"}
                    </strong>
                  </div>
                </div>
                <RemainingSpots signedUp={signedUp} maxSignups={maxSignups} />
                {waitlistSignedup !== undefined && (
                  <RemainingSpots
                    title="Waitlist spots:"
                    signedUp={Math.min(signedUp - maxSignups, maxWaitlist)}
                    maxSignups={maxWaitlist}
                  />
                )}
              </div>

              <div className="flex flex-col gap-y-2 justify-start w-full">
                <div className="container-header !h-auto !text-2xl p-1">
                  Available games
                </div>
                <div className="flex flex-col gap-y-2">
                  {games.map((game) => {
                    const allSignups = signupsByGameId?.[game.game_id] ?? [];
                    const signups4Game = allSignups.slice(
                      0,
                      MAX_SIGNUPS_PER_GAME,
                    );
                    const waitlist4Game =
                      allSignups.slice(MAX_SIGNUPS_PER_GAME);

                    return (
                      <Collapsible
                        key={game.game_id}
                        className="flex flex-col gap-y-2 w-full mb-10 transition-[height] duration-300 ease-in-out"
                        collapsedClassName="mb-0"
                        collapsedHeight={160}
                        startCollapsed={false}
                      >
                        <Games signupsAmt={signups4Game.length} {...game}>
                          [+] Tap to view/hide list
                        </Games>
                        <div className="flex flex-col gap-y-2 justify-start ml-auto w-[80%] lg:w-[350px] border-4 border-red p-2 container">
                          <div className="container-header">
                            Signed-up players
                          </div>
                          <div className="flex flex-col items-center gap-y-2">
                            {signups4Game.length === 0 ? (
                              <p>No players yet. Sign up!</p>
                            ) : (
                              signups4Game.map((signup) => (
                                <Signees
                                  key={signup._id}
                                  {...signup}
                                  setSignups={setSignups}
                                />
                              ))
                            )}
                          </div>
                        </div>
                        {waitlist4Game.length > 0 && (
                          <div className="flex flex-col gap-y-2 justify-start ml-auto w-[80%] lg:w-[350px] border-4 border-red p-2 container">
                            <div className="container-header !bg-orange-500">
                              Waitlist players
                            </div>
                            <div className="flex flex-col items-center gap-y-2">
                              {waitlist4Game.map((signup) => (
                                <Signees
                                  key={signup._id}
                                  {...signup}
                                  setSignups={setSignups}
                                />
                              ))}
                            </div>
                          </div>
                        )}
                      </Collapsible>
                    );
                  })}
                </div>
              </div>

              <RegisterToPlay
                games={games}
                playerStore={[player, setPlayer]}
                loading={loading}
                handleSignup={async () => {
                  await handleSignup(day as IGame["day"]);
                }}
              />
            </Collapsible>
          );
        })}
      </div>
    </>
  );
};

export default Signups;

export const getServerSideProps: GetServerSideProps = async () => {
  try {
    await client.connect();

    const db = client.db("LLL");
    const games = await db.collection<IGame>("games").find({}).toArray();
    const signups = await db
      .collection<Signup>("signups")
      .find({})
      .limit(
        (games.length || 1) * (MAX_SIGNUPS_PER_GAME + MAX_WAITLIST_PER_GAME),
      )
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
        signups: JSON.parse(JSON.stringify(signups)) as string,
        gamesByDay: JSON.parse(JSON.stringify(gamesByDay)) as string,
      },
    };
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(e);
    return { props: { signups: [], gamesByDay: {} } };
  }
};
