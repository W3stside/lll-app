import Image from "next/image";
import type { ReactNode } from "react";

import find from "@/assets/find.png";
import { GameFilters, type useFilterGames } from "@/hooks/useFilterGames";
import { cn } from "@/utils/tailwind";

type IGameFilters = Omit<ReturnType<typeof useFilterGames>, "filteredGames"> & {
  searchFilter: string;
  name: string;
  type?: FilterType;
  className?: string;
  children?: ReactNode;
  placeholder?: string;
  showHeader?: boolean;
  showRadio?: boolean;
  filterLabel?: string | null;
};

export enum FilterType {
  GAMES = "games",
  USERS = "users",
  SHAMERS = "shamers",
}

export function FilterStuff({
  className,
  type = FilterType.GAMES,
  name,
  searchFilter,
  filters,
  placeholder,
  showHeader = true,
  showRadio = true,
  filterLabel = "Find by user info",
  children,
  setFilter,
  setSearchFilter,
}: IGameFilters) {
  return (
    <div
      className={cn("flex flex-col gap-y-1 text-black container", className)}
      onClick={(e) => {
        e.stopPropagation();
      }}
    >
      {showHeader && (
        <div className="container-header !h-auto -mt-2 -mx-1.5">
          <h5 className="mr-auto px-2 py-1 capitalize">Find {name}</h5>{" "}
          <strong className="pr-2">X</strong>
        </div>
      )}
      {showRadio && (
        <div className="flex items-center gap-x-2">
          <Image src={find} alt="filter" width={35} height={35} />
          <div className="flex flex-col">
            <span>Find</span>
            <div className="flex gap-x-2 items-center">
              <input
                type="radio"
                id="filter-my-games"
                name="filter-my-games"
                className="w-auto"
                checked={filters === GameFilters.MY_GAMES}
                readOnly
                onClick={() => {
                  setFilter(
                    filters !== GameFilters.MY_GAMES
                      ? GameFilters.MY_GAMES
                      : undefined,
                  );
                }}
              />
              <strong className="whitespace-nowrap text-sm">My {name}</strong>
              {type === FilterType.GAMES && (
                <div className="flex gap-x-2 items-center">
                  <input
                    type="radio"
                    id="filter-open-games"
                    name="filter-open-games"
                    className="w-auto"
                    checked={filters === GameFilters.OPEN_GAMES}
                    readOnly
                    onClick={() => {
                      setFilter(
                        filters !== GameFilters.OPEN_GAMES
                          ? GameFilters.OPEN_GAMES
                          : undefined,
                      );
                    }}
                  />
                  <strong className="whitespace-nowrap text-sm">
                    Open games
                  </strong>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      <div className="flex flex-wrap gap-x-4 gap-y-2">
        <div className="flex gap-x-2 items-center min-w-full">
          <input
            type="text"
            id="filter-by-user-info"
            className={cn("!h-8 !w-40 !px-2 !py-1 text-sm", {
              "!w-full": filterLabel === null,
            })}
            name="filter-by-user-info"
            value={searchFilter}
            placeholder={placeholder}
            onChange={(e) => {
              setSearchFilter(e.target.value);
            }}
          />
          {filterLabel !== null && (
            <strong className="whitespace-nowrap text-sm">{filterLabel}</strong>
          )}
        </div>
        {children !== undefined && (
          <div className="flex gap-x-2 items-center">{children}</div>
        )}
      </div>
    </div>
  );
}
