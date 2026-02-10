/* =========================================================
   File: components/SearchQueryBar.tsx
   Unified search bar with mode toggle between jobs search and SQL
   - JobsSearchBar: Full-text search with debouncing
   - SqlSearchBar: SQL query interface with modal
   - Toggle between modes with segmented control
   ========================================================= */

"use client";

import * as React from "react";
import { Box, Flex, Text, SegmentedControl } from "@radix-ui/themes";
import { JobsSearchBar } from "./JobsSearchBar";
import { SqlSearchBar } from "./SqlSearchBar";

export type QueryMode = "search" | "sql";

type Props = {
  onSearchQueryChange?: (q: string) => void;
  onSearchSubmit?: (q: string) => void;

  sqlEndpoint?: string;

  initialMode?: QueryMode;
  initialQuery?: string;

  searchDebounceMs?: number;

  /**
   * When SQL result returns a drilldownSearchQuery, we call this and also update the bar.
   */
  onDrilldownToSearch?: (q: string) => void;
};

export function SearchQueryBar({
  onSearchQueryChange,
  onSearchSubmit,
  onDrilldownToSearch,
  sqlEndpoint = "/api/text-to-sql",
  initialMode = "search",
  initialQuery = "",
  searchDebounceMs = 120,
}: Props) {
  const [mode, setMode] = React.useState<QueryMode>(initialMode);
  const [searchValue, setSearchValue] = React.useState(initialQuery);
  const [sqlValue, setSqlValue] = React.useState("");

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

  const handleSqlSubmit = React.useCallback((q: string) => {
    // SQL modal opens internally in SqlSearchBar
  }, []);

  return (
    <Box>
      <Flex gap="2" align="center" mb="3">
        <SegmentedControl.Root
          value={mode}
          onValueChange={(v) => {
            if (v === "search" || v === "sql") setMode(v);
          }}
          aria-label="Query mode"
        >
          <SegmentedControl.Item value="search">Search</SegmentedControl.Item>
          <SegmentedControl.Item value="sql">SQL</SegmentedControl.Item>
        </SegmentedControl.Root>
      </Flex>

      {mode === "search" ? (
        <RegularSearchBar
          value={searchValue}
          onChange={handleSearchChange}
          onSubmit={handleSearchSubmit}
          debounceMs={searchDebounceMs}
          placeholder="Search jobs…"
        />
      ) : (
        <SqlSearchBar
          value={sqlValue}
          onChange={setSqlValue}
          onSubmit={handleSqlSubmit}
          onDrilldownToSearch={(q) => {
            setMode("search");
            setSearchValue(q);
            onDrilldownToSearch?.(q);
            onSearchSubmit?.(q);
          }}
          sqlEndpoint={sqlEndpoint}
          placeholder="Ask the data…"
        />
      )}

      <Box mt="2">
        <Text size="2" color="gray">
          {mode === "search"
            ? "Press Enter to search · Esc to clear"
            : "Press Enter to query · Esc to clear"}
        </Text>
      </Box>
    </Box>
  );
}
