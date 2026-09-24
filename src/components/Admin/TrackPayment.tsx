import type { ObjectId } from "mongodb";
import Image from "next/image";
import { useState } from "react";

import { SigneeComponent } from "../Signup/SIgnees/SigneeComponent";
import { StyledGamesList } from "../Signup/SignupsList/StyledGamesList";
import { Collapsible } from "../ui";

import errorIcon from "@/assets/error.png";
import { GREEN_TW, RED_TW } from "@/constants/colours";
import { DAYS_IN_WEEK_MAP } from "@/constants/date";
import type { AttendanceStatus, IGame, IGameOccurrence, IUser } from "@/types";
import {
  formatDateStr,
  computeGameDate,
  parseOccurrenceKey,
} from "@/utils/date";
import {
  ATTENDANCE_LABELS,
  getListOccurrenceKey,
  getOccurrenceRowKey,
} from "@/utils/gameHistory";
import { getConfirmedPlayerIds } from "@/utils/games";
import { cn } from "@/utils/tailwind";

const ATTENDANCE_OPTIONS: AttendanceStatus[] = ["present", "no_show"];

interface ITrackPayment {
  gamesByDay: Record<string, IGame[]>;
  usersById: Record<string, IUser | undefined>;
  // Game history rows, keyed by getOccurrenceRowKey
  occurrences: Partial<Record<string, IGameOccurrence>>;
  // Last "Clear all": which week each game's current list is for
  lastResetAt: Date | string | undefined;
  handlePayment: (
    userId: ObjectId,
    game: IGame,
    gameDateStr: string,
    paid: boolean,
    occurrence: string,
  ) => Promise<void>;
  handleAttendance: (
    game: IGame,
    occurrence: string,
    userIds: string[],
    attendance: AttendanceStatus | null,
  ) => Promise<void>;
  loading: boolean;
  startCollapsed?: boolean;
}

