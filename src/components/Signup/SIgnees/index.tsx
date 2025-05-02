import type { MouseEventHandler } from "react";

import { type ISigneeComponent, SigneeComponent } from "./SigneeComponent";

import { useActions } from "@/context/Actions/context";
import type { IUserSafe } from "@/types/users";

interface ISignees
  extends IUserSafe,
    Omit<ISigneeComponent, "_id" | "createdAt" | "errorMsg" | "loading"> {
  children?: React.ReactNode;
  cancelGame: MouseEventHandler<HTMLButtonElement> | undefined;
}

export function Signees({ _id, children, cancelGame, ...rest }: ISignees) {
  const { loading, error } = useActions();

  return (
    <SigneeComponent
      _id={_id}
      loading={loading}
      errorMsg={error?.message ?? null}
      handleCancel={cancelGame}
      {...rest}
    >
      {children}
    </SigneeComponent>
  );
}
