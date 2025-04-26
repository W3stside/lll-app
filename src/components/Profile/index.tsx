import Link from "next/link";
import { useCallback, useMemo, useRef, useState } from "react";

import { Avatar } from "../Avatar";
import { PartnerProducts } from "../PartnerProducts";
import { RegisterForm } from "../Register/RegisterForm";
import { Games } from "../Signup/Games";
import { Uploader } from "../Uploader";
import { PlaceholderAvatar } from "../Uploader/PlaceholderAvatar";
import { Collapsible, Loader } from "../ui";

import { NAVLINKS_MAP } from "@/constants/links";
import { useUser } from "@/context/User/context";
import { GameStatus } from "@/types";
import type { IGame, IUser, IUserSafe } from "@/types/users";
import { groupGamesByDay } from "@/utils/data";
import { dbAuth } from "@/utils/dbAuth";
import { computeGameStatus, getLastGame } from "@/utils/games";
import { isValidUserUpdate } from "@/utils/signup";

export interface IProfile {
  isConnected: boolean;
  user: IUser;
  avatarUrl: string | null;
  games: IGame[];
}

function _dataIsEqual(currentUser: IUserSafe, newUser: IUserSafe) {
  return (
    currentUser.first_name === newUser.first_name &&
    currentUser.last_name === newUser.last_name &&
    currentUser.phone_number === newUser.phone_number
  );
}

export function Profile({ avatarUrl, user, games }: IProfile) {
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(false);

  const { user: currentUser } = useUser();
  const userRef = useRef<IUserSafe>(user);

  const { gamesByDay, lastGame } = useMemo(() => {
    const gbd = groupGamesByDay(games);
    return { gamesByDay: gbd, lastGame: getLastGame(gbd) };
  }, [games]);

  const handleUpdateUser = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      setLoading(true);
      try {
        if (!isValidUserUpdate(currentUser)) {
          throw new Error(
            "User update error: Fields invalid! Check and try again.",
          );
        }

        await dbAuth("update", currentUser);
      } catch (err) {
        const errChecked =
          err instanceof Error ? err : new Error("Unknown error");
        // eslint-disable-next-line no-console
        console.error(errChecked);
        setError(errChecked);
      } finally {
        setLoading(false);
        userRef.current = currentUser;
      }
    },
    [currentUser],
  );

  const isOwnner = user._id === currentUser._id;

  return (
    <div className="flex flex-col gap-y-5 min-h-[60vh] justify-between">
      <div className="flex flex-col gap-y-3 text-black container">
        <div className="container-header !h-auto -mt-2 -mx-1.5">
          <h4 className="mr-auto px-2 py-1">
            {isOwnner ? "My profile" : `${user.first_name}'s profile`}
          </h4>{" "}
          X
        </div>
        <div className="flex gap-x-4 items-start h-auto">
          {avatarUrl !== null ? (
            <Avatar src={avatarUrl} pixelSize={4} />
          ) : (
            <PlaceholderAvatar className="bg-[var(--background-color-2)]" />
          )}
          <div className="px-2 py-2">
            Hey {isOwnner ? user.first_name : currentUser.first_name}! Welcome
            to {isOwnner ? "your" : `${user.first_name}'s`} profile page.
          </div>
        </div>
      </div>
      {isOwnner && (
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
      )}
      {isOwnner && (
        <div className="flex flex-col gap-y-3 text-black container">
          <div className="container-header !h-auto -mt-2 -mx-1.5">
            <div className="mr-auto px-2 py-1">Update user info</div> X
          </div>
          <div className="flex flex-col items-center gap-y-2 px-2 py-2">
            {!loading ? (
              <>
                <RegisterForm
                  password={undefined}
                  setPassword={null}
                  handleAction={handleUpdateUser}
                />
                <button
                  disabled={
                    _dataIsEqual(userRef.current, currentUser) ||
                    !isValidUserUpdate(currentUser)
                  }
                  className="font-bold"
                  onClick={handleUpdateUser}
                >
                  Update user{" "}
                  {_dataIsEqual(userRef.current, currentUser) &&
                    " (no changes)"}
                </button>
                {error !== null && (
                  <span className="px-2 py-1 text-xs text-red-500">
                    {error.message}
                  </span>
                )}
              </>
            ) : (
              <Loader className="w-[200px]" />
            )}
          </div>
        </div>
      )}
      <Collapsible
        startCollapsed={false}
        collapsedHeight={33}
        className="flex flex-col gap-y-3 text-black container"
      >
        <div className="container-header !h-auto -mt-2 -mx-1.5">
          <div className="mr-auto px-2 py-1">
            {isOwnner ? "My" : `${user.first_name}'s`} games{" "}
          </div>{" "}
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
              {isOwnner ? "You haven't" : `${user.first_name} hasn't`} signed up
              to any games yet!
              {isOwnner && (
                <Link href={NAVLINKS_MAP.SIGNUP}>
                  <button>Signup here</button>
                </Link>
              )}
            </div>
          )}
        </div>
      </Collapsible>
      <PartnerProducts className="mt-20" />
    </div>
  );
}
