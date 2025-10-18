import type { ObjectId } from "mongodb";
import Image from "next/image";
import { useState } from "react";

import { SigneeComponent } from "../Signup/SIgnees/SigneeComponent";
import { StyledGamesList } from "../Signup/SignupsList/StyledGamesList";
import { Collapsible } from "../ui";

import errorIcon from "@/assets/error.png";
import { DAYS_IN_WEEK_MAP } from "@/constants/date";
import { MAX_SIGNUPS_PER_GAME } from "@/constants/signups";
import { GameType, type IGame, type IUser } from "@/types";
import { formatDateStr, computeGameDate } from "@/utils/date";
import { cn } from "@/utils/tailwind";

interface ITrackPayment {
  gamesByDay: Record<string, IGame[]>;
  usersById: Record<string, IUser | undefined>;
  paymentsConfirmed: Partial<Record<string, string[]>>;
  setPaymentsConfirmed: React.Dispatch<
    React.SetStateAction<Partial<Record<string, string[]>>>
  >;
  handlePayment: (
    userId: ObjectId,
    game: IGame,
    gameDateStr: string,
    hasMissingPayment: boolean,
  ) => Promise<void>;
  loading: boolean;
  startCollapsed?: boolean;
}

export function TrackPayment({
  gamesByDay,
  usersById,
  paymentsConfirmed,
  setPaymentsConfirmed,
  handlePayment,
  loading,
  startCollapsed = true,
}: ITrackPayment) {
  const [collapsed, setCollapse] =
    useState<Record<string, boolean>>(DAYS_IN_WEEK_MAP);

  return (
    <Collapsible
      className="flex flex-col gap-y-1 text-black container !px-[1px] !border-0"
      collapsedHeight={39}
      startCollapsed={startCollapsed}
    >
      <div className="container-header !h-auto -mt-2 mx-[2px] py-2 !text-xl md:!text-2xl">
        <small className="px-2 py-1 text-xs mr-auto">
          [+/-] <span className="hidden xl:inline">expand/minimise</span>
        </small>
        Track payment per game
      </div>
      <div className="container text-xs">
        Manage player game payments here. Clicking "Not paid" will record that
        player as having missed payment for that game. A full list can be seen
        below in "Payment tracking".
      </div>
      <div className="flex flex-col gap-y-4 pt-3">
        {Object.entries(gamesByDay).map(([day, gamesForDay]) => (
          <Collapsible
            key={day}
            className="relative flex flex-col items-center justify-start md:px-5 gap-y-8 mb-30 w-full"
            collapsedClassName="container mb-0"
            collapsedHeight={80}
            customState={collapsed[day]}
            startCollapsed
          >
            <div
              className={cn(
                "flex flex-col !gap-y-1 !bg-[var(--background-window-highlight)] -mb-4 h-auto w-full container px-4 py-3 gap-y-2",
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
              <div className="flex items-center justify-start gap-4 gap-x-2">
                <div
                  className={cn(
                    "flex flex-col items-between justify-start gap-y-0 w-full -mt-2",
                    { "mt-0": !collapsed[day] },
                  )}
                >
                  <div className="flex items-center w-full font-bold text-3xl italic uppercase tracking-tight">
                    <span
                      className={cn("flex flex-col items-start gap-x-5", {})}
                    >
                      <div>{day}</div>
                    </span>
                    <strong className="ml-auto not-italic">
                      {gamesForDay.length}{" "}
                      {gamesForDay.length > 1 ? "games" : "game"}
                    </strong>
                  </div>
                  <div className="flex justify-between items-center w-full">
                    <small className="font-light px-2 text-xs mr-auto">
                      {computeGameDate(
                        day as IGame["day"],
                        gamesForDay[0].time,
                        "WET",
                      ).toDateString()}
                    </small>
                    <small className="px-2 py-1 text-xs py-4 ml-auto">
                      [{collapsed[day] ? "+" : "-"}]{" "}
                      <span>{collapsed[day] ? "expand" : "minimise"}</span>
                    </small>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-y-2 justify-start w-full">
                <div className="flex flex-col gap-y-2">
                  {gamesForDay.map((g) => {
                    const gameDateStr = formatDateStr(
                      computeGameDate(
                        day as IGame["day"],
                        g.time,
                        "WET",
                      ).toISOString(),
                    );

                    return (
                      <StyledGamesList
                        game={g}
                        collapsedHeight={140}
                        nextGameDate=""
                        gameCancelled={false}
                        confirmedList={null}
                        waitlistAmt={null}
                        startCollapsed
                      >
                        <div className="flex flex-col gap-y-2">
                          {g.players
                            .slice(
                              0,
                              MAX_SIGNUPS_PER_GAME[g.type ?? GameType.STANDARD],
                            )
                            .flatMap((u) => {
                              const specificUser = usersById[u];
                              if (specificUser === undefined) return [];

                              const hasMissingPayment =
                                specificUser.missedPayments?.some(
                                  (info) => info.date === gameDateStr,
                                ) ?? false;
                              const userPaid =
                                paymentsConfirmed[gameDateStr]?.includes(u) ??
                                false;

                              return (
                                <SigneeComponent
                                  key={u}
                                  className="justify-center min-h-[88px] [&>div]:flex-row [&>div>div>div:nth-child(2)]:text-left [&>div>div>div:nth-child(2)>div]:justify-start"
                                  containerClassName={
                                    (
                                      paymentsConfirmed[gameDateStr] ?? []
                                    ).includes(u)
                                      ? "!bg-[var(--background-success)]"
                                      : hasMissingPayment
                                        ? "!bg-[var(--background-error-alt)]"
                                        : ""
                                  }
                                  hideAvatar
                                  errorMsg={null}
                                  loading={loading}
                                  {...specificUser}
                                >
                                  <div className="flex flex-row-reverse gap-x-2 items-center min-w-[130px]">
                                    {(hasMissingPayment || !userPaid) && (
                                      <button
                                        className={cn(
                                          "flex-1 justify-center whitespace-nowrap h-[60px]",
                                          {
                                            "bg-[var(--background-2)]":
                                              !hasMissingPayment,
                                          },
                                        )}
                                        disabled={
                                          (!hasMissingPayment && userPaid) ||
                                          loading
                                        }
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setPaymentsConfirmed((prev) => ({
                                            ...prev,
                                            [gameDateStr]: [
                                              ...(prev[gameDateStr] ?? []),
                                              u,
                                            ],
                                          }));

                                          if (hasMissingPayment) {
                                            void handlePayment(
                                              specificUser._id,
                                              g,
                                              gameDateStr,
                                              true,
                                            );
                                          }
                                        }}
                                      >
                                        <div className="flex gap-x-1 items-center">
                                          <span className="text-3xl">✅</span>
                                        </div>
                                      </button>
                                    )}
                                    <button
                                      className={cn(
                                        "flex-1 justify-center whitespace-nowrap h-[60px]",
                                        {
                                          "bg-[var(--background-error-alt)]":
                                            !hasMissingPayment,
                                        },
                                      )}
                                      disabled={hasMissingPayment || loading}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        void handlePayment(
                                          specificUser._id,
                                          g,
                                          gameDateStr,
                                          hasMissingPayment,
                                        );
                                        if (userPaid) {
                                          setPaymentsConfirmed((prev) => ({
                                            ...prev,
                                            [gameDateStr]: prev[
                                              gameDateStr
                                            ]?.filter((id) => id !== u),
                                          }));
                                        }
                                      }}
                                    >
                                      <div className="flex gap-x-2.5 items-center justify-center w-full">
                                        <Image
                                          src={errorIcon}
                                          alt="error"
                                          className="size-8"
                                        />
                                      </div>
                                    </button>
                                  </div>
                                </SigneeComponent>
                              );
                            })}
                        </div>
                        <small className="mt-2 mx-auto">
                          - End game data -
                        </small>
                      </StyledGamesList>
                    );
                  })}
                </div>
              </div>
            </div>
          </Collapsible>
        ))}
      </div>
    </Collapsible>
  );
}
