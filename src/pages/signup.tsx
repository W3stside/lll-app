import type { GetServerSideProps } from "next";
import Image from "next/image";
import { useEffect, useState } from "react";

import ebaumsWorld from "@/assets/ebaums-world.png";
import { FilterStuff } from "@/components/FilterStuff";
import { PartnerProducts } from "@/components/PartnerProducts";
import { RegisterToPlay } from "@/components/Register/RegisterToPlay";
import { Signees } from "@/components/Signup";
import { Games } from "@/components/Signup/Games";
import { Collapsible, RemainingSpots } from "@/components/ui";
import { DAYS_IN_WEEK } from "@/constants/date";
import { MAX_SIGNUPS_PER_GAME } from "@/constants/signups";
import { useActions } from "@/context/Actions/context";
import { useGames } from "@/context/Games/context";
import { useUser } from "@/context/User/context";
import { withServerSideProps } from "@/hoc/withServerSideProps";
import { useWeeklyGamesData } from "@/hooks/signups/useWeeklyGamesData";
import { useFilterGames } from "@/hooks/useFilterGames";
import { GameStatus, Role } from "@/types";
import type { IAdmin } from "@/types/admin";
import type { IGame, IUser } from "@/types/users";
import { checkPlayerIsUser } from "@/utils/data";
import { cn } from "@/utils/tailwind";

export interface ISignups {
  user: IUser;
  usersById: Record<string, IUser>;
  games: IGame[];
  admin: IAdmin;
}

