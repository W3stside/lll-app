import Link from "next/link";
import { useMemo, useRef } from "react";

import { Avatar } from "../Avatar";
import { PartnerProducts } from "../PartnerProducts";
import { RegisterForm } from "../Register/RegisterForm";
import { Games } from "../Signup/Games";
import { Uploader } from "../Uploader";
import { PlaceholderAvatar } from "../Uploader/PlaceholderAvatar";
import { Collapsible, Loader } from "../ui";

import { NAVLINKS_MAP, WHATS_APP } from "@/constants/links";
import { useActions } from "@/context/Actions/context";
import { useUser } from "@/context/User/context";
import { GameStatus } from "@/types";
import type { IGame, IUser, IUserSafe } from "@/types/users";
import { groupGamesByDay } from "@/utils/data";
import { computeGameStatus, getLastGame } from "@/utils/games";
import { isValidUserUpdate } from "@/utils/signup";
import { formatPhoneNumber } from "@/utils/user";

export interface IProfile {
  isConnected: boolean;
  user: IUser;
  avatarUrl: string | null;
  userGames: IGame[];
}

function _dataIsEqual(currentUser: IUserSafe, newUser: IUserSafe) {
  return (
    currentUser.first_name === newUser.first_name &&
    currentUser.last_name === newUser.last_name &&
    currentUser.phone_number === newUser.phone_number
  );
}

export function Profile({ avatarUrl, user, userGames }: IProfile) {
  const { loading, error, updateUser } = useActions();
  const { user: currentUser } = useUser();
  const userRef = useRef<IUserSafe>(user);

  const { gamesByDay, lastGame } = useMemo(() => {
    const gbd = groupGamesByDay(userGames);
    return { gamesByDay: gbd, lastGame: getLastGame(gbd, userGames) };
  }, [userGames]);

  const isOwner = user._id === currentUser._id;
  const numberFormatted = formatPhoneNumber(user.phone_number);

  return (
    <div className="flex flex-col gap-y-5 min-h-[60vh] justify-between">
      <div className="flex flex-col gap-y-3 text-black container">
        <div className="container-header !h-auto -mt-2 -mx-1.5">
          <h4 className="mr-auto px-2 py-1">
            {isOwner ? "My profile" : `${user.first_name}'s profile`}
          </h4>{" "}
          X
        </div>
        <div className="flex gap-x-4 items-start h-auto">
          {avatarUrl !== null ? (
            <Avatar src={avatarUrl} pixelSize={4} />
          ) : (
            <PlaceholderAvatar />
          )}
          <div className="px-2 py-2">
            Hey {isOwner ? user.first_name : currentUser.first_name}! Welcome to{" "}
            {isOwner ? "your" : `${user.first_name}'s`} profile page.
            <br />
            <br />
            <strong>Whatsapp:</strong>{" "}
            <a
              href={`${WHATS_APP}/${numberFormatted}`}
              target="_blank"
              rel="noreferrer noopener"
            >
              {user.phone_number.startsWith("00")
                ? user.phone_number.slice(2)
                : user.phone_number}
            </a>
          </div>
        </div>
      </div>
      {isOwner && (
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
      {isOwner && (
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
                  handleAction={async (e) => {
                    e.preventDefault();
                    await updateUser(user);
                    userRef.current = currentUser;
                  }}
                />
                <button
                  disabled={
                    _dataIsEqual(userRef.current, currentUser) ||
                    !isValidUserUpdate(currentUser)
                  }
                  className="font-bold"
                  onClick={async (e) => {
                    e.preventDefault();
                    await updateUser(user);
                    userRef.current = currentUser;
                  }}
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
            {isOwner ? "My" : `${user.first_name}'s`} games{" "}
          </div>{" "}
          <div className="flex items-center mr-2">
            <span className="text-xs ml-auto mr-4 mt-0.5">
              [+] tap to open/close
            </span>
            <span className="font-bold text-xl ">-</span>
          </div>
        </div>
        <div className="px-2 py-2 flex flex-col gap-y-6">
          {userGames.length > 0 ? (
            Object.entries(gamesByDay).flatMap(([day, dGames]) => {
              const { gameDate, gameStatus } = computeGameStatus(
                userGames,
                day as IGame["day"],
                lastGame,
              );

              if (gameDate === undefined || gameStatus === GameStatus.PAST) {
                return [];
              }

              return [
                <div className="flex flex-col gap-y-1" key={day}>
                  <h5 className="ml-1 font-bold">
                    {day} - {gameDate.toDateString()}{" "}
                  </h5>
                  {dGames.map((game) => (
                    <Games
                      key={game._id.toString()}
                      {...game}
                      date={gameDate.toUTCString()}
                      waitlistAmt={null}
                      signupsAmt={game.players.length}
                    />
                  ))}
                </div>,
              ];
            })
          ) : (
            <div className="flex flex-col gap-y-1">
              {isOwner ? "You haven't" : `${user.first_name} hasn't`} signed up
              to any games yet!
              {isOwner && (
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
