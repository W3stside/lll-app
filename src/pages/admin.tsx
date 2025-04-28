import { ObjectId } from "mongodb";
import type { GetServerSideProps } from "next";
import { useCallback, useEffect, useMemo, useState } from "react";

import { PartnerProducts } from "@/components/PartnerProducts";
import { Loader } from "@/components/ui";
import { RED_TW } from "@/constants/colours";
import { DAYS_IN_WEEK } from "@/constants/date";
import { NAVLINKS_MAP } from "@/constants/links";
import { useAdmin } from "@/context/Admin/context";
import { DialogVariant, useDialog } from "@/context/Dialog/context";
import { useGames } from "@/context/Games/context";
import { JWT_REFRESH_SECRET, JWT_SECRET, verifyToken } from "@/lib/authUtils";
import client from "@/lib/mongodb";
import { Collection, Role } from "@/types";
import type { IAdmin } from "@/types/admin";
import {
  Gender,
  type IUserFromCookies,
  type IGame,
  type IUser,
  type PlaySpeed,
} from "@/types/users";
import { dbRequest } from "@/utils/api/dbRequest";
import { fetchRequiredCollectionsFromMongoDb } from "@/utils/api/mongodb";
import { isValid24hTime } from "@/utils/date";
import { sortDaysOfWeek } from "@/utils/sort";
import { cn } from "@/utils/tailwind";

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

