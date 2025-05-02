import { useState } from "react";
import { useDebounce } from "use-debounce";

import type { GameFilters } from "./useFilterGames";

export const SEARCH_DEBOUNCE = 400;

export function useSearchFilter() {
  const [searchFilterRaw, setSearchFilter] = useState<string>("");
  const [searchFilter] = useDebounce(searchFilterRaw, SEARCH_DEBOUNCE, {
    leading: true,
  });

  const [filters, setFilter] = useState<GameFilters | undefined>(undefined);

  return {
    searchFilterRaw,
    searchFilter,
    setSearchFilter,
    filters,
    setFilter,
  };
}
