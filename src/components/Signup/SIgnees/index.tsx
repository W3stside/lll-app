import type { ObjectId } from "mongodb";
import { useCallback, useState, type MouseEventHandler } from "react";

import { SigneeComponent } from "./SigneeComponent";

import { CANCELLATION_THRESHOLD_MS } from "@/constants/date";
import { Collection } from "@/types";
import type { IGame, IUser } from "@/types/users";
import { dbRequest } from "@/utils/dbRequest";

interface ISignees extends IUser {
  children?: React.ReactNode;
  isUser: boolean;
  date: string;
  games: IGame[];
  game_id: ObjectId;
  setGames?: (users: IGame[]) => void;
}

export function Signees({
  game_id,
  games,
  _id,
  first_name,
  last_name,
  phone_number,
  date,
  isUser,
  children,
  setGames,
}: ISignees) {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setError] = useState<string | null>(null);

  const handleCancel: MouseEventHandler<HTMLButtonElement> = useCallback(
    (e) => {
      e.stopPropagation();

      setLoading(true);

      void (async () => {
        try {
          setError(null);

          // eslint-disable-next-line no-alert
          if (!confirm("Are you sure you want to drop out?")) {
            return;
          }

          const gameMinusThreshold =
            Date.parse(date) - CANCELLATION_THRESHOLD_MS;

          if (new Date() > new Date(gameMinusThreshold)) {
            // eslint-disable-next-line no-alert
            const response = prompt(
              `It's past the cancellation threshold of 12 hours. What are you doing!? 
              
Continue with cancellation: type "Yes, I'm a dumbass" and tap OK to continue.
              
Keep your spot: tap cancel.
              `,
            );
            if (response !== "Yes, I'm a dumbass") {
              throw new Error(
                "Good lad, now warm-up, sober up, and get ready to play.",
              );
            } else {
              await dbRequest<IUser>("update", Collection.USERS, {
                _id,
                shame: [{ game_id, date: new Date(date) }],
              });
            }
          }

          await dbRequest<IGame>("update", Collection.GAMES, {
            _id: game_id,
            players:
              games
                .find((g) => g._id.toString() === game_id.toString())
                ?.players.filter((pl) => pl.toString() !== _id.toString()) ??
              [],
          });

          const { data } = await dbRequest<IGame[]>("get", Collection.GAMES);
          setGames?.(data);
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error occurred.";

          setError(errorMessage);
          throw new Error(errorMessage);
        } finally {
          setLoading(false);
        }
      })();
    },
    [_id, date, game_id, games, setGames],
  );

  return (
    <SigneeComponent
      {...{ _id, first_name, last_name, phone_number, date }}
      loading={loading}
      errorMsg={errorMsg}
      handleCancel={isUser ? handleCancel : undefined}
    >
      {children}
    </SigneeComponent>
  );
}
