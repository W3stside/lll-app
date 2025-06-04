import { ObjectId } from "mongodb";
import type { GetServerSideProps } from "next";
import { useCallback, useEffect, useMemo, useState } from "react";

import { PartnerProducts } from "@/components/PartnerProducts";
import { Collapsible, Loader } from "@/components/ui";
import { RED_TW } from "@/constants/colours";
import { DAYS_IN_WEEK } from "@/constants/date";
import { NAVLINKS_MAP } from "@/constants/links";
import { useAdmin } from "@/context/Admin/context";
import { DialogVariant, useDialog } from "@/context/Dialog/context";
import { useGames } from "@/context/Games/context";
import { withServerSideProps } from "@/hoc/withServerSideProps";
import client from "@/lib/mongodb";
import { Collection, Role } from "@/types";
import type { IAdmin } from "@/types/admin";
import { Gender, type IGame, type IUser, type PlaySpeed } from "@/types/users";
import { dbRequest } from "@/utils/api/dbRequest";
import { fetchUsersFromMongodb } from "@/utils/api/mongodb";
import { isValid24hTime } from "@/utils/date";
import { sortDaysOfWeek } from "@/utils/sort";
import { cn } from "@/utils/tailwind";

const ADDRESS_MAX_LENGTH = 35;
const GOOGLE_MAPS_REGEX = /^(https?:\/\/)?(www\.)?google\.com\/maps/;
const ERRORS_MAP = {
  time: "Invalid! Must be 24h format (e.g 19:00)",
  location: "Invalid! Must be at least 5 characters",
  address: "Invalid! Must be at least 5 characters",
  mapUrl: "Invalid! Must be a Google Maps URL",
};

type ConnectionStatus = {
  isConnected: boolean;
};

export const getServerSideProps: GetServerSideProps<ConnectionStatus> =
  // TODO: review
  // @ts-expect-error error in the custom HOC - doesn't break.
  withServerSideProps(async ({ parentProps: { user, usersById } }) => {
    try {
      const adminUser = await client
        .db("LLL")
        .collection<IUser>(Collection.USERS)
        .findOne({
          _id: new ObjectId(user._id),
          role: Role.ADMIN,
        });

      if (adminUser === null) {
        return {
          redirect: {
            destination: NAVLINKS_MAP.HOME,
            permanent: false,
          },
        };
      }

      const usersSerialised = await fetchUsersFromMongodb(client, true);

      return {
        props: {
          isConnected: true,
          user: JSON.parse(JSON.stringify(user)) as string,
          users: usersSerialised,
          usersById: JSON.parse(JSON.stringify(usersById)) as string,
        },
      };
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
      return {
        props: {
          user: null,
          users: [],
          usersById: {},
        },
      };
    }
  });

interface IAdminError {
  errors:
    | {
        [key in keyof ErrorUser]: string;
      }
    | null;
  errorKey: keyof ErrorUser;
}

function AdminError({ errors, errorKey }: IAdminError) {
  return (
    errors !== null &&
    errors[errorKey] !== undefined && (
      <span className={`px-2 py-1 text-xs ${RED_TW}`}>{errors[errorKey]}</span>
    )
  );
}

interface IAdminPage {
  isConnected: boolean;
  user: IUser;
  games: IGame[];
  admin: IAdmin | null;
}

type ErrorUser = Omit<Partial<IGame>, "_id" | "game_id" | "players">;

const DEFAULT_STATE = {
  _id: undefined,
  time: "",
  location: "",
  address: "",
  mapUrl: "",
  gender: undefined,
  speed: undefined,
  day: undefined,
  cancelled: false,
} as const;

