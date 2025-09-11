import type { ObjectId } from "mongodb";

import { SigneeComponent } from "../Signup/SIgnees/SigneeComponent";
import { Collapsible } from "../ui";

import type { IGame } from "@/types";
import type { IUser } from "@/types/users";

interface IOweMoney {
  usersWhomOweMoney: (Omit<IUser, "_id" | "createdAt" | "password"> & {
    _id: IUser["_id"] | undefined;
    createdAt: IUser["createdAt"] | undefined;
  } & {
    registered_games?: string[];
  })[];
  loading: boolean;
  sharePaymentsMissingList: (
    users: IOweMoney["usersWhomOweMoney"],
  ) => Promise<void>;
  handlePayment: (
    userId: ObjectId,
    unpaidGame: Pick<IGame, "_id" | "day" | "time">,
    date: string,
    isPaid: boolean,
  ) => Promise<void>;
}

export function OweMoney({
  usersWhomOweMoney,
  loading,
  sharePaymentsMissingList,
  handlePayment,
}: IOweMoney) {
  return (
    <Collapsible
      className="flex flex-col gap-y-1 text-black container !px-0 !border-0"
      collapsedHeight={39}
      startCollapsed
    >
      <div className="container-header !h-auto -mt-2 mx-[2px] py-2 !text-xl md:!text-2xl">
        <small className="px-2 py-1 text-xs mr-auto">
          [+/-] <span className="hidden xl:inline">expand/minimise</span>
        </small>
        Players in debt
      </div>
      <div className="container text-xs gap-x-4">
        <div className="flex-3">
          Here is a list of all players with missing payments. Payments can be
          recorded by clicking "Record payment" on each players card.
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
                            <strong className="hidden sm:inline">{date}</strong>{" "}
                          </span>
                          {_id !== undefined && (
                            <button
                              disabled={loading}
                              onClick={(e) => {
                                e.stopPropagation();
                                void handlePayment(_id, unpaidGame, date, true);
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
  );
}
