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
import { useGames } from "@/context/Games/context";
import { useUser } from "@/context/User/context";
import { GameStatus } from "@/types";
import type { IAdmin } from "@/types/admin";
import type { IGame, IUser, IUserSafe } from "@/types/users";
import { groupGamesByDay } from "@/utils/data";
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

  const { games } = useGames();

  const { user: currentUser } = useUser();
  const userRef = useRef<IUserSafe | null>(currentUser);

  const { gamesByDay, userGames, lastGame } = useMemo(() => {
    const gbd = groupGamesByDay(userGamesServer);
    const ug = games.filter((game) =>
      game.players.some(
        (player) => player.toString() === profileUser._id.toString(),
      ),
    );
    return {
      gamesByDay: gbd,
      userGames: ug,
      lastGame: getLastGame(gbd, ug),
    };
  }, [games, profileUser._id, userGamesServer]);

  const isOwner = profileUser._id === currentUser._id;
  const numberFormatted = formatPhoneNumber(profileUser.phone_number);

  const avatarUrl = isOwner ? currentUser.avatarUrl : profileUser.avatarUrl;

  return (
    <div className="flex flex-col gap-y-5 min-h-[60vh] justify-between">
      <div className="flex flex-col gap-y-3 text-black container">
        <div className="container-header !h-auto -mt-2 -mx-1.5">
          <h4 className="mr-auto px-2 py-1">
            {isOwner ? "My profile" : `${profileUser.first_name}'s profile`}
          </h4>{" "}
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
                : profileUser.phone_number}
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
                      <div
                        className="flex flex-row gap-x-2"
                        key={game._id.toString()}
                      >
                        <Games
                          {...game}
                          date={gameDate.toUTCString()}
                          waitlistAmt={null}
                          signupsAmt={game.players.length}
                        />
                        {isOwner && (
                          <button
                            className="flex items-center justify-center h-full w-[50px] bg-[var(--background-error)]"
                            onClick={(e) => {
                              e.stopPropagation();
                              cancelGame(game._id, profileUser._id, "");
                            }}
                          >
                            X
                          </button>
                        )}
                      </div>
                    ))}
                  </div>,
                ];
              })
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
