import { ObjectId } from "mongodb";
import type { GetServerSideProps } from "next";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";

import errorIcon from "@/assets/error.png";
import { PartnerProducts } from "@/components/PartnerProducts";
import { SigneeComponent } from "@/components/Signup/SIgnees/SigneeComponent";
import { Collapsible, Loader } from "@/components/ui";
import { RED_TW } from "@/constants/colours";
import { DAYS_IN_WEEK } from "@/constants/date";
import { NAVLINKS_MAP } from "@/constants/links";
import { MAX_SIGNUPS_PER_GAME } from "@/constants/signups";
import { useAdmin } from "@/context/Admin/context";
import { DialogVariant, useDialog } from "@/context/Dialog/context";
import { useGames } from "@/context/Games/context";
import { useUser } from "@/context/User/context";
import { withServerSideProps } from "@/hoc/withServerSideProps";
import client from "@/lib/mongodb";
import {
  Collection,
  GameType,
  Gender,
  Role,
  type IAdmin,
  type IGame,
  type IUser,
  type PlaySpeed,
} from "@/types";
import { dbRequest } from "@/utils/api/dbRequest";
import { fetchUsersFromMongodb } from "@/utils/api/mongodb";
import { computeGameDate, formatDateStr, isValid24hTime } from "@/utils/date";
import { sharePaymentsMissingList } from "@/utils/games";
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
const EMPTY_TEAMS = [
  { players: [] },
  { players: [] },
  { players: [] },
  { players: [] },
] as const satisfies IGame["teams"];
const LOCAL_STORAGE_PAYMENTS_KEY = "LLL-payments-confirmed";

function _getPaymentConfirmation() {
  if (typeof window !== "undefined") {
    return JSON.parse(
      localStorage.getItem(LOCAL_STORAGE_PAYMENTS_KEY) ?? "{}",
    ) as Record<string, string[]>;
  }

  return {};
}

function _setPaymentConfirmation(data: Partial<Record<string, string[]>>) {
  if (typeof window !== "undefined") {
    localStorage.setItem(LOCAL_STORAGE_PAYMENTS_KEY, JSON.stringify(data));
  }
}

type ConnectionStatus = {
  isConnected: boolean;
};