export default function Admin({
  isConnected,
  admin: adminInitial,
  user,
}: IAdminPage) {
  const [loading, setLoading] = useState(false);
  const [generalError, setGeneralError] = useState<Error | null>(null);
  const [addGameError, setAddGameError] = useState<
    | {
        [key in keyof ErrorUser]: string;
      }
    | null
  >(null);

  const { games, setGames } = useGames();
  const { admin, setAdmin } = useAdmin();
  const { openDialog } = useDialog();

  // Sync server-side games with client-side games
  useEffect(() => {
    if (adminInitial !== null && admin === undefined) {
      setAdmin(adminInitial);
    }
  }, [admin, adminInitial, setAdmin]);

  const [targettedGame, setGameInfo] = useState<
    Partial<IGame> & { cancelled: boolean }
  >(DEFAULT_STATE);

  const handleUpdateGame = useCallback(async () => {
    setLoading(true);
    setGeneralError(null);
    try {
      const isValidTime = isValid24hTime(targettedGame.time ?? "");
      const isValidLocation = (targettedGame.location?.length ?? 0) > 5;
      const isValidAddress = (targettedGame.location?.length ?? 0) > 5;
      const isValidUrl = GOOGLE_MAPS_REGEX.test(targettedGame.mapUrl ?? "");
      if (!isValidTime || !isValidUrl || !isValidLocation || !isValidAddress) {
        setAddGameError((prev) => ({
          ...prev,
          time: isValidTime ? undefined : ERRORS_MAP.time,
          location: isValidLocation ? undefined : ERRORS_MAP.location,
          address: isValidAddress ? undefined : ERRORS_MAP.address,
          mapUrl: isValidUrl ? undefined : ERRORS_MAP.mapUrl,
        }));
        throw new Error("Invalid game form. Please check the inputs.");
      }

      if (
        games.some(
          (game) =>
            game.day === targettedGame.day &&
            game.time === targettedGame.time &&
            game.location === targettedGame.location &&
            game.address === targettedGame.address &&
            game.gender === targettedGame.gender &&
            game.speed === targettedGame.speed &&
            game.cancelled === targettedGame.cancelled,
        )
      ) {
        throw new Error(
          "Game already exists for this day with the same configuration",
        );
      }

      setAddGameError(null);

      const { _id, ...gameNoId } = targettedGame;

      let response;
      // Create new game
      if (_id === undefined) {
        response = await dbRequest<
          Omit<IGame, "_id">,
          {
            updatedGame: IGame;
            games: IGame[];
          }
        >("create", Collection.GAMES, {
          ...gameNoId,
          players: [],
        });
      }
      // Update existing game
      else {
        response = await dbRequest<
          IGame,
          {
            updatedGame: IGame;
            games: IGame[];
          }
        >("update", Collection.GAMES, {
          _id,
          ...gameNoId,
        });
      }

      const {
        data: { games: updatedGames },
        error,
      } = response;

      if (error !== null) {
        setGeneralError(error);
        throw error;
      }

      setGames(updatedGames);
      setGameInfo(DEFAULT_STATE);
      setAddGameError(null);
      setGeneralError(null);
    } catch (error: unknown) {
      const e = error instanceof Error ? error : new Error("Unknown error");
      setGeneralError(e);
    } finally {
      setLoading(false);
    }
  }, [targettedGame, games, setGames]);

  const handleChange = useCallback(
    (key: keyof ErrorUser, value: IGame[keyof ErrorUser]) => {
      if (addGameError?.[key] !== undefined) {
        setAddGameError((prev) => ({
          ...prev,
          [key]: undefined,
        }));
      }

      setGameInfo((prev) => ({
        ...prev,
        [key]: value,
      }));
    },
    [addGameError],
  );

  const handleRefreshGames = useCallback(
    async (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      try {
        const res = await dbRequest<IGame[]>("get", Collection.GAMES);
        if (res.error !== null) {
          setGeneralError(res.error);
          throw res.error;
        }
        setGames(res.data);
      } catch (error) {
        const err = error instanceof Error ? error : new Error("Unknown error");
        setGeneralError(err);
      }
    },
    [setGames],
  );

  const handleToggleSignupsAvailable = useCallback(async () => {
    if (admin === undefined) return;
    try {
      setLoading(true);
      setGeneralError(null);

      const { data, error } = await dbRequest<IAdmin>(
        "update",
        Collection.ADMIN,
        {
          _id: admin._id,
          signup_open: !admin.signup_open,
        },
      );

      if (error !== null) {
        setGeneralError(error);
        throw error;
      }

      setAdmin(data);
    } catch (error) {
      const e =
        error instanceof Error
          ? error
          : new Error("handleToggleSignupsAvailable: Unknown error");
      setGeneralError(e);
    } finally {
      setLoading(false);
    }
  }, [admin, setAdmin]);

  const handleClearAllSignups = useCallback(async () => {
    if (admin === undefined) return;
    try {
      setLoading(true);
      setGeneralError(null);

      const { data, error } = await dbRequest<IGame[]>(
        "reset",
        Collection.GAMES,
      );

      if (error !== null) {
        setGeneralError(error);
        throw error;
      }

      setGames(data);
    } catch (error) {
      const e =
        error instanceof Error
          ? error
          : new Error("handleToggleSignupsAvailable: Unknown error");
      setGeneralError(e);
    } finally {
      setLoading(false);
    }
  }, [admin, setGames]);

  const sortedGames = useMemo(() => sortDaysOfWeek(games), [games]);

  if (!isConnected) return <h1>Connecting to db...</h1>;

  return (
    <>
      <div className="flex flex-col gap-y-3 text-black container">
        <div className="container-header !h-auto -mt-2 -mx-1.5">
          <h4 className="mr-auto px-2 py-1">LLL Admin</h4> X
        </div>
        <div className="px-2 py-2">
          Hey {user.first_name}! <br />
          <br />
          Below there are different sections where you can execute different
          actions to configure the LLL app.
          <br />
          <br />
          More coming soon!
        </div>

        {admin !== undefined && (
          <div className="flex flex-col gap-y-1 text-black container">
            <div className="container-header !h-auto -mt-2 -mx-1.5 py-2 !text-xl md:!text-2xl">
              Game and signups management
            </div>
            <div className="flex flex-col justify-start p-2">
              <div className="flex flex-wrap gap-2 items-center justify-between py-1">
                <div className="my-2 flex gap-x-4">
                  <strong>Signups enabled?</strong>{" "}
                  <div
                    className={cn("font-bold", {
                      "text-red-700": !admin.signup_open,
                      "text-green-700": admin.signup_open,
                    })}
                  >
                    {admin.signup_open ? "ENABLED" : "DISABLED"}
                  </div>
                </div>
                <button
                  onClick={handleToggleSignupsAvailable}
                  className="!max-w-none w-[90px] justify-center"
                  disabled={loading}
                >
                  {admin.signup_open ? "Disable" : "Enable"}
                </button>
              </div>
              <div className="flex flex-wrap gap-2 items-center justify-between py-1">
                <div className="my-2 flex gap-x-4">
                  <strong>Clear all game signups:</strong>{" "}
                </div>
                <button
                  onClick={() => {
                    openDialog({
                      variant: DialogVariant.CONFIRM,
                      title: "Careful!",
                      content: (
                        <div>
                          Are you sure you want to remove all players from
                          signups? This action cannot be undone. <br />
                          <br />
                          You should really only be doing this on Sunday night
                          after the last game has been played and when preparing
                          next week's games.
                        </div>
                      ),
                      action: async () => {
                        await handleClearAllSignups();
                        openDialog();
                      },
                    });
                  }}
                  className={`!max-w-none w-max ${RED_TW}`}
                  disabled={loading}
                >
                  Clear all
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-y-1 text-black container">
          <div className="container-header !h-auto -mt-2 -mx-1.5 py-2 !text-xl md:!text-2xl">
            Manage games
          </div>
          <Collapsible
            className="container my-2 flex flex-col gap-y-2 justify-start"
            collapsedHeight={32}
            startCollapsed={false}
          >
            <div className="container-header !h-auto -mt-2 -mx-1.5 !items-center">
              <small className="px-2 py-1 text-xs mr-2">
                tap to open/close
              </small>
              Current games
            </div>
            <div className="flex flex-col gap-y-6 sm:gap-y-2 text-xs pt-3 px-3">
              {sortedGames.map((game) => (
                <div
                  key={game._id.toString()}
                  className={cn(
                    "flex flex-row gap-x-5 justify-between items-center",
                    {
                      "bg-[var(--background-window-highlight)]": game.hidden,
                    },
                  )}
                >
                  <div className="flex flex-1 justify-start gap-x-4">
                    <div className="flex flex-col w-auto whitespace-nowrap">
                      <strong>
                        {game.day} @ {game.time}{" "}
                        {game.hidden === true && "(Hidden from users)"}
                      </strong>{" "}
                      {game.location}
                    </div>
                    <a
                      href={game.mapUrl}
                      target="_blank"
                      className="min-w-[100px] self-end text-right flex-1"
                    >
                      {game.address.slice(0, ADDRESS_MAX_LENGTH)}...
                    </a>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setGameInfo((prev) => ({ ...prev, ...game }));
                    }}
                  >
                    edit
                  </button>
                </div>
              ))}
              <button
                onClick={handleRefreshGames}
                className="text-xs mt-2 inline !w-max self-end bg-[var(--background-color-2)]"
              >
                Refresh games list
              </button>
            </div>
          </Collapsible>
          {!loading ? (
            <div className="container my-2 flex flex-col gap-y-2 justify-start">
              <div className="container-header !h-auto -mt-2 -mx-1.5 !items-center">
                Edit game
              </div>
              <div className="flex flex-col">
                <select
                  value={targettedGame.day}
                  name="day-of-the-week"
                  defaultValue={""}
                  onChange={(e) => {
                    setGameInfo((prev) => ({
                      ...prev,
                      day: e.target.value as IGame["day"],
                    }));
                  }}
                >
                  <option value="">- Please select a day -</option>
                  {DAYS_IN_WEEK.map((day) => (
                    <option key={day} value={day}>
                      {day}
                    </option>
                  ))}
                </select>
                <input
                  value={targettedGame.time}
                  onChange={(e) => {
                    handleChange("time", e.target.value);
                  }}
                  placeholder="Time 24h format (e.g 19:00)"
                />
                <AdminError errors={addGameError} errorKey="time" />
                <input
                  value={targettedGame.location}
                  onChange={(e) => {
                    handleChange("location", e.target.value);
                  }}
                  placeholder="Location name (e.g Playarena Olais)"
                />
                <AdminError errors={addGameError} errorKey="location" />
                <input
                  value={targettedGame.address}
                  onChange={(e) => {
                    handleChange("address", e.target.value);
                  }}
                  placeholder="Address"
                />
                <AdminError errors={addGameError} errorKey="address" />
                <input
                  value={targettedGame.mapUrl}
                  onChange={(e) => {
                    handleChange("mapUrl", e.target.value);
                  }}
                  placeholder="Google Maps URL"
                />
                <AdminError errors={addGameError} errorKey="mapUrl" />
                <select
                  value={targettedGame.speed}
                  name="game-speed"
                  defaultValue={""}
                  onChange={(e) => {
                    setGameInfo((prev) => ({
                      ...prev,
                      speed: e.target.value as PlaySpeed,
                    }));
                  }}
                >
                  <option value="">- Please select a game speed -</option>
                  <option value="faster">Faster</option>
                  <option value="mixed">Mixed</option>
                  <option value="slower">Slower</option>
                </select>
                <select
                  value={targettedGame.gender}
                  name="gender"
                  defaultValue={""}
                  onChange={(e) => {
                    setGameInfo((prev) => ({
                      ...prev,
                      gender: e.target.value as Gender,
                    }));
                  }}
                >
                  <option value="">- (optional) Ladies game? -</option>
                  <option value={Gender.FEMALE}>Ladies</option>
                </select>
                <select
                  value={targettedGame.cancelled ? "cancelled" : "confirmed"}
                  name="status"
                  defaultValue={""}
                  onChange={(e) => {
                    setGameInfo((prev) => ({
                      ...prev,
                      cancelled: e.target.value === "cancelled",
                    }));
                  }}
                >
                  <option value="">Confirmed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>
          ) : (
            <Loader className="w-full h-[300px]" />
          )}

          <div className="flex gap-x-2 items-center justify-between h-full mt-2">
            <button
              onClick={() => {
                openDialog({
                  variant: DialogVariant.CONFIRM,
                  title: "Careful!",
                  content: (
                    <div>
                      Are you sure you want to update this game? Check that all
                      the fields are correct. <br />
                      <br />
                      Data has passed validation but click "Refresh games list"
                      above after confirming to make sure everything looks
                      alright.
                    </div>
                  ),
                  action: async () => {
                    await handleUpdateGame();
                    openDialog();
                  },
                });
              }}
              className="flex justify-center w-full"
              disabled={
                loading ||
                targettedGame.day === undefined ||
                targettedGame.time === "" ||
                targettedGame.location === "" ||
                targettedGame.address === "" ||
                targettedGame.mapUrl === "" ||
                targettedGame.speed === undefined
              }
            >
              <strong>
                {targettedGame._id === undefined ? "Add new" : "Update"} game
              </strong>
            </button>
            <button
              className="bg-[var(--background-color-2)]"
              onClick={() => {
                setGameInfo(DEFAULT_STATE);
                setAddGameError(null);
                setGeneralError(null);
              }}
            >
              reset
            </button>
          </div>
          {generalError !== null && (
            <span className="px-2 py-1 text-xs text-red-500">
              {generalError.message}
            </span>
          )}
        </div>
      </div>
      <PartnerProducts />
    </>
  );
}
