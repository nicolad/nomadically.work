/* =========================================================
   File: components/SearchQueryBar.tsx
   Jobs search bar with debouncing
   - Full-text search with debouncing
   - Clean, focused interface
   - SQL Query functionality moved to SqlQueryInterface component
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
  const [jobsValue, setJobsValue] = React.useState(initialQuery);

  const handleJobsChange = React.useCallback((q: string) => {
    // Only update local state, don't notify parent yet
    // Parent will be notified via handleJobsSubmit (debounced or on Enter)
    setJobsValue(q);
  }, []);

  const handleJobsSubmit = React.useCallback(
    (q: string) => {
      setJobsValue(q);
      onSearchSubmit?.(q);
    },
    [onSearchSubmit],
  );

  return (
    <Box>
      <JobsSearchBar
        value={jobsValue}
        onChange={handleJobsChange}
        onSubmit={handleJobsSubmit}
        debounceMs={searchDebounceMs}
        placeholder="Search jobs…"
      />
    </Box>
  );
}
