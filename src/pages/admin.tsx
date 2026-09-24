import { ObjectId } from "mongodb";
import type { GetServerSideProps } from "next";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";

import { FindAndDeletePlayer } from "@/components/Admin/FindAndDeletePlayer";
import { GameHistory } from "@/components/Admin/GameHistory";
import { ManageGames } from "@/components/Admin/ManageGames";
import { OweMoney } from "@/components/Admin/OweMoney";
import { SignupsManagement } from "@/components/Admin/SignupsManagement";
import { TrackPayment } from "@/components/Admin/TrackPayment";
import { DEFAULT_GAME_STATE } from "@/components/Admin/constants";
import type { ErrorUser } from "@/components/Admin/types";
import { PartnerProducts } from "@/components/PartnerProducts";
import { RED_TW } from "@/constants/colours";
import { ADMIN_NAVLINK, NAVLINKS_MAP } from "@/constants/links";
import { useAdmin } from "@/context/Admin/context";
import { useDialog } from "@/context/Dialog/context";
import { useGames } from "@/context/Games/context";
import { useUser } from "@/context/User/context";
import { withServerSideProps } from "@/hoc/withServerSideProps";
import { getOccurrences, getRecentOccurrences } from "@/lib/gameOccurrences";
import client from "@/lib/mongodb";
import {
  type AttendanceStatus,
  type IUserSafe,
  Collection,
  GameType,
  Role,
  type IAdmin,
  type IGame,
  type IGameOccurrence,
  type IUser,
} from "@/types";
import { dbRequest } from "@/utils/api/dbRequest";
import { fetchUsersFromMongodb } from "@/utils/api/mongodb";
import { updateAttendance, updatePayment } from "@/utils/api/occurrences";
import { getThisWeekOccurrenceKey, isValid24hTime } from "@/utils/date";
import { getOccurrenceRowKey } from "@/utils/gameHistory";
import { sharePaymentsMissingList } from "@/utils/games";
import { sortDaysOfWeek } from "@/utils/sort";

const GOOGLE_MAPS_REGEX =
  /^(https?:\/\/)?(www\.)?(google\.com\/maps|maps\.google\.com|maps\.app\.goo\.gl)/;
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
// About six weeks of games; the CSV download has the rest
const HISTORY_ROWS_SHOWN = 40;

const FIELDS_TO_VALIDATE: (keyof IGame)[] = [
  "name",
  "day",
  "time",
  "location",
  "address",
  "gender",
  "speed",
  "cancelled",
  "type",
  "hidden",
];

function _keyOccurrences(rows: IGameOccurrence[]) {
  return Object.fromEntries(
    rows.map((row) => [getOccurrenceRowKey(row.game_id, row.occurrence), row]),
  );
}

// Latest week first, then the latest kick-off
function _compareOccurrences(a: IGameOccurrence, b: IGameOccurrence) {
  return (
    b.occurrence.localeCompare(a.occurrence) || b.time.localeCompare(a.time)
  );
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

      const [usersSerialised, thisWeekRows, recentRows] = await Promise.all([
        fetchUsersFromMongodb(client, true),
        // Track payment shows each game's marks for this week
        getOccurrences(
          games.map((game) => ({
            game_id: game._id.toString(),
            occurrence: getThisWeekOccurrenceKey(game),
          })),
        ),
        getRecentOccurrences(HISTORY_ROWS_SHOWN),
      ]);
      const occurrences = [
        ...new Map(
          [...recentRows, ...thisWeekRows].map((row) => [
            row._id.toString(),
            row,
          ]),
        ).values(),
      ];

      return {
        props: {
          isConnected: true,
          games,
          user: JSON.parse(JSON.stringify(user)) as string,
          users: usersSerialised,
          usersById: JSON.parse(JSON.stringify(usersById)) as string,
          occurrences: JSON.parse(JSON.stringify(occurrences)) as string,
        },
      };
    } catch (e) {
      return {
        props: {
          games: [],
          user: null,
          users: [],
          usersById: {},
          occurrences: [],
        },
      };
    }
  });

