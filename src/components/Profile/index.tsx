import Link from "next/link";
import { useMemo } from "react";

import { Avatar } from "../Avatar";
import { PartnerProducts } from "../PartnerProducts";
import { Games } from "../Signup/Games";
import { Uploader } from "../Uploader";
import { Collapsible } from "../ui";

import { NAVLINKS_MAP } from "@/constants/links";
import { GameStatus } from "@/types";
import type { IGame, IUser } from "@/types/users";
import { groupGamesByDay } from "@/utils/data";
import { computeGameStatus, getLastGame } from "@/utils/games";

export interface IProfile {
  isConnected: boolean;
  user: IUser;
  avatarUrl: string;
  games: IGame[];
}

export function Profile({ avatarUrl, user, games }: IProfile) {
  const { gamesByDay, lastGame } = useMemo(() => {
    const gbd = groupGamesByDay(games);
    return { gamesByDay: gbd, lastGame: getLastGame(gbd) };
  }, [games]);

  return (
    <div className="flex flex-col gap-y-5 min-h-[60vh] justify-between">
      <div className="flex flex-col gap-y-3 text-black container">
        <div className="container-header !h-auto -mt-2 -mx-1.5">
          <h4 className="mr-auto px-2 py-1">My profile</h4> X
        </div>
        <div className="flex gap-x-4 items-start h-auto">
          <Avatar src={avatarUrl} />
          <div className="px-2 py-2">
            Hey {user.first_name}! Welcome to your profile page.
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-y-3 text-black container">
        <div className="container-header !h-auto -mt-2 -mx-1.5">
          <div className="mr-auto px-2 py-1">Add/update profile photo</div> X
        </div>
        <div className="px-2 py-2">
          <Uploader
            user={user}
            title="Upload a new profile photo. Max size 1mb!"
          />
        </div>
      </div>
      <div className="flex flex-col gap-y-3 text-black container">
        <div className="container-header !h-auto -mt-2 -mx-1.5">
          <div className="mr-auto px-2 py-1">Update user info</div> X
        </div>
        <div className="px-2 py-2">
          <Uploader
            user={user}
            title="Upload a new profile photo. Max size 1mb!"
          />
        </div>
      </div>
      <Collapsible
        collapsedHeight={33}
        className="flex flex-col gap-y-3 text-black container"
      >
        <div className="container-header !h-auto -mt-2 -mx-1.5">
          <div className="mr-auto px-2 py-1">My games </div>{" "}
          <div className="flex items-center mr-2">
            <span className="text-xs ml-auto mr-4 mt-0.5">
              [+] tap to open/close
            </span>
            <span className="font-bold text-xl ">-</span>
          </div>
        </div>
        <div className="px-2 py-2 flex flex-col gap-y-6">
          {games.length > 0 ? (
            Object.entries(gamesByDay).map(([day, dGames]) => {
              const { gameDate, gameStatus } = computeGameStatus(
                games,
                day as IGame["day"],
                lastGame,
              );
              return (
                <div className="flex flex-col gap-y-1" key={day}>
                  <h5 className="ml-1 font-bold">
                    {day} - {gameDate.toDateString()}{" "}
                  </h5>
                  {dGames.map((game) => (
                    <Games
                      key={game._id.toString()}
                      className={
                        gameStatus === GameStatus.PAST
                          ? "!bg-[var(--background-color-2)]"
                          : ""
                      }
                      {...game}
                      date={gameDate.toUTCString()}
                      waitlistAmt={null}
                      signupsAmt={
                        gameStatus === GameStatus.PAST
                          ? null
                          : game.players.length
                      }
                    />
                  ))}
                </div>
              );
            })
          ) : (
            <div className="flex flex-col gap-y-1">
              You haven't signed up to any games yet!
              <Link href={NAVLINKS_MAP.SIGNUP}>
                <button>Signup here</button>
              </Link>
            </div>
          )}
        </div>
      </Collapsible>
      <PartnerProducts className="mt-20" />
    </div>
  );
}