export const getServerSideProps: GetServerSideProps<ConnectionStatus> = async (
  context,
) => {
  try {
    const { req } = context;
    const { token } = req.cookies;
    const user =
      token !== undefined
        ? verifyToken<IUserFromCookies>(
            token,
            JWT_SECRET as string,
            JWT_REFRESH_SECRET,
          )
        : null;

    if (user === null) {
      return {
        redirect: {
          destination: NAVLINKS_MAP.LOGIN,
          permanent: false,
        },
      };
    }

    await client.connect();
    const db = client.db("LLL");

    const adminUser = await db.collection<IUser>(Collection.USERS).findOne({
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

    const [games, users] = await fetchRequiredCollectionsFromMongoDb(client, {
      serialised: true,
    })();

    const [admin] = await db
      .collection<IAdmin>(Collection.ADMIN)
      .find({})
      .toArray();

    return {
      props: {
        isConnected: true,
        admin: JSON.parse(JSON.stringify(admin)) as IAdmin,
        user: JSON.parse(JSON.stringify(adminUser)) as string,
        users,
        games,
      },
    };
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(e);
    return {
      props: {
        isConnected: false,
        admin: null,
        user: null,
        users: [],
        games: [],
      },
    };
  }
};

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

  const [newGame, setNewGame] = useState<Partial<Omit<IGame, "_id">>>({
    time: "",
    location: "",
    address: "",
    mapUrl: "",
    gender: undefined,
    speed: undefined,
    day: undefined,
  });

  const handleAddNewGame = useCallback(async () => {
    setLoading(true);
    setGeneralError(null);
    try {
      const isValidTime = isValid24hTime(newGame.time ?? "");
      const isValidLocation = (newGame.location?.length ?? 0) > 5;
      const isValidAddress = (newGame.location?.length ?? 0) > 5;
      const isValidUrl = GOOGLE_MAPS_REGEX.test(newGame.mapUrl ?? "");
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
            game.day === newGame.day &&
            game.time === newGame.time &&
            game.location === newGame.location &&
            game.address === newGame.address,
        )
      ) {
        throw new Error("Game already exists for this day");
      }

      setAddGameError(null);

      const res = await dbRequest<IGame>("create", Collection.GAMES, {
        ...newGame,
        players: [],
      });
      if (res.error !== null) {
        setGeneralError(res.error);
        throw res.error;
      }
    } catch (error: unknown) {
      const e = error instanceof Error ? error : new Error("Unknown error");
      setGeneralError(e);
    } finally {
      setLoading(false);
    }
  }, [games, newGame]);

  const handleChange = useCallback(
    (key: keyof ErrorUser, value: IGame[keyof ErrorUser]) => {
      if (addGameError?.[key] !== undefined) {
        setAddGameError((prev) => ({
          ...prev,
          [key]: undefined,
        }));
      }

      setNewGame((prev) => ({
        ...prev,
        [key]: value,
      }));
    },
    [addGameError],
  );

  const handleRefreshGames = useCallback(async () => {
    try {
      const res = await dbRequest<IGame[]>("get", Collection.GAMES);
      if (res.error !== null) {
        setGeneralError(res.error);
        throw res.error;
      }
      setGames(res.data);
    } catch (error) {
      const e = error instanceof Error ? error : new Error("Unknown error");
      setGeneralError(e);
    }
  }, [setGames]);

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
            <div className="container-header !h-auto -mt-2 -mx-1.5">
              Game and signups management
            </div>
            <div className="flex flex-col justify-start p-2">
              <div className="flex flex-wrap gap-2 items-center justify-between py-1">
                <div className="my-2 flex gap-x-4">
                  <strong>Game signups status:</strong>{" "}
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
                  className="!max-w-none w-max"
                  disabled={loading}
                >
                  {admin.signup_open ? "Disable signups" : "Enable signups"}
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
                        try {
                          await handleClearAllSignups();
                        } catch (error) {
                          // eslint-disable-next-line no-console
                          console.error(error);
                        } finally {
                          openDialog();
                        }
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
          <div className="container-header !h-auto -mt-2 -mx-1.5">
            Add new game
          </div>
          <div className="my-2 flex flex-col gap-y-2">
            <strong>Current games</strong>
            <div className="flex flex-col gap-y-2 text-xs">
              {sortedGames.map((game, idx) => (
                <div
                  key={game._id.toString()}
                  className="flex flex-row flex-wrap gap-x-3"
                >
                  <span>
                    {idx + 1}.{" "}
                    <strong>
                      {game.day} - {game.time}
                    </strong>{" "}
                    - {game.location}
                  </span>
                  <a href={game.mapUrl} target="_blank">
                    {game.address.slice(0, 30)}...
                  </a>
                </div>
              ))}
              <button
                onClick={handleRefreshGames}
                className="text-xs mt-2 inline !w-max"
              >
                Refresh games list
              </button>
            </div>
          </div>
          {!loading ? (
            <>
              <select
                value={newGame.day}
                name="day-of-the-week"
                defaultValue={""}
                onChange={(e) => {
                  setNewGame((prev) => ({
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
                value={newGame.time}
                onChange={(e) => {
                  handleChange("time", e.target.value);
                }}
                placeholder="Time 24h format (e.g 19:00)"
              />
              <AdminError errors={addGameError} errorKey="time" />
              <input
                value={newGame.location}
                onChange={(e) => {
                  handleChange("location", e.target.value);
                }}
                placeholder="Location name (e.g Playarena Olais)"
              />
              <AdminError errors={addGameError} errorKey="location" />
              <input
                value={newGame.address}
                onChange={(e) => {
                  handleChange("address", e.target.value);
                }}
                placeholder="Address"
              />
              <AdminError errors={addGameError} errorKey="address" />
              <input
                value={newGame.mapUrl}
                onChange={(e) => {
                  handleChange("mapUrl", e.target.value);
                }}
                placeholder="Google Maps URL"
              />
              <AdminError errors={addGameError} errorKey="mapUrl" />
              <select
                value={newGame.speed}
                name="game-speed"
                defaultValue={""}
                onChange={(e) => {
                  setNewGame((prev) => ({
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
                value={newGame.gender}
                name="gender"
                defaultValue={""}
                onChange={(e) => {
                  setNewGame((prev) => ({
                    ...prev,
                    gender: e.target.value as Gender,
                  }));
                }}
              >
                <option value="">- (optional) Ladies game? -</option>
                <option value={Gender.FEMALE}>Ladies</option>
              </select>
            </>
          ) : (
            <Loader className="w-full h-[300px]" />
          )}

          <button
            onClick={handleAddNewGame}
            className="mt-2 flex justify-center"
            disabled={
              loading ||
              newGame.day === undefined ||
              newGame.time === "" ||
              newGame.location === "" ||
              newGame.address === "" ||
              newGame.mapUrl === "" ||
              newGame.speed === undefined
            }
          >
            <strong>Add new game</strong>
          </button>
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