interface IAdminPage {
  isConnected: boolean;
  user: IUser;
  users: IUser[];
  usersById: Record<string, IUser>;
  games: IGame[];
  admin: IAdmin | null;
  // Game history: this week's rows and the latest weeks
  occurrences?: IGameOccurrence[];
}

export default function Admin({
  isConnected,
  admin: adminInitial,
  user,
  users: usersInitial,
  games: gamesInitial,
  occurrences: occurrencesInitial = [],
}: IAdminPage) {
  const [loading, setLoading] = useState(false);
  const [generalError, setGeneralError] = useState<Error | null>(null);
  // Payment and attendance errors, shown by the players tools
  const [playersError, setPlayersError] = useState<Error | null>(null);
  const [occurrenceRows, setOccurrenceRows] = useState<
    Record<string, IGameOccurrence>
  >(() => _keyOccurrences(occurrencesInitial));
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
    setGames(gamesInitial);
    if (adminInitial !== null) setAdmin(adminInitial);
    setUsers(usersInitial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [targettedGame, setGameInfo] =
    useState<Partial<IGame>>(DEFAULT_GAME_STATE);

  const saveOccurrence = useCallback((row: IGameOccurrence | null) => {
    if (row === null) return;

    setOccurrenceRows((prev) => ({
      ...prev,
      [getOccurrenceRowKey(row.game_id, row.occurrence)]: row,
    }));
  }, []);

  const handlePayment = useCallback(
    async (
      userId: ObjectId,
      { _id, time, day }: Pick<IGame, "_id" | "day" | "time">,
      dateStr: string,
      paid: boolean,
      occurrence?: string,
    ) => {
      setLoading(true);
      setPlayersError(null);

      try {
        const { user: updatedUser, occurrence: row } = await updatePayment({
          user_id: userId.toString(),
          game_id: _id.toString(),
          date: dateStr,
          day,
          time,
          occurrence,
          paid,
        });

        setUsers((prev) =>
          prev.map((usr) =>
            usr._id.toString() === updatedUser._id.toString()
              ? updatedUser
              : usr,
          ),
        );
        saveOccurrence(row);
      } catch (error) {
        setPlayersError(
          error instanceof Error ? error : new Error("Unknown error!"),
        );
      } finally {
        setLoading(false);
      }
    },
    [saveOccurrence, setUsers],
  );

  const handleAttendance = useCallback(
    async (
      game: IGame,
      occurrence: string,
      userIds: string[],
      attendance: AttendanceStatus | null,
    ) => {
      setLoading(true);
      setPlayersError(null);

      try {
        saveOccurrence(
          await updateAttendance({
            game_id: game._id.toString(),
            occurrence,
            user_ids: userIds,
            attendance,
          }),
        );
      } catch (error) {
        setPlayersError(
          error instanceof Error ? error : new Error("Unknown error!"),
        );
      } finally {
        setLoading(false);
      }
    },
    [saveOccurrence],
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

      const isDuplicate = games.some((game) => {
        // If updating, exclude the game itself from duplicate check
        if (
          targettedGame._id !== undefined &&
          game._id.toString() === targettedGame._id.toString()
        ) {
          return false;
        }

        return FIELDS_TO_VALIDATE.every(
          (field) => game[field] === targettedGame[field],
        );
      });

      if (isDuplicate) {
        throw new Error(
          "Game already exists for this day with the same configuration",
        );
      }

      setAddGameError(null);

      const {
        _id,
        type,
        teams = type === GameType.TOURNAMENT_RANDOM ||
        type === GameType.TOURNAMENT_NATIONS
          ? (targettedGame.teams ?? EMPTY_TEAMS)
          : undefined,
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
          type,
          players: [],
          teams,
        });
      }
      // Update existing game
      else {
        const { players: _, ...gameNoPlayers } = gameNoId;
        response = await dbRequest<
          Omit<IGame, "_id" | "players">,
          {
            updatedGame: IGame;
            games: IGame[];
          }
        >("update", Collection.GAMES, {
          _id,
          type,
          teams,
          ...gameNoPlayers,
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
      setGameInfo(DEFAULT_GAME_STATE);
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

  const handleDeletePlayer = useCallback(
    async (userToDelete: IUserSafe | undefined) => {
      if (userToDelete?._id === undefined) return;

      try {
        setLoading(true);
        setGeneralError(null);

        const { error: deleteError } = await dbRequest<IUserSafe>(
          "delete",
          Collection.USERS,
          userToDelete as IUser,
        );

        if (deleteError) {
          setGeneralError(deleteError);
          throw deleteError;
        }

        setUsers((prev) => prev.filter((usr) => usr._id !== userToDelete._id));
      } catch (error) {
        const e = error instanceof Error ? error : new Error("Unknown error");
        setGeneralError(e);
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [setUsers],
  );

  const sortedGames = useMemo(() => sortDaysOfWeek(games), [games]);
  const usersWhomOweMoney = useMemo(
    () =>
      users
        .filter((usr) => (usr.missedPayments?.length ?? 0) > 0)
        .sort(
          (a, b) =>
            (b.missedPayments?.length ?? 0) - (a.missedPayments?.length ?? 0),
        ),
    [users],
  );

  const historyRows = useMemo(
    () => Object.values(occurrenceRows).toSorted(_compareOccurrences),
    [occurrenceRows],
  );

  if (!isConnected) return <h1>Connecting to db...</h1>;

  return (
    <>
      <div className="flex flex-col gap-y-3 text-black container">
        <div className="container-header !h-auto -mt-2 -mx-1.5">
          <h4 className="flex items-center mr-auto px-2 py-1">
            <Image
              src={ADMIN_NAVLINK.icon}
              alt="program"
              className="size-12 -mt-1"
            />{" "}
            LLL Admin
          </h4>{" "}
          X
        </div>
        <div className="px-2 py-2">
          Hey {user.first_name}! <br />
          <br />
          Below there are different sections where you can execute different
          actions to configure the LLL app.
          <br />
          <br />
          <i>More coming soon!</i>
        </div>
        <br />
        <h5 className="flex items-center ml-1 font-bold">
          <Image
            src={ADMIN_NAVLINK.icon}
            alt="program"
            className="size-11 -mt-1"
          />{" "}
          Players admin
        </h5>
        {playersError !== null && (
          <p role="alert" className={`px-2 py-1 text-sm ${RED_TW}`}>
            Not saved: {playersError.message}
          </p>
        )}
        <TrackPayment
          gamesByDay={gamesByDay}
          usersById={usersById}
          occurrences={occurrenceRows}
          handlePayment={handlePayment}
          handleAttendance={handleAttendance}
          loading={loading}
          startCollapsed={false}
        />
        <OweMoney
          usersWhomOweMoney={usersWhomOweMoney}
          handlePayment={handlePayment}
          sharePaymentsMissingList={sharePaymentsMissingList}
          loading={loading}
        />
        <GameHistory occurrences={historyRows} usersById={usersById} />
        <FindAndDeletePlayer
          users={users}
          openDialog={openDialog}
          handleDeletePlayer={handleDeletePlayer}
        />
        <h5 className="flex items-center ml-1 font-bold">
          <Image
            src={ADMIN_NAVLINK.icon}
            alt="program"
            className="size-11 -mt-1"
          />{" "}
          Games admin
        </h5>
        <ManageGames
          sortedGames={sortedGames}
          loading={loading}
          targettedGame={targettedGame}
          setGameInfo={setGameInfo}
          handleRefreshGames={handleRefreshGames}
          handleChange={handleChange}
          setAddGameError={setAddGameError}
          setGeneralError={setGeneralError}
          openDialog={openDialog}
          handleUpdateGame={handleUpdateGame}
          addGameError={addGameError}
          generalError={generalError}
        />
        <SignupsManagement
          admin={admin}
          loading={loading}
          openDialog={openDialog}
          handleClearAllSignups={handleClearAllSignups}
          handleToggleSignupsAvailable={handleToggleSignupsAvailable}
        />
      </div>
      <PartnerProducts />
    </>
  );
}
