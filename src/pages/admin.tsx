import { ObjectId } from "mongodb";
import type { GetServerSideProps } from "next";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";

import { FindAndDeletePlayer } from "@/components/Admin/FindAndDeletePlayer";
import { ManageGames } from "@/components/Admin/ManageGames";
import { OweMoney } from "@/components/Admin/OweMoney";
import { SignupsManagement } from "@/components/Admin/SignupsManagement";
import { TrackPayment } from "@/components/Admin/TrackPayment";
import { DEFAULT_GAME_STATE } from "@/components/Admin/constants";
import type { ErrorUser } from "@/components/Admin/types";
import { PartnerProducts } from "@/components/PartnerProducts";
import { ADMIN_NAVLINK, NAVLINKS_MAP } from "@/constants/links";
import { useAdmin } from "@/context/Admin/context";
import { useDialog } from "@/context/Dialog/context";
import { useGames } from "@/context/Games/context";
import { useUser } from "@/context/User/context";
import { withServerSideProps } from "@/hoc/withServerSideProps";
import client from "@/lib/mongodb";
import {
  type IUserSafe,
  Collection,
  GameType,
  Role,
  type IAdmin,
  type IGame,
  type IUser,
} from "@/types";
import { dbRequest } from "@/utils/api/dbRequest";
import { fetchUsersFromMongodb } from "@/utils/api/mongodb";
import { isValid24hTime } from "@/utils/date";
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

interface IAdminPage {
  isConnected: boolean;
  user: IUser;
  users: IUser[];
  usersById: Record<string, IUser>;
  games: IGame[];
  admin: IAdmin | null;
}

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
    setGames(gamesInitial);
    if (adminInitial !== null) setAdmin(adminInitial);
    setUsers(usersInitial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [targettedGame, setGameInfo] =
    useState<Partial<IGame>>(DEFAULT_GAME_STATE);

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
            game.type === targettedGame.type &&
            game.hidden === targettedGame.hidden,
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
          type,
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
          type,
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
        <TrackPayment
          gamesByDay={gamesByDay}
          usersById={usersById}
          paymentsConfirmed={paymentsConfirmed}
          setPaymentsConfirmed={setPaymentsConfirmed}
          handlePayment={handlePayment}
          loading={loading}
          startCollapsed={false}
        />
        <OweMoney
          usersWhomOweMoney={usersWhomOweMoney}
          handlePayment={handlePayment}
          sharePaymentsMissingList={sharePaymentsMissingList}
          loading={loading}
        />
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
