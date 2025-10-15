import type { ObjectId } from "mongodb";
import Image from "next/image";

import { SigneeComponent } from "../Signup/SIgnees/SigneeComponent";
import { Collapsible } from "../ui";

import errorIcon from "@/assets/error.png";
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
}

export function TrackPayment({
  gamesByDay,
  usersById,
  paymentsConfirmed,
  setPaymentsConfirmed,
  handlePayment,
  loading,
}: ITrackPayment) {
  return (
    <Collapsible
      className="flex flex-col gap-y-1 text-black container !px-[1px] !border-0"
      collapsedHeight={39}
      startCollapsed
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
            className="flex flex-col gap-y-3 sm:gap-y-2 [&>div.container-header]:bg-[var(--background-window-highlight)] [&>div.container-header]:text-black px-0"
            collapsedClassName="[&>div.container-header]:!bg-black [&>div.container-header]:!text-white"
            collapsedHeight={32}
            startCollapsed
          >
            <div className="container-header !py-5">
              <small className="px-2 py-1 text-xs mr-auto">
                [+/-] <span className="hidden xl:inline">expand/minimise</span>
              </small>{" "}
              <h5>{day}</h5>
            </div>
            {gamesForDay.map((g) => {
              const gameDateStr = formatDateStr(
                computeGameDate(
                  day as IGame["day"],
                  g.time,
                  "WET",
                ).toISOString(),
              );

              return (
                <Collapsible
                  key={g._id.toString()}
                  className="flex flex-col gap-y-2 pt-3 mb-30"
                  collapsedClassName="mb-8 -mt-4"
                  collapsedHeight={45}
                >
                  <div className="container-header !min-h-10">
                    <small className="px-2 py-1 text-xs mr-auto">[+/-]</small>
                    Game {g.game_id} - {gameDateStr}
                  </div>
                  {g.players
                    .slice(0, MAX_SIGNUPS_PER_GAME[g.type ?? GameType.STANDARD])
                    .flatMap((u) => {
                      const specificUser = usersById[u];
                      if (specificUser === undefined) return [];

                      const hasMissingPayment =
                        specificUser.missedPayments?.some(
                          (info) => info.date === gameDateStr,
                        ) ?? false;
                      const userPaid =
                        paymentsConfirmed[gameDateStr]?.includes(u) ?? false;

                      return (
                        <SigneeComponent
                          key={u}
                          className="justify-center min-h-[88px] [&>div]:flex-row [&>div>div>div:nth-child(2)]:text-left [&>div>div>div:nth-child(2)>div]:justify-start"
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
                                  (!hasMissingPayment && userPaid) || loading
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
                                    [gameDateStr]: prev[gameDateStr]?.filter(
                                      (id) => id !== u,
                                    ),
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
                  <small className="mt-2 mx-auto">- End game data -</small>
                </Collapsible>
              );
            })}
          </Collapsible>
        ))}
      </div>
    </Collapsible>
  );
}
