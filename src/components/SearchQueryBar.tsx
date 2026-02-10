/* =========================================================
   File: components/SearchQueryBar.tsx
   Jobs search bar with debouncing
   - Full-text search input
   - Enter to submit
   - Esc to clear
   ========================================================= */

"use client";

import * as React from "react";
import { Box, Text } from "@radix-ui/themes";
import { JobsSearchBar } from "./JobsSearchBar";

type Props = {
  onSearchQueryChange?: (q: string) => void;
  onSearchSubmit?: (q: string) => void;

  initialQuery?: string;

  searchDebounceMs?: number;
};

export function SearchQueryBar({
  onSearchQueryChange,
  onSearchSubmit,
  initialQuery = "",
  searchDebounceMs = 120,
}: Props) {
  const [searchValue, setSearchValue] = React.useState(initialQuery);

  const handleSearchChange = React.useCallback(
    (q: string) => {
      setSearchValue(q);
      onSearchQueryChange?.(q);
    },
    [onSearchQueryChange],
  );

  const handleSearchSubmit = React.useCallback(
    (q: string) => {
      onSearchSubmit?.(q);
    },
    [onSearchSubmit],
  );

  return (
    <Box>
      <JobsSearchBar
        value={searchValue}
        onChange={handleSearchChange}
        onSubmit={handleSearchSubmit}
        debounceMs={searchDebounceMs}
        placeholder="Search jobs…"
      />

      <Box mt="2">
        <Text size="2" color="gray">
          Press Enter to search · Esc to clear
        </Text>
      </Box>
    </Box>
  );
}
