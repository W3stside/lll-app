import { SigneeComponent } from "../Signup/SIgnees/SigneeComponent";

import { GameFilters } from "@/hooks/useFilterGames";
import type { IUser, IUserSafe } from "@/types/users";
import { formatDateStr } from "@/utils/date";
import { filterUser } from "@/utils/filter";
import { cn } from "@/utils/tailwind";

interface IShameList {
  shamefulUsers: IUser[];
  currentUser: IUserSafe;
  filters?: GameFilters;
  dateSearchFilter: string;
  searchFilter: string;
}

export function ShameList({
  shamefulUsers,
  currentUser,
  filters,
  dateSearchFilter,
  searchFilter,
}: IShameList) {
  return (
    <div className="flex flex-row flex-wrap items-start justify-center gap-y-2 gap-x-5">
      {shamefulUsers
        .filter((u) => filterUser(u, searchFilter))
        .filter((u2) =>
          currentUser._id !== undefined && filters === GameFilters.MY_GAMES
            ? currentUser._id.toString() === u2._id.toString()
            : true,
        )
        .filter(
          (u3) =>
            dateSearchFilter === "" ||
            u3.shame.filter((g) =>
              formatDateStr(g.date).includes(dateSearchFilter),
            ).length,
        )
        .toSorted((a, b) => {
          const dateA = new Date(a.shame[a.shame.length - 1].date);
          const dateB = new Date(b.shame[b.shame.length - 1].date);
          // @ts-expect-error - date maths isn't TS's fav
          return dateB - dateA;
        })
        .toSorted((a, b) => b.shame.length - a.shame.length)
        .map((user, i) => (
          <div
            key={user._id.toString()}
            className={cn("w-[350px]", {
              "bg-[var(--background-window-highlight)] [&>div]:bg-transparent":
                i === 0,
            })}
          >
            <SigneeComponent
              errorMsg={null}
              loading={false}
              avatarClassName="text-[8px] md:text-[9px] w-[40px] h-[40px] md:h-[45px] md:w-[45px]"
              {...user}
              className="py-[4px] px-[16px]"
              childrenBelow={
                <div className="flex flex-col w-full gap-y-1 mt-2 md:px-2">
                  <div className="flex items-center justify-between w-full">
                    Shameful proof{" "}
                    <div className="text-right ml-auto">
                      {user.shame.length}x shame
                    </div>
                  </div>
                  {user.shame.map(({ game_id, date }, idx) => {
                    return (
                      <div
                        key={game_id.toString()}
                        className="flex items-center justify-between w-full"
                      >
                        <span className="text-sm text-[var(--text-color-alternate)]">
                          {idx + 1}. <strong>Date:</strong>{" "}
                          {formatDateStr(date)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              }
            ></SigneeComponent>
          </div>
        ))}
    </div>
  );
}
