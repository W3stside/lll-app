import type { ObjectId } from "mongodb";

import { type ISigneeComponent, SigneeComponent } from "./SigneeComponent";

import { useActions } from "@/context/Actions/context";
import type { IGame, IUserSafe } from "@/types/users";

interface ISignees
  extends IUserSafe,
    Omit<ISigneeComponent, "_id" | "createdAt" | "errorMsg" | "loading"> {
  children?: React.ReactNode;
  isUser: boolean;
  date: string | undefined;
  games: IGame[];
  game_id: ObjectId;
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
        isUser && _id !== undefined && date !== undefined
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