export function TrackPayment({
  gamesByDay,
  usersById,
  occurrences,
  lastResetAt,
  handlePayment,
  handleAttendance,
  loading,
  startCollapsed = true,
}: ITrackPayment) {
  const [collapsed, setCollapse] =
    useState<Record<string, boolean>>(DAYS_IN_WEEK_MAP);
  const now = new Date();

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
        Mark whether each player paid and whether they played. Marks are saved
        for every admin and kept in the game history when you clear all signups.
        Unpaid games also show up below in "Players in debt".
      </div>
      <div className="flex flex-col gap-y-4 pt-3">
        {Object.entries(gamesByDay).map(([day, gamesForDay]) => (
          <Collapsible
            key={day}
            className="relative flex flex-col items-center justify-start md:px-5 gap-y-8 mb-10 w-full"
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
                    // Key of the player's debt, as recorded before history
                    const gameDateStr = formatDateStr(g.date);
                    // The week this list is for, the same one the reset
                    // archives it under, whatever the browser's timezone
                    const occurrence = getListOccurrenceKey(
                      g,
                      now,
                      lastResetAt,
                    );
                    const row =
                      occurrences[
                        getOccurrenceRowKey(g._id.toString(), occurrence)
                      ];

                    const playerIds = getConfirmedPlayerIds(g).filter(
                      (id) => usersById[id] !== undefined,
                    );
                    const unmarkedIds = playerIds.filter(
                      (id) => row?.attendance?.[id] === undefined,
                    );
                    const owingIds = new Set(
                      playerIds.filter(
                        (id) =>
                          usersById[id]?.missedPayments?.some(
                            (info) => info.date === gameDateStr,
                          ) ?? false,
                      ),
                    );
                    const countAttendance = (status: AttendanceStatus) =>
                      playerIds.filter((id) => row?.attendance?.[id] === status)
                        .length;
                    const paidCount = playerIds.filter(
                      (id) =>
                        row?.payments?.[id] === "paid" && !owingIds.has(id),
                    ).length;

                    return (
                      <StyledGamesList
                        key={g._id.toString()}
                        game={g}
                        nextGameDate=""
                        gameCancelled={false}
                        confirmedList={null}
                        waitlistAmt={null}
                        collapsible={{
                          collapsedHeight: 120,
                          startCollapsed: true,
                        }}
                      >
                        <div className="flex flex-col gap-y-2">
                          <div
                            className="container flex flex-wrap items-center gap-2 text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                            }}
                          >
                            <span className="mr-auto">
                              <strong>
                                {parseOccurrenceKey(
                                  occurrence,
                                )?.toDateString() ?? occurrence}
                              </strong>{" "}
                              · Played {countAttendance("present")} · No-show{" "}
                              {countAttendance("no_show")} · Paid {paidCount} ·
                              Unpaid {owingIds.size}
                            </span>
                            <button
                              className="justify-center !text-xs"
                              disabled={loading || unmarkedIds.length === 0}
                              onClick={() => {
                                void handleAttendance(
                                  g,
                                  occurrence,
                                  unmarkedIds,
                                  "present",
                                );
                              }}
                            >
                              {unmarkedIds.length > 0
                                ? `Mark the other ${unmarkedIds.length} as played`
                                : "Everyone marked"}
                            </button>
                          </div>
                          {playerIds.flatMap((u) => {
                            const specificUser = usersById[u];
                            if (specificUser === undefined) return [];

                            const hasMissingPayment = owingIds.has(u);
                            const userPaid = row?.payments?.[u] === "paid";
                            const attendance = row?.attendance?.[u];

                            return (
                              <SigneeComponent
                                key={u}
                                className="justify-center min-h-[88px] [&>div]:flex-row [&>div>div>div:nth-child(2)]:text-left [&>div>div>div:nth-child(2)>div]:justify-start"
                                containerClassName={
                                  userPaid && !hasMissingPayment
                                    ? "!bg-[var(--background-success)]"
                                    : hasMissingPayment
                                      ? "!bg-[var(--background-error-alt)]"
                                      : ""
                                }
                                hideAvatar
                                errorMsg={null}
                                loading={loading}
                                {...specificUser}
                                childrenBelow={
                                  <div className="flex flex-wrap items-center gap-2 mt-2 text-sm">
                                    <span className="mr-auto">Attendance:</span>
                                    {ATTENDANCE_OPTIONS.map((status) => (
                                      <button
                                        key={status}
                                        aria-pressed={attendance === status}
                                        className={cn(
                                          "justify-center min-w-[88px]",
                                          {
                                            [GREEN_TW]:
                                              attendance === status &&
                                              status === "present",
                                            [RED_TW]:
                                              attendance === status &&
                                              status === "no_show",
                                          },
                                        )}
                                        disabled={loading}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          // Tapping the current mark clears it
                                          void handleAttendance(
                                            g,
                                            occurrence,
                                            [u],
                                            attendance === status
                                              ? null
                                              : status,
                                          );
                                        }}
                                      >
                                        {ATTENDANCE_LABELS[status]}
                                      </button>
                                    ))}
                                  </div>
                                }
                              >
                                <div className="flex flex-row-reverse gap-x-2 items-center min-w-[130px]">
                                  {(hasMissingPayment || !userPaid) && (
                                    <button
                                      aria-label="Paid"
                                      className={cn(
                                        "flex-1 justify-center whitespace-nowrap h-[60px]",
                                        {
                                          "bg-[var(--background-2)]":
                                            !hasMissingPayment,
                                        },
                                      )}
                                      disabled={loading}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        void handlePayment(
                                          specificUser._id,
                                          g,
                                          gameDateStr,
                                          true,
                                          occurrence,
                                        );
                                      }}
                                    >
                                      <div className="flex gap-x-1 items-center">
                                        <span className="text-3xl">✅</span>
                                      </div>
                                    </button>
                                  )}
                                  <button
                                    aria-label="Not paid"
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
                                        false,
                                        occurrence,
                                      );
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
