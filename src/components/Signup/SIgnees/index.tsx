import type { ObjectId } from "mongodb";

import { type ISigneeComponent, SigneeComponent } from "./SigneeComponent";

import { useActions } from "@/context/Actions/context";
import type { IGame, IUser } from "@/types/users";

interface ISignees
  extends IUser,
    Omit<ISigneeComponent, "_id" | "createdAt" | "errorMsg" | "loading"> {
  children?: React.ReactNode;
  isUser: boolean;
  date: string;
  games: IGame[];
  game_id: ObjectId;
  setGames?: (users: IGame[]) => void;
}

export function Signees({
  game_id,
  _id,
  date,
  children,
  isUser,
  ...rest
}: ISignees) {
  const { cancelGame, loading, error } = useActions();

  return (
    <SigneeComponent
      _id={_id}
      loading={loading}
      errorMsg={error?.message ?? null}
      handleCancel={
        isUser
          ? () => {
              cancelGame(game_id, _id, date);
            }
          : undefined
      }
      {...rest}
    >
      {children}
    </SigneeComponent>
  );
}
