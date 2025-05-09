import type { GetServerSideProps } from "next";
import { useState } from "react";
import { useDebounce } from "use-debounce";

import { FilterStuff, FilterType } from "@/components/FilterStuff";
import { PartnerProducts } from "@/components/PartnerProducts";
import { SigneeComponent } from "@/components/Signup/SIgnees/SigneeComponent";
import { useUser } from "@/context/User/context";
import { withServerSideProps } from "@/hoc/withServerSideProps";
import { GameFilters } from "@/hooks/useFilterGames";
import { SEARCH_DEBOUNCE, useSearchFilter } from "@/hooks/useSearchFilter";
import client from "@/lib/mongodb";
import { Collection } from "@/types";
import type { IGame, IUser } from "@/types/users";
import { filterUser } from "@/utils/filter";

export const getServerSideProps: GetServerSideProps = withServerSideProps(
  // TODO: review
  // @ts-expect-error error in the custom HOC - doesn't break.
  async (context) => {
    const { parentProps } = context;

    try {
      await client.connect();

      const users = await client
        .db("LLL")
        .collection<IGame[]>(Collection.USERS)
        .find()
        .toArray();

      return {
        props: {
          ...parentProps,
          isConnected: true,
          users: JSON.parse(JSON.stringify(users)) as string,
        },
      };
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
      throw e instanceof Error ? e : new Error("Shame: error occured!");
    }
  },
);

interface IWallOfShame {
  users: IUser[];
  games: IGame[];
}

export default function WallOfShame({ users }: IWallOfShame) {
  const { filters, searchFilter, searchFilterRaw, setSearchFilter, setFilter } =
    useSearchFilter();
  const [dateSearchFilterRaw, setDateSearch] = useState("");
  const [dateSearchFilter] = useDebounce(dateSearchFilterRaw, SEARCH_DEBOUNCE);

  const { user: currentUser } = useUser();

  return (
    <>
      <div className="flex flex-col flex-wrap gap-x-4 px-4 items-baseline justify-start">
        <div className="flex mb-4 text-6xl">
          <span className="text-7xl mb-2 mr-2">ಠ_ಠ</span>{" "}
          <span className="ml-6">BAH</span>
        </div>
        <div className="flex flex-col gap-y-4">
          <div className="container flex-col">
            <div className="container-header !h-auto mb-2 -mt-2 -mx-1.5">x</div>
            Where the shameful players who drop out less than 12 hours before
            games are displayed for all of us to laugh at. Don't be like these
            people!
          </div>
          <FilterStuff
            type={FilterType.SHAMERS}
            name="sins"
            filters={filters}
            setFilter={setFilter}
            searchFilter={searchFilterRaw}
            setSearchFilter={setSearchFilter}
          >
            <input
              type="text"
              id="filter-by-game-date"
              className="!h-8 !w-40 !px-2 !py-1 text-sm"
              name="filter-by-game-date"
              value={dateSearchFilterRaw}
              onChange={(e) => {
                setDateSearch(e.target.value);
              }}
            />
            <strong className="whitespace-nowrap text-sm">
              Filter by game date
            </strong>
          </FilterStuff>
        </div>
      </div>

      <div className="flex flex-row flex-wrap items-center justify-center gap-y-2 gap-x-5">
        {users
          .filter((u) => filterUser(u, searchFilter))
          .filter((u2) =>
            currentUser._id !== undefined && filters === GameFilters.MY_GAMES
              ? currentUser._id.toString() === u2._id.toString()
              : true,
          )
          .filter((user) =>
            dateSearchFilter === ""
              ? true
              : user.shame.filter((g) =>
                  g.date.toString().includes(dateSearchFilter),
                ).length,
          )
          .flatMap((user) =>
            user.shame.length > 0
              ? [
                  <div key={user._id.toString()} className="w-[350px]">
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
                                  {idx + 1}.{" "}
                                  <strong>Late cancel/no-show:</strong>{" "}
                                  {date
                                    .toString()
                                    .slice(0, 16)
                                    .split("T")
                                    .join(" ")}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      }
                    ></SigneeComponent>
                  </div>,
                ]
              : [],
          )}
      </div>

      <PartnerProducts />
    </>
  );
}
