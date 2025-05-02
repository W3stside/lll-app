import { GameFilters, type useFilterGames } from "@/hooks/useFilterGames";

type IGameFilters = Omit<ReturnType<typeof useFilterGames>, "filteredGames"> & {
  searchFilter: string;
  name: string;
  type?: FilterType;
};

export enum FilterType {
  GAMES = "games",
  USERS = "users",
  SHAMERS = "shamers",
}

export function FilterStuff({
  type = FilterType.GAMES,
  name,
  searchFilter,
  filters,
  setFilter,
  setSearchFilter,
}: IGameFilters) {
  return (
    <div className="flex flex-col gap-y-1 text-black container">
      <div className="container-header !h-auto -mt-2 -mx-1.5">
        <h5 className="mr-auto px-2 py-1 capitalize">Filter {name}</h5>{" "}
        <strong className="pr-2">x</strong>
      </div>
      <div className="flex items-center gap-x-2">
        Filter:
        <div className="flex gap-x-2 items-center">
          <input
            type="radio"
            id="filter-my-games"
            name="filter-my-games"
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
        </div>
        {type === FilterType.GAMES && (
          <div className="flex gap-x-2 items-center">
            <input
              type="radio"
              id="filter-open-games"
              name="filter-open-games"
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
            <strong className="whitespace-nowrap text-sm">Open games</strong>
          </div>
        )}
      </div>
      <div className="flex gap-x-2 items-center">
        <input
          type="text"
          id="filter-by-user-info"
          className="!h-8 !w-40 !px-2 !py-1 text-sm"
          name="filter-by-user-info"
          value={searchFilter}
          onChange={(e) => {
            setSearchFilter(e.target.value);
          }}
        />
        <strong className="whitespace-nowrap text-sm">
          Filter by user info
        </strong>
      </div>
    </div>
  );
}