export const getServerSideProps: GetServerSideProps<ConnectionStatus> =
  // TODO: review
  // @ts-expect-error error in the custom HOC - doesn't break.
  withServerSideProps(async ({ parentProps: { games, user, usersById } }) => {
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
          games,
          user: JSON.parse(JSON.stringify(user)) as string,
          users: usersSerialised,
          usersById: JSON.parse(JSON.stringify(usersById)) as string,
        },
      };
    } catch (e) {
      return {
        props: {
          games: [],
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
  users: IUser[];
  usersById: Record<string, IUser>;
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
  type: GameType.STANDARD,
} as const;

export default function Admin({
  isConnected,
  admin: adminInitial,
  user,
  users: usersInitial,
  games: gamesInitial,
}: IAdminPage) {
  const [loading, setLoading] = useState(false);
  const [generalError, setGeneralError] = useState<Error | null>(null);
  const [addGameError, setAddGameError] = useState<
    | {
        [key in keyof ErrorUser]: string;
      }
    | null
  >(null);

  const { games, gamesByDay, setGames } = useGames();
  const { admin, setAdmin } = useAdmin();
  const { openDialog } = useDialog();
  const { users, usersById, setUsers } = useUser();

  // Sync server-side shit with client-side shit
  useEffect(() => {
    if (gamesInitial.length !== games.length) {
      setGames(gamesInitial);
    }
    if (adminInitial !== null && admin === undefined) {
      setAdmin(adminInitial);
    }
    if (usersInitial.length !== users.length) {
      setUsers(usersInitial);
    }
  }, [
    admin,
    adminInitial,
    games.length,
    gamesInitial,
    setAdmin,
    setGames,
    setUsers,
    users.length,
    usersInitial,
  ]);

  const [targettedGame, setGameInfo] = useState<
    Partial<IGame> & { cancelled: boolean }
  >(DEFAULT_STATE);

  const handlePayment = useCallback(
    async (
      userId: ObjectId,
      { _id, time, day }: Pick<IGame, "_id" | "day" | "time">,
      dateStr: string,
      recordPayment = false,
    ) => {
      setLoading(true);
      setGeneralError(null);

      try {
        const { error } = await dbRequest<IUser & { recordPayment?: boolean }>(
          "update",
          Collection.USERS,
          {
            _id: userId,
            missedPayments: [{ _id, date: dateStr, time, day }],
            recordPayment,
          },
        );

        if (error !== null) throw error;

        const { data: usersUpdated } = await dbRequest<IUser[]>(
          "get",
          Collection.USERS,
        );

        setUsers(usersUpdated);
      } catch (error) {
        const e = error instanceof Error ? error : new Error("Unknown error!");
        setGeneralError(e);
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [setUsers],
  );

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
            game.cancelled === targettedGame.cancelled &&
            game.type === targettedGame.type,
        )
      ) {
        throw new Error(
          "Game already exists for this day with the same configuration",
        );
      }

      setAddGameError(null);

      const {
        _id,
        type,
        teams = type === GameType.TOURNAMENT ? EMPTY_TEAMS : undefined,
        ...gameNoId
      } = targettedGame;

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
          teams,
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

  const handleToggleSignupsAvailable = useCallback(
    async (ev: React.MouseEvent<HTMLButtonElement>) => {
      ev.stopPropagation();
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
    },
    [admin, setAdmin],
  );

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
  const usersWhomOweMoney = useMemo(
    () => users.filter((usr) => (usr.missedPayments?.length ?? 0) > 0),
    [users],
  );

  const [paymentsConfirmed, setPaymentsConfirmed] = useState<
    Partial<Record<string, string[]>>
  >({});

  useEffect(() => {
    setPaymentsConfirmed(_getPaymentConfirmation());
  }, []);

  useEffect(() => {
    _setPaymentConfirmation(paymentsConfirmed);
  }, [paymentsConfirmed]);

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
                  onClick={(e) => {
                    e.stopPropagation();
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
        {/* Manage games */}
        <Collapsible
          className="flex flex-col gap-y-1 text-black container !border-0"
          collapsedHeight={39}
          startCollapsed
        >
          <div className="container-header !h-auto -mt-2 -mx-1.5 py-2 !text-xl md:!text-2xl">
            <small className="px-2 py-1 text-xs mr-auto">
              [+/-] expand/minimise
            </small>
            Manage games
          </div>
          <div className="container text-xs">
            Manage games here. Clicking "edit" on a game will populate the form
            below with the game information, allowing you to edit it. To create
            a new new game either fill in the form when it's empty or click
            "reset" to reset the form and fill it in from scratch.
          </div>
          <Collapsible
            className="container my-2 flex flex-col gap-y-2 justify-start"
            collapsedHeight={70}
            startCollapsed={false}
          >
            <div className="container-header !h-auto -mt-2 -mx-1.5 !items-center">
              <small className="px-2 py-1 text-xs mr-auto">
                [+/-] expand/minimise
              </small>
              Games list
            </div>
            <div className="flex flex-col w-full gap-y-2 sm:gap-y-2 text-xs pt-3 px-1.5">
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
                  <div className="flex flex-[1_1_70%] justify-start gap-x-4">
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
                    className="flex-[0_1_auto]"
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
              <div className="container-header !h-auto -mt-2 mx-[2px] !items-center">
                Edit/Create game
              </div>
              <div className="flex flex-col">
                <select
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
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
                <select
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                  value={targettedGame.type}
                  name="type-of-game"
                  defaultValue="Standard"
                  onChange={(e) => {
                    setGameInfo((prev) => ({
                      ...prev,
                      type: e.target.value as GameType,
                    }));
                  }}
                >
                  {Object.values(GameType).map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
                <input
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                  value={targettedGame.time}
                  onChange={(e) => {
                    handleChange("time", e.target.value);
                  }}
                  placeholder="Time 24h format (e.g 19:00)"
                />
                <AdminError errors={addGameError} errorKey="time" />
                <input
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                  value={targettedGame.location}
                  onChange={(e) => {
                    handleChange("location", e.target.value);
                  }}
                  placeholder="Location name (e.g Playarena Olais)"
                />
                <AdminError errors={addGameError} errorKey="location" />
                <input
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                  value={targettedGame.address}
                  onChange={(e) => {
                    handleChange("address", e.target.value);
                  }}
                  placeholder="Address"
                />
                <AdminError errors={addGameError} errorKey="address" />
                <input
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                  value={targettedGame.mapUrl}
                  onChange={(e) => {
                    handleChange("mapUrl", e.target.value);
                  }}
                  placeholder="Google Maps URL"
                />
                <AdminError errors={addGameError} errorKey="mapUrl" />
                <select
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
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
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
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
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
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
                  <option value="">Status: Confirmed</option>
                  <option value="cancelled">Status: Cancelled</option>
                </select>
                <select
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                  value={targettedGame.hidden === true ? "hidden" : "visible"}
                  name="hidden"
                  defaultValue="visible"
                  onChange={(e) => {
                    setGameInfo((prev) => ({
                      ...prev,
                      hidden: e.target.value === "hidden",
                    }));
                  }}
                >
                  <option value="visible"> View: Visible</option>
                  <option value="hidden">View: Hidden</option>
                </select>
              </div>
            </div>
          ) : (
            <Loader className="w-full h-[300px]" />
          )}

          <div className="flex gap-x-2 items-center justify-between h-full mt-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
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
              onClick={(e) => {
                e.stopPropagation();
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
        </Collapsible>

        {/* Track payment per game */}
        <Collapsible
          className="flex flex-col gap-y-1 text-black container !px-[1px] !border-0"
          collapsedHeight={39}
          startCollapsed
        >
          <div className="container-header !h-auto -mt-2 mx-[2px] py-2 !text-xl md:!text-2xl">
            <small className="px-2 py-1 text-xs mr-auto">
              [+/-] expand/minimise
            </small>
            Track payment per game
          </div>
          <div className="container text-xs">
            Manage player game payments here. Clicking "Not paid" will record
            that player as having missed payment for that game. A full list can
            be seen below in "Payment tracking".
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
                    [+/-] expand/minimise
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
                        <small className="px-2 py-1 text-xs mr-auto">
                          [+/-]
                        </small>
                        Game {g.game_id} - {gameDateStr}
                      </div>
                      {g.players.slice(0, MAX_SIGNUPS_PER_GAME).flatMap((u) => {
                        const specificUser = usersById[u];
                        if (specificUser === undefined) return [];

                        const hasMissingPayment =
                          specificUser.missedPayments?.some(
                            (info) => info.date === gameDateStr,
                          ) ?? false;
                        const userPaid =
                          paymentsConfirmed[gameDateStr]?.includes(u) === true;

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

        {/* Players whom owe money */}
        <Collapsible
          className="flex flex-col gap-y-1 text-black container !px-0 !border-0"
          collapsedHeight={39}
          startCollapsed
        >
          <div className="container-header !h-auto -mt-2 mx-[2px] py-2 !text-xl md:!text-2xl">
            <small className="px-2 py-1 text-xs mr-auto">
              [+/-] expand/minimise
            </small>
            Players in debt
          </div>
          <div className="container text-xs gap-x-4">
            <div className="flex-3">
              Here is a list of all players with missing payments. Payments can
              be recorded by clicking "Record payment" on each players card.
            </div>
            <button
              className="flex-0.5 bg-[var(--background-color-2)] justify-center items-center font-bold"
              onClick={async (e) => {
                e.stopPropagation();
                await sharePaymentsMissingList(usersWhomOweMoney);
              }}
            >
              Share list
            </button>
          </div>

          <div className="flex flex-col gap-y-2 pt-3">
            {usersWhomOweMoney.length === 0 ? (
              <p className="pl-4">No missed payments! :)</p>
            ) : (
              usersWhomOweMoney.map(({ _id, missedPayments, ...restUser }) => (
                <SigneeComponent
                  key={_id?.toString()}
                  _id={_id}
                  hideAvatar
                  {...restUser}
                  loading={loading}
                  errorMsg={null}
                  childrenBelow={
                    <div className="mt-3 pl-2 flex flex-col gap-y-2">
                      {(missedPayments ?? []).map(
                        ({ date, ...unpaidGame }, idx) => (
                          <div key={date} className="flex flex-col gap-y-1">
                            <div className="flex flex-wrap gap-x-2 items-center justify-between">
                              <span>
                                {idx + 1}: {unpaidGame.day}:{" "}
                                <strong className="inline sm:hidden">
                                  {date.slice(0, 20)}
                                </strong>
                                <strong className="hidden sm:inline">
                                  {date}
                                </strong>{" "}
                              </span>
                              {_id !== undefined && (
                                <button
                                  disabled={loading}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    void handlePayment(
                                      _id,
                                      unpaidGame,
                                      date,
                                      true,
                                    );
                                  }}
                                >
                                  Record payment
                                </button>
                              )}
                            </div>
                          </div>
                        ),
                      )}
                    </div>
                  }
                />
              ))
            )}
          </div>
        </Collapsible>
      </div>
      <PartnerProducts />
    </>
  );
}
