import type { ObjectId } from "mongodb";
import { useCallback, useMemo, useState } from "react";

import { SigneeComponent } from "./SigneeComponent";

import { CANCELLATION_THRESHOLD_MS } from "@/constants/date";
import { DialogVariant, useDialog } from "@/context/Dialog/context";
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
  avatarSize?: number;
  hideAvatar?: boolean;
}

export function Signees({
  game_id,
  games,
  _id,
  first_name,
  last_name,
  phone_number,
  date,
  shame,
  createdAt,
  isUser,
  avatarSize,
  hideAvatar,
  children,
  setGames,
}: ISignees) {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setError] = useState<string | null>(null);

  const { openDialog } = useDialog();
  const handleCancel = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      await dbRequest<IGame>("update", Collection.GAMES, {
        _id: game_id,
        players:
          games
            .find((g) => g._id.toString() === game_id.toString())
            ?.players.filter((pl) => pl.toString() !== _id.toString()) ?? [],
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
  }, [_id, game_id, games, setGames]);

  const handleAddToShame = useCallback(async () => {
    await dbRequest<IUser>("update", Collection.USERS, {
      _id,
      shame: [{ game_id, date: new Date(date) }],
    });
  }, [_id, date, game_id]);

  const gamePastThreshold = useMemo(
    () => new Date() > new Date(Date.parse(date) - CANCELLATION_THRESHOLD_MS),
    [date],
  );

  return (
    <SigneeComponent
      {...{ _id, first_name, last_name, phone_number, date, shame, createdAt }}
      loading={loading}
      errorMsg={errorMsg}
      handleCancel={
        isUser
          ? () => {
              openDialog({
                variant: DialogVariant.CANCEL,
                title: "Cancel game?",
                content: gamePastThreshold ? (
                  <div>
                    <h3>Whoa whoa whoa!</h3>
                    <p>
                      It's past the cancellation threshold of 12 hours. What are
                      you doing!?
                    </p>
                    <strong>Don't be a dick.</strong> If this isn't an emergency
                    and you're just too hungover because you're weak, then suck
                    it up and come play!{" "}
                    <p>
                      Better than sitting on your fat ass eating McDonald's
                      anyways.
                    </p>
                  </div>
                ) : (
                  <div>
                    <h3>Heads up!</h3>
                    <p>Are you sure you want to cancel and drop your spot?</p>
                  </div>
                ),
                action: () => {
                  void handleCancel();
                  if (gamePastThreshold) void handleAddToShame();
                  openDialog();
                },
              });
            }
          : undefined
      }
      avatarSize={avatarSize}
      hideAvatar={hideAvatar}
    >
      {children}
    </SigneeComponent>
  );
}
