import type { ObjectId } from "mongodb";
import type { GetServerSideProps } from "next";
import Image from "next/image";
import { useCallback, useMemo, useState } from "react";
import { useDebounce } from "use-debounce";

import client from "../lib/mongodb";

import ebaumsWorld from "@/assets/ebaums-world.png";
import { PartnerProducts } from "@/components/PartnerProducts";
import { Signees } from "@/components/Signup";
import { Games } from "@/components/Signup/Games";
import { RegisterToPlay } from "@/components/Signup/RegisterToPlay";
import { Collapsible, RemainingSpots } from "@/components/ui";
import { DAYS_IN_WEEK } from "@/constants/date";
import { MAX_SIGNUPS_PER_GAME } from "@/constants/signups";
import { useGameSignup } from "@/hooks/useGameSignup";
import { getUserFromServerSideRequest } from "@/lib/authUtils";
import { Collection, GameStatus } from "@/types";
import type { IGame, IUser } from "@/types/users";
import {
  checkPlayerIsUser,
  groupGamesByDay,
  groupUsersById,
} from "@/utils/data";
import { computeGameDate, getUSDayIndex } from "@/utils/date";
import { cn } from "@/utils/tailwind";

const SEARCH_DEBOUNCE = 400;

export interface ISignups {
  user: IUser;
  usersById: Record<string, IUser>;
  games: IGame[];
}

const TODAY_INDEX = getUSDayIndex(new Date());

