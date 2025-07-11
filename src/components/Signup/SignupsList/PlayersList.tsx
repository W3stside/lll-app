import { Collapsible } from "../../ui";
import { Signees } from "../SIgnees";
import type { IPlayersList } from "./types";

import { useActions } from "@/context/Actions/context";
import { useUser } from "@/context/User/context";
import { Role, GameStatus } from "@/types";
import { checkPlayerCanCancel } from "@/utils/data";

export function PlayersList({
  game,
  gameStatus,
  nextGameDate,
  user,
  usersById,
  confirmedList,
  waitlist,
}: Omit<IPlayersList, "capacity" | "index">) {
  const { addShamefulUserWithDialog, cancelGame } = useActions();
  const { user: userContext } = useUser();

  if (game.cancelled === true && userContext.role !== Role.ADMIN) {
    return null;
  }

  return (
    <>
      <Collapsible
        collapsedHeight={36}
        className="flex flex-col gap-y-2 justify-start ml-auto w-[90%] sm:w-[350px] border-4 border-red p-2 container"
      >
        <div className="container-header">
          <small className="ml-2 mr-auto">[open/close]</small> Signed-up players
        </div>
        <div className="flex flex-col items-center gap-y-2">
          {confirmedList.length === 0 ? (
            <p>No players yet. Sign up!</p>
          ) : (
            confirmedList.flatMap((playerId) => {
              const signee = usersById[playerId.toString()];

              if (signee === undefined) {
                return (
                  <div
                    key={playerId.toString()}
                    className="container !bg-[var(--background-error-alt)] flex-col items-start justify-start gap-y-1 h-auto elevation-2"
                  >
                    <div className="container-header w-[calc(100%+12px)] !bg-[var(--background-container-header-alt)] !h-[27px] -mt-2 -ml-1.5">
                      X
                    </div>
                    <div className="ml-auto mr-1">
                      Account was deleted{" "}
                      <span className="text-xl mb-2 mr-2">ಠ_ಠ</span>{" "}
                    </div>
                  </div>
                );
              }

              const isAdminCancelling =
                signee._id.toString() !== user._id.toString() &&
                user.role === Role.ADMIN;

              const canCancel =
                gameStatus !== GameStatus.PAST &&
                checkPlayerCanCancel(signee, user);

              const userAlreadyShamed =
                usersById[playerId.toString()]?.shame.some(
                  ({ date }) => date === nextGameDate,
                ) ?? false;

              return (
                <Signees
                  key={playerId.toString()}
                  {...signee}
                  cancelGame={
                    canCancel
                      ? (e) => {
                          e.stopPropagation();
                          cancelGame(
                            game._id,
                            signee._id,
                            nextGameDate,
                            // Admin is cancelling a game for someone else - don't add to shame
                            {
                              bypassThreshold:
                                // TODO: remove
                                game.hidden === true || isAdminCancelling,
                              cancelMessage: isAdminCancelling
                                ? "You are admin cancelling for someone else. Please be sure to double check the player's info before proceeding."
                                : undefined,
                            },
                          );
                        }
                      : undefined
                  }
                  addToShame={
                    !userAlreadyShamed &&
                    gameStatus === GameStatus.PAST &&
                    userContext.role === Role.ADMIN
                      ? (e) => {
                          e.stopPropagation();
                          addShamefulUserWithDialog(
                            game._id,
                            signee._id,
                            nextGameDate,
                          );
                        }
                      : undefined
                  }
                />
              );
            })
          )}
        </div>
      </Collapsible>
      {waitlist.length > 0 && (
        <Collapsible
          collapsedHeight={36}
          className="flex flex-col gap-y-2 justify-start ml-auto w-[90%] sm:w-[350px] border-4 border-red p-2 container"
        >
          <div className="container-header !bg-orange-500">
            <small className="ml-2 mr-auto">[open/close]</small> Waitlist
            players
          </div>
          <div className="flex flex-col items-center gap-y-2">
            {waitlist.flatMap((playerId) => {
              const signee = usersById[playerId.toString()];

              if (signee === undefined) return [];

              const canCancel =
                gameStatus !== GameStatus.PAST &&
                checkPlayerCanCancel(signee, user);

              return (
                <Signees
                  key={playerId.toString()}
                  {...signee}
                  cancelGame={
                    canCancel
                      ? (e) => {
                          e.stopPropagation();
                          cancelGame(game._id, signee._id, nextGameDate, {
                            bypassThreshold: true,
                          });
                        }
                      : undefined
                  }
                />
              );
            })}
          </div>
        </Collapsible>
      )}
    </>
  );
}
