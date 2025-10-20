import Link from "next/link";
import { useRouter } from "next/router";
import { useMemo, useRef } from "react";

import { Avatar } from "../Avatar";
import { PartnerProducts } from "../PartnerProducts";
import { RegisterForm } from "../Register/RegisterForm";
import { Games } from "../Signup/Games";
import { Uploader } from "../Uploader";
import { PlaceholderAvatar } from "../Uploader/PlaceholderAvatar";
import { Collapsible, Loader } from "../ui";

import { NAVLINKS_MAP, WHATS_APP } from "@/constants/links";
import { MAX_SIGNUPS_PER_GAME } from "@/constants/signups";
import { useActions } from "@/context/Actions/context";
import { useUser } from "@/context/User/context";
import {
  GameStatus,
  GameType,
  Role,
  type IAdmin,
  type IGame,
  type IUser,
  type IUserSafe,
} from "@/types";
import { checkPlayerCanCancel, groupGamesByDay } from "@/utils/data";
import { computeGameDate } from "@/utils/date";
import { computeGameStatus, getLastGame } from "@/utils/games";
import { isValidUserUpdate } from "@/utils/signup";
import { formatPhoneNumber } from "@/utils/user";

export interface IProfile {
  admin: IAdmin;
  isConnected: boolean;
  user: IUser;
  profileUser: IUser;
  avatarUrl: string | null;
  userGames: IGame[];
}

function _dataIsEqual(
  currentUser: IUserSafe | null,
  newUser: IUserSafe | null,
) {
  return (
    currentUser !== null &&
    newUser !== null &&
    currentUser.first_name === newUser.first_name &&
    currentUser.last_name === newUser.last_name &&
    currentUser.phone_number === newUser.phone_number
  );
}

export function Profile({
  admin,
  profileUser,
  userGames: userGamesServer,
}: IProfile) {
  const { loading, error, cancelGame, updateUser } = useActions();

  const { user: currentUser } = useUser();
  const userRef = useRef<IUserSafe | null>(currentUser);

  const isOwner = profileUser._id === currentUser._id;

  const router = useRouter();

  const userGames = useMemo(() => {
    const gbd = groupGamesByDay(userGamesServer);

    return Object.entries(gbd).flatMap(([day, dGames]) => {
      if (dGames.length === 0) return [];

      const lGame = getLastGame(gbd, dGames);
      if (lGame === undefined) return [];

      return [
        <div className="flex flex-col gap-y-1" key={day}>
          <h5 className="ml-1 font-bold">
            {day} -{" "}
            {computeGameDate(day as IGame["day"], lGame.time).toDateString()}
          </h5>
          {dGames.flatMap((game) => {
            if (game.status === GameStatus.PAST) return [];

            const { gameStatus } = computeGameStatus(game, game.day, lGame);
            const canCancel = checkPlayerCanCancel(
              profileUser,
              currentUser,
              gameStatus,
            );
            return (
              <div className="flex flex-row gap-x-2" key={game._id.toString()}>
                <Games
                  {...game}
                  className="flex-1 w-[85%] overflow-x-hidden"
                  date={game.date}
                  waitlistLabel={`${isOwner ? "You're" : `${profileUser.first_name} is`} on the waitlist`}
                  waitlistAmt={
                    game.players.findIndex(
                      (pl) => pl.toString() === profileUser._id.toString(),
                    ) < MAX_SIGNUPS_PER_GAME[game.type ?? GameType.STANDARD]
                      ? null
                      : 0
                  }
                  signupsAmt={game.players.length}
                />
                {canCancel && (
                  <button
                    className="flex items-center justify-center w-[50px] bg-[var(--background-error)]"
                    onClick={(e) => {
                      e.stopPropagation();
                      cancelGame(game._id, profileUser._id, "", {
                        callback: router.reload,
                      });
                    }}
                  >
                    X
                  </button>
                )}
              </div>
            );
          })}
        </div>,
      ];
    });
  }, [
    cancelGame,
    currentUser,
    isOwner,
    profileUser,
    router.reload,
    userGamesServer,
  ]);

  const numberFormatted = formatPhoneNumber(profileUser.phone_number);
  const avatarUrl =
    (isOwner ? currentUser.avatarUrl : profileUser.avatarUrl) ?? undefined;

  return (
    <div className="flex flex-col gap-y-5 w-full min-h-[60vh] justify-between items-center">
      <div className="flex flex-col gap-y-3 text-black container">
        <div className="container-header !h-auto -mt-2 -mx-1.5">
          <h4 className="mr-auto px-2 py-1">
            {isOwner ? "My profile" : `${profileUser.first_name}'s profile`}
          </h4>{" "}
          {profileUser.role === Role.ADMIN && (
            <div className="bg-[var(--background-color)] font-bold mx-2 !flex items-center px-1.5 text-[ghostwhite]">
              Admin
            </div>
          )}{" "}
          X
        </div>
        <div className="flex gap-x-4 items-start h-auto">
          {avatarUrl !== undefined ? (
            <Avatar
              src={avatarUrl}
              pixelSize={1}
              className="w-[80px] h-[80px]"
            />
          ) : (
            <PlaceholderAvatar />
          )}
          <div className="px-2 py-2">
            Hey {isOwner ? profileUser.first_name : currentUser.first_name}!
            Welcome to {isOwner ? "your" : `${profileUser.first_name}'s`}{" "}
            profile page.
            <br />
            <br />
            <strong>Whatsapp:</strong>{" "}
            <a
              href={`${WHATS_APP}/${numberFormatted}`}
              target="_blank"
              rel="noreferrer noopener"
            >
              {profileUser.phone_number.startsWith("00")
                ? profileUser.phone_number.slice(2)
                : profileUser.phone_number.slice(0, 6)}
              ***{profileUser.phone_number.slice(-3)}
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
              user={currentUser}
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
                  loading={loading}
                  label={
                    <>
                      Update user{" "}
                      {_dataIsEqual(userRef.current, currentUser) &&
                        " (no changes)"}
                    </>
                  }
                  password={undefined}
                  setPassword={null}
                  disabled={
                    _dataIsEqual(userRef.current, currentUser) ||
                    !isValidUserUpdate(currentUser)
                  }
                  handleAction={async (e) => {
                    e.preventDefault();
                    await updateUser(currentUser);
                    userRef.current = currentUser;
                  }}
                />
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
      {admin.signup_open && (
        <Collapsible
          startCollapsed={false}
          collapsedHeight={33}
          className="flex flex-col gap-y-3 text-black container"
        >
          <div className="container-header !h-auto -mt-2 -mx-1.5">
            <div className="mr-auto px-2 py-1">
              {isOwner ? "My" : `${profileUser.first_name}'s`} games{" "}
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
              userGames
            ) : (
              <div className="flex flex-col items-center gap-y-8">
                {isOwner ? "You haven't" : `${profileUser.first_name} hasn't`}{" "}
                signed up to any games yet!
                {isOwner && (
                  <Link href={NAVLINKS_MAP.SIGNUP}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                    >
                      Signup here
                    </button>
                  </Link>
                )}
              </div>
            )}
          </div>
        </Collapsible>
      )}
      <PartnerProducts className="mt-20" />
    </div>
  );
}