const Signups: React.FC<ISignups> = ({
  admin,
  user,
  usersById,
  games: gamesServerSide,
}) => {
  const [selectedGameId, setSelectedGameId] = useState<string | undefined>();

  const { games: gamesContext, gamesByDay, setGames } = useGames();
  const { user: userContext, setUser } = useUser();
  const { loading: actionLoading, cancelGame, signupForGame } = useActions();

  const { filteredGames, searchFilter, filters, setFilter, setSearchFilter } =
    useFilterGames({
      userId: user._id,
      usersById,
      gamesByDay,
    });

  const [collapsed, setCollapse] = useState<Record<string, boolean>>(() =>
    DAYS_IN_WEEK.reduce(
      (acc, day) => ({
        ...acc,
        [day]: true,
      }),
      {},
    ),
  );

  // Sync server-side games with client-side games
  useEffect(() => {
    if (gamesServerSide.length !== gamesContext.length) {
      setGames(gamesServerSide);
    }
  }, [gamesContext.length, gamesByDay, gamesServerSide, setGames]);

  const gamesData = useWeeklyGamesData(filteredGames, user, usersById);

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
      {userContext.role === Role.ADMIN || admin.signup_open ? (
        <>
          {userContext.role === Role.ADMIN && !admin.signup_open && (
            <div className="bg-[var(--background-window-highlight)] text-black px-4">
              SIGNUPS ARE CLOSED. YOU ARE VIEWING THIS AS AN ADMIN - NORMAL
              USERS WILL NOT SEE GAMES.
            </div>
          )}
          <div className="flex flex-col gap-y-6 px-5 !pt-5 !pb-4 w-full container !bg-[var(--background-color-2)] min-h-[374px]">
            <div className="container-header !h-7 -mt-4 -mx-1.5">
              <strong className="pr-2">X</strong>
            </div>
            <div
              className={cn(
                "border-out flex gap-x-2 items-center text-xs -mt-5 -mb-5 px-1.5",
                {
                  "bg-[var(--background-window-highlight)]":
                    filters !== undefined || searchFilter !== "",
                },
              )}
            >
              Active filters:{" "}
              {filters?.toLocaleLowerCase() ??
                (searchFilter !== ""
                  ? searchFilter.toLocaleLowerCase()
                  : undefined) ??
                "none"}
            </div>
            <div className="flex flex-col gap-y-3 h-full">
              {gamesData.length > 0 ? (
                gamesData.map(
                  ({
                    capacity,
                    day,
                    games,
                    gameDate,
                    gameStatus,
                    gamesFullyCapped,
                    maxSignups,
                    openSpots,
                    signedUp,
                    userFullyBooked,
                    shareList,
                  }) => {
                    if (games.length === 0) {
                      return (
                        <div className="container flex-col">
                          <div className="container-header !h-auto -mt-2 -mx-1.5">
                            x
                          </div>
                          <p className="ml-0 pl-6 text-black p-6 m-auto">
                            <span className="text-3xl mr-2">ಠ_ಠ</span> No {day}{" "}
                            games listed yet. Check back later!
                          </p>
                        </div>
                      );
                    }

                    return (
                      <Collapsible
                        key={day}
                        className="relative flex flex-col items-center justify-start md:px-5 gap-y-8 mb-30 w-full hover:bg-[var(--background-color-2)]"
                        collapsedClassName="container mb-0"
                        collapsedHeight={
                          gameStatus !== GameStatus.PAST &&
                          gamesFullyCapped.length > 0
                            ? 128
                            : gameStatus === GameStatus.PAST
                              ? userContext.role !== Role.ADMIN
                                ? 50
                                : 60
                              : 103
                        }
                        customState={collapsed[day]}
                        disabled={
                          userContext.role !== Role.ADMIN &&
                          gameStatus === GameStatus.PAST
                        }
                      >
                        <div
                          className={cn(
                            "flex flex-col !gap-y-1 !bg-[var(--background-window-highlight)] -mb-4 h-auto w-full container px-4 py-3 gap-y-2",
                            {
                              "p-2 mt-0 !border-0 -container !bg-revert":
                                collapsed[day],
                              "px-0 py-[2px]": gameStatus === GameStatus.PAST,
                            },
                          )}
                          onClick={
                            userContext.role !== Role.ADMIN &&
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
                            <h2
                              className={cn("font-thinner text-md font-serif", {
                                "-mt-2": gameStatus === GameStatus.PAST,
                                "mb-[-4px]": !collapsed[day],
                              })}
                            >
                              {collapsed[day] && gameStatus !== GameStatus.PAST
                                ? "+"
                                : "-"}
                            </h2>
                            <div
                              className={cn(
                                "flex flex-col items-between justify-start gap-y-0 w-full -mt-2",
                                { "mt-0": !collapsed[day] },
                              )}
                            >
                              <small className="text-xs -mb-1 text-right">
                                {gameDate !== undefined
                                  ? gameDate.toDateString()
                                  : "No game date. Check later!"}
                              </small>
                              <div className="flex items-center w-full font-bold text-3xl italic uppercase tracking-tight">
                                <span
                                  className={cn(
                                    "flex flex-col items-start gap-x-5",
                                    {
                                      "-mt-2": gameStatus === GameStatus.PAST,
                                    },
                                  )}
                                >
                                  {day}
                                  {gameStatus === GameStatus.PAST &&
                                    userContext.role === Role.ADMIN && (
                                      <small className="text-xs monospace font-light no-italic lowercase bg-[var(--background-error)] p-[2px_4px] mt-[-3px] mb-[3px]">
                                        Game past. Admin view only.
                                      </small>
                                    )}
                                </span>
                                <strong className="ml-auto not-italic">
                                  {games.length}{" "}
                                  {games.length > 1 ? "games" : "game"}
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
                          {gameStatus !== GameStatus.PAST &&
                            gamesFullyCapped.length > 0 && (
                              <RemainingSpots
                                title="Waitlist:"
                                text={
                                  <div className="text-sm bg-[var(--background-window-highlight)] px-2 py-1 -mr-2">
                                    <span>
                                      {gamesFullyCapped.length > 1
                                        ? "games"
                                        : "game"}
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
                          <div className="flex items-center gap-x-2 h-[32.5px]">
                            <div className="container-header !h-auto !text-2xl p-1 w-full pl-4 !justify-start">
                              Available games
                            </div>
                            {shareList !== undefined &&
                              (userContext.role === Role.ADMIN ||
                                gameStatus !== GameStatus.PAST) && (
                                <button
                                  className="flex items-center justify-center w-min whitespace-nowrap h-full underline"
                                  onClick={shareList}
                                >
                                  Share games!
                                </button>
                              )}
                          </div>
                          <div className="flex flex-col gap-y-2">
                            {games.map((game, gIdx) => {
                              const nextGameDate = gameDate?.toUTCString();

                              const confirmedList = game.players.slice(
                                0,
                                MAX_SIGNUPS_PER_GAME,
                              );
                              const waitlist =
                                game.players.slice(MAX_SIGNUPS_PER_GAME);

                              return (
                                <Collapsible
                                  key={game._id.toString()}
                                  className="flex flex-col gap-y-2 w-full mb-10 transition-[height] duration-300 ease-in-out"
                                  collapsedClassName="mb-0"
                                  collapsedHeight={
                                    capacity[gIdx] <= 0 ? 182 : 160
                                  }
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
                                    className="flex flex-col gap-y-2 justify-start ml-auto w-[90%] sm:w-[350px] border-4 border-red p-2 container"
                                  >
                                    <div className="container-header">
                                      <small className="ml-2 mr-auto">
                                        [open/close]
                                      </small>{" "}
                                      Signed-up players
                                    </div>
                                    <div className="flex flex-col items-center gap-y-2">
                                      {confirmedList.length === 0 ? (
                                        <p>No players yet. Sign up!</p>
                                      ) : (
                                        confirmedList.map((playerId) => {
                                          const signee =
                                            usersById[playerId.toString()];
                                          return (
                                            <Signees
                                              key={playerId.toString()}
                                              {...signee}
                                              cancelGame={
                                                checkPlayerIsUser(
                                                  signee,
                                                  user,
                                                ) && nextGameDate !== undefined
                                                  ? (e) => {
                                                      e.stopPropagation();
                                                      cancelGame(
                                                        game._id,
                                                        signee._id,
                                                        nextGameDate,
                                                      );
                                                    }
                                                  : undefined
                                              }
                                            />
                                          );
                                        })
                                      )}
                                    </div>
                                  </Collapsible>
                                  {waitlist.length > 0 && (
                                    <Collapsible
                                      collapsedHeight={36}
                                      className="flex flex-col gap-y-2 justify-start ml-auto w-[90%] sm:w-[350px] border-4 border-red p-2 container"
                                    >
                                      <div className="container-header !bg-orange-500">
                                        <small className="ml-2 mr-auto">
                                          [open/close]
                                        </small>{" "}
                                        Waitlist players
                                      </div>
                                      <div className="flex flex-col items-center gap-y-2">
                                        {waitlist.map((playerId) => {
                                          const signee =
                                            usersById[playerId.toString()];
                                          return (
                                            <Signees
                                              key={playerId.toString()}
                                              {...signee}
                                              cancelGame={
                                                checkPlayerIsUser(
                                                  signee,
                                                  user,
                                                ) && nextGameDate !== undefined
                                                  ? (e) => {
                                                      e.stopPropagation();
                                                      cancelGame(
                                                        game._id,
                                                        signee._id,
                                                        nextGameDate,
                                                        {
                                                          bypassThreshold: true,
                                                        },
                                                      );
                                                    }
                                                  : undefined
                                              }
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
                          loading={actionLoading}
                          userId={user._id}
                          gameId={selectedGameId}
                          submitDisabled={
                            gameStatus === GameStatus.PAST ||
                            (selectedGameId !== undefined &&
                              userContext.registered_games?.includes(
                                selectedGameId,
                              ))
                          }
                          disabled={
                            gameStatus === GameStatus.PAST || userFullyBooked
                          }
                          setGameId={setSelectedGameId}
                          handleSignup={async () => {
                            if (selectedGameId === undefined) return;
                            await signupForGame(
                              gamesByDay[day]?.find(
                                (g) => g._id.toString() === selectedGameId,
                              ),
                              user._id,
                            );
                            setUser((u) => ({
                              ...u,
                              registered_games: [
                                ...(u.registered_games ?? []),
                                selectedGameId,
                              ],
                            }));
                          }}
                        />
                      </Collapsible>
                    );
                  },
                )
              ) : (
                <div className="container flex-col items-center h-full">
                  <p className="ml-0 pl-6 text-black p-6 m-auto">
                    <span className="text-3xl mr-2">ಠ_ಠ</span> No games found at
                    this filter!
                  </p>
                </div>
              )}
            </div>
          </div>
          <FilterStuff
            name="games"
            searchFilter={searchFilter}
            filters={filters}
            setFilter={setFilter}
            setSearchFilter={setSearchFilter}
          />
        </>
      ) : (
        <div className="container !p-6 h-auto md:h-[400px] flex flex-col items-center justify-center">
          <strong>Signups are closed.</strong> <br />
          Please check back later!
        </div>
      )}
      <PartnerProducts />
    </>
  );
};

export default Signups;

export const getServerSideProps: GetServerSideProps = withServerSideProps();