const Signups: React.FC<ISignups> = ({
  user,
  usersById,
  games: gamesInitial,
}) => {
  const [selectedGameId, setSelectedGameId] = useState<string | undefined>();

  const {
    loading,
    gamesStore: [gamesByDay, setGames],
    handleGameSignup,
  } = useGameSignup({
    gamesInitial,
    user,
  });

  const [searchFilterRaw, setSearchFilter] = useState<string>("");
  const [searchFilter] = useDebounce(searchFilterRaw, SEARCH_DEBOUNCE, {
    leading: true,
  });

  const [{ filteredGames, filters }, setFilteredGames] = useState<{
    filteredGames: IGame[] | undefined;
    filters: "my games" | "open games" | "user info" | undefined;
  }>({ filteredGames: undefined, filters: undefined });

  const flatGames = useMemo(
    () => Object.values(gamesByDay).flatMap((g) => [...g]),
    [gamesByDay],
  );

  const handleFilterGamesByUser = useCallback(
    (userId?: ObjectId) => {
      if (userId === undefined) {
        setFilteredGames({ filteredGames: undefined, filters: undefined });
        return;
      }

      const fGames = flatGames.filter((fg) =>
        fg.players.some((pId) => pId.toString() === userId.toString()),
      );

      setFilteredGames({
        filteredGames: fGames,
        filters: "my games",
      });
    },
    [flatGames],
  );

  const handleFilterGamesByOpen = useCallback(
    (filter: boolean) => {
      if (!filter) {
        setFilteredGames({ filteredGames: undefined, filters: undefined });
        return;
      }

      const fGames = flatGames.filter(
        (fg) => fg.players.length < MAX_SIGNUPS_PER_GAME,
      );

      setFilteredGames({
        filteredGames: fGames,
        filters: "open games",
      });
    },
    [flatGames],
  );

  const usersFlatSearched = useMemo(() => {
    const users = Object.values(usersById);
    return searchFilter === ""
      ? users
      : users.filter((u) => {
          const fullName = `${u.first_name} ${u.last_name}`;
          const searchTerm = searchFilter.toLowerCase();
          return (
            fullName.toLowerCase().includes(searchTerm) ||
            u.phone_number.includes(searchTerm)
          );
        });
  }, [searchFilter, usersById]);

  const gamesByUserSearch = useMemo(() => {
    const gamesToFilter = filteredGames ?? flatGames;
    return searchFilter === ""
      ? gamesToFilter
      : gamesToFilter.filter((g) =>
          g.players.some((gId) =>
            usersFlatSearched.some((u) => u._id.toString() === gId.toString()),
          ),
        );
  }, [filteredGames, flatGames, searchFilter, usersFlatSearched]);

  const [collapsed, setCollapse] = useState<Record<string, boolean>>(() =>
    Object.keys(gamesByDay).reduce(
      (acc, d) => ({
        ...acc,
        [d]: true,
      }),
      {},
    ),
  );

  const lastGameOfWeek = gamesByDay[DAYS_IN_WEEK[DAYS_IN_WEEK.length - 1]]?.[
    (gamesByDay[DAYS_IN_WEEK[DAYS_IN_WEEK.length - 1]]?.length ?? 1) - 1
  ] as IGame;

  const lastGameOfWeekDate = computeGameDate(
    lastGameOfWeek.day,
    lastGameOfWeek.time,
    "WET",
  );

  return (
    <>
      <div className="flex flex-col gap-y-1 text-black container">
        <div className="container-header !h-auto -mt-2 -mx-1.5">
          <h3 className="mr-auto px-2 py-1">Weekly Games</h3>{" "}
          <strong className="pr-2">x</strong>
        </div>
        <div className="flex gap-x-4 items-start justify-between">
          <div className="flex flex-col gap-y-1">
            <p>Sign up for the weekly games here. </p>
          </div>
          <Image
            src={ebaumsWorld}
            alt="ebaums world"
            className="h-full w-35 p-1"
          />
        </div>
      </div>
      <div className="flex flex-col gap-y-6 px-5 !pt-5 !pb-4 w-full container !bg-[var(--background-color-2)]">
        <div className="container-header !h-7 -mt-4 -mx-1.5">
          <strong className="pr-2">X</strong>
        </div>
        <div
          className={cn("flex gap-x-2 items-center text-xs -mt-5 -mb-5 px-2", {
            "bg-[var(--background-window-highlight)]": filters !== undefined,
          })}
        >
          Active filters: {filters ?? "none"}
        </div>
        {Object.entries(
          gamesByUserSearch.length > 0
            ? groupGamesByDay(gamesByUserSearch)
            : filteredGames !== undefined
              ? groupGamesByDay(filteredGames)
              : gamesByDay,
        ).map(([day, games]) => {
          const gameDate = computeGameDate(
            day as IGame["day"],
            games[games.length - 1].time,
            "WET",
            new Date() > lastGameOfWeekDate,
          );

          const gameStatus =
            TODAY_INDEX > getUSDayIndex(gameDate) && new Date() > gameDate
              ? GameStatus.PAST
              : GameStatus.UPCOMING;

          const userFullyBooked = games.every((g) =>
            g.players.some((p) => p.toString() === user._id.toString()),
          );

          const { total: signedUp, capacity } = games.reduce<{
            total: number;
            capacity: number[];
          }>(
            (acc, { players = [] }) => ({
              total: acc.total + players.length,
              capacity: [
                ...acc.capacity,
                MAX_SIGNUPS_PER_GAME - players.length,
              ],
            }),
            { total: 0, capacity: [] },
          );
          const gamesFullyCapped = capacity.flatMap((gc) =>
            gc <= 0 ? [gc] : [],
          );

          const openSpots = capacity.reduce(
            (acc, cap) => Math.max(0, cap) + acc,
            0,
          );
          const maxSignups = MAX_SIGNUPS_PER_GAME * games.length;

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
              className="relative flex flex-col items-center justify-start w-full md:px-5 gap-y-8 mb-30 hover:bg-[var(--background-color-2)]"
              collapsedClassName="container mb-0"
              collapsedHeight={gamesFullyCapped.length > 0 ? 135 : 103}
              customState={collapsed[day]}
              disabled={gameStatus === GameStatus.PAST}
            >
              <div
                className={cn(
                  "flex flex-col !gap-y-1 !bg-[var(--background-window-highlight)] -mb-4 h-auto w-full container !px-4 !py-3 -mt-4 gap-y-2",
                  {
                    "p-2 mt-0 !border-0 -container !bg-revert": collapsed[day],
                  },
                )}
                onClick={
                  gameStatus === GameStatus.PAST
                    ? undefined
                    : () => {
                        setCollapse((prev) => ({
                          ...prev,
                          [day]: !prev[day],
                        }));
                      }
                }
              >
                <div className="flex items-center justify-start gap-4 gap-x-2">
                  <h2 className="font-thinner text-md font-serif pb-1">
                    {collapsed[day] ? "+" : "-"}
                  </h2>
                  <div
                    className={cn(
                      "flex flex-col items-between justify-start gap-y-0 w-full -mt-2",
                      { "mt-0": !collapsed[day] },
                    )}
                  >
                    <small className="text-xs -mb-1 text-right">
                      {gameDate.toDateString()}
                    </small>
                    <div className="flex items-center w-full font-bold text-3xl italic uppercase tracking-tight">
                      {day}
                      <strong className="ml-auto">
                        {games.length} {games.length > 1 ? "games" : "game"}
                      </strong>
                    </div>
                  </div>
                </div>
                <RemainingSpots
                  title="Spots remaining:"
                  disabled={gameStatus === GameStatus.PAST}
                  signedUp={maxSignups - openSpots}
                  maxSignups={maxSignups}
                />
                {gamesFullyCapped.length > 0 && (
                  <RemainingSpots
                    title="Waitlist:"
                    text={
                      <div className="text-sm bg-[var(--background-window-highlight)] px-2 py-1 -mr-2">
                        <span>
                          {gamesFullyCapped.length > 1 ? "games" : "game"}
                          {" @ "}
                        </span>
                        <span>
                          {gamesFullyCapped
                            .map((_, idx) => games[idx].time)
                            .join(", ")}
                        </span>
                      </div>
                    }
                    signedUp={Math.min(signedUp - maxSignups, 10)}
                    maxSignups={10}
                  />
                )}
              </div>

              <div className="flex flex-col gap-y-2 justify-start w-full">
                <div className="container-header !h-auto !text-2xl p-1">
                  Available games
                </div>
                <div className="flex flex-col gap-y-2">
                  {games.map((game, gIdx) => {
                    const nextGameDate = gameDate.toUTCString();

                    const confirmedList = game.players.slice(
                      0,
                      MAX_SIGNUPS_PER_GAME,
                    );
                    const waitlist = game.players.slice(MAX_SIGNUPS_PER_GAME);

                    return (
                      <Collapsible
                        key={game._id.toString()}
                        className="flex flex-col gap-y-2 w-full mb-10 transition-[height] duration-300 ease-in-out"
                        collapsedClassName="mb-0"
                        collapsedHeight={capacity[gIdx] <= 0 ? 182 : 160}
                        startCollapsed={false}
                      >
                        <Games
                          signupsAmt={confirmedList.length}
                          waitlistAmt={capacity[gIdx]}
                          date={nextGameDate}
                          {...game}
                        >
                          <small>[+] Tap to expand/collapse</small>
                        </Games>
                        <Collapsible
                          collapsedHeight={36}
                          className="flex flex-col gap-y-2 justify-start ml-auto w-[80%] lg:w-[350px] border-4 border-red p-2 container"
                        >
                          <div className="container-header">
                            <small className="ml-2 mr-auto">[open/close]</small>{" "}
                            Signed-up players
                          </div>
                          <div className="flex flex-col items-center gap-y-2">
                            {confirmedList.length === 0 ? (
                              <p>No players yet. Sign up!</p>
                            ) : (
                              confirmedList.map((playerId) => {
                                const signee = usersById[playerId.toString()];
                                return (
                                  <Signees
                                    key={playerId.toString()}
                                    date={nextGameDate}
                                    {...signee}
                                    games={games}
                                    game_id={game._id}
                                    isUser={checkPlayerIsUser(signee, user)}
                                    setGames={setGames}
                                  />
                                );
                              })
                            )}
                          </div>
                        </Collapsible>
                        {waitlist.length > 0 && (
                          <Collapsible
                            collapsedHeight={36}
                            className="flex flex-col gap-y-2 justify-start ml-auto w-[80%] lg:w-[350px] border-4 border-red p-2 container"
                          >
                            <div className="container-header !bg-orange-500">
                              <small className="ml-2 mr-auto">
                                [open/close]
                              </small>{" "}
                              Waitlist players
                            </div>
                            <div className="flex flex-col items-center gap-y-2">
                              {waitlist.map((playerId) => {
                                const signee = usersById[playerId.toString()];
                                return (
                                  <Signees
                                    key={playerId.toString()}
                                    {...signee}
                                    date={nextGameDate}
                                    games={games}
                                    game_id={game._id}
                                    isUser={checkPlayerIsUser(signee, user)}
                                    setGames={setGames}
                                  />
                                );
                              })}
                            </div>
                          </Collapsible>
                        )}
                      </Collapsible>
                    );
                  })}
                </div>
              </div>

              <RegisterToPlay
                label="Sign up"
                games={games}
                loading={loading}
                userId={user._id}
                gameId={selectedGameId}
                disabled={userFullyBooked}
                setGameId={setSelectedGameId}
                handleSignup={async () => {
                  if (selectedGameId === undefined) return;
                  await handleGameSignup(
                    gamesByDay[day as IGame["day"]]?.find(
                      (g) => g._id.toString() === selectedGameId,
                    ),
                  );
                }}
              />
            </Collapsible>
          );
        })}
      </div>
      <div className="flex flex-col gap-y-1 text-black container">
        <div className="container-header !h-auto -mt-2 -mx-1.5">
          <h5 className="mr-auto px-2 py-1">Filter Games</h5>{" "}
          <strong className="pr-2">x</strong>
        </div>
        <div className="flex items-center gap-x-2">
          Filter:
          <div className="flex gap-x-2 items-center">
            <input
              type="radio"
              id="filter-my-games"
              name="filter-my-games"
              checked={filters === "my games"}
              onClick={() => {
                handleFilterGamesByUser(
                  filters !== "my games" ? user._id : undefined,
                );
              }}
            />
            <strong className="whitespace-nowrap text-sm">My games</strong>
          </div>
          <div className="flex gap-x-2 items-center">
            <input
              type="radio"
              id="filter-open-games"
              name="filter-open-games"
              checked={filters === "open games"}
              onClick={() => {
                handleFilterGamesByOpen(filters !== "open games");
              }}
            />
            <strong className="whitespace-nowrap text-sm">Open games</strong>
          </div>
        </div>
        <div className="flex gap-x-2 items-center">
          <input
            type="text"
            id="filter-by-user-info"
            className="!h-8 !w-40 !px-2 !py-1 text-sm"
            name="filter-by-user-info"
            value={searchFilterRaw}
            onChange={(e) => {
              setSearchFilter(e.target.value);
            }}
          />
          <strong className="whitespace-nowrap text-sm">
            Filter by user info
          </strong>
        </div>
      </div>
      <PartnerProducts />
    </>
  );
};

export default Signups;

export const getServerSideProps: GetServerSideProps = async (context) => {
  try {
    const { user, redirect } = getUserFromServerSideRequest(context);

    if (user === null) return { redirect };

    await client.connect();

    const db = client.db("LLL");
    const games = await db
      .collection<IGame>(Collection.GAMES)
      .find({})
      .toArray();
    const users = await db
      .collection<IUser>(Collection.USERS)
      .find({})
      .toArray();

    const usersById = groupUsersById(users);

    return {
      props: {
        user: {
          _id: user._id,
          first_name: user.first_name,
          last_name: user.last_name,
          phone_number: user.phone_number,
        },
        games: JSON.parse(JSON.stringify(games)) as string,
        usersById: JSON.parse(JSON.stringify(usersById)) as string,
      },
    };
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(e);
    return {
      props: {
        games: [],
        user: null,
        usersById: {},
      },
    };
  }
};
