import type { GetServerSideProps } from "next";
import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { useDebounce } from "use-debounce";

import { FilterStuff, FilterType } from "@/components/FilterStuff";
import { PartnerProducts } from "@/components/PartnerProducts";
import { Loader } from "@/components/ui";
import { useUser } from "@/context/User/context";
import { withServerSideProps } from "@/hoc/withServerSideProps";
import { SEARCH_DEBOUNCE, useSearchFilter } from "@/hooks/useSearchFilter";
import client from "@/lib/mongodb";
import { Collection } from "@/types";
import type { IGame, IUser } from "@/types/users";

const ShameList = dynamic(
  async () =>
    await import("@/components/Shame/ShameList").then((mod) => ({
      default: mod.ShameList,
    })),
  { ssr: false, loading: () => <Loader /> }, // Disable SSR and provide a loading fallback
);

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

  const shamefulUsers = useMemo(() => {
    return users.filter((u) => u.shame.length > 0);
  }, [users]);

  return (
    <>
      <div className="flex flex-col flex-wrap gap-x-4 px-4 items-baseline justify-start">
        <div className="flex mb-4 text-6xl">
          <span className="text-7xl mb-2 mr-2">ಠ_ಠ</span>{" "}
          <span className="ml-6">BAH</span>
        </div>
        <div className="flex flex-col gap-y-4">
          <div className="container flex-col">
            <div className="container-header !h-auto mb-2 -mt-2 -mx-1.5">X</div>
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

      <ShameList
        shamefulUsers={shamefulUsers}
        currentUser={currentUser}
        filters={filters}
        searchFilter={searchFilter}
        dateSearchFilter={dateSearchFilter}
      />

      <PartnerProducts />
    </>
  );
}
