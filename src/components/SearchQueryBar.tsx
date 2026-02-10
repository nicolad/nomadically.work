/* =========================================================
   File: components/SearchQueryBar.tsx
   Unified search bar with mode toggle between jobs search and SQL
   - JobsSearchBar: Full-text search with debouncing
   - SqlSearchBar: SQL query interface with modal
   - Toggle between modes with radio buttons
   ========================================================= */

"use client";

import * as React from "react";
import { Box, Text, RadioGroup } from "@radix-ui/themes";
import { JobsSearchBar } from "./JobsSearchBar";
import { SqlSearchBar } from "./SqlSearchBar";

export type QueryMode = "jobs" | "sql";

type Props = {
  onSearchQueryChange?: (q: string) => void;
  onSearchSubmit?: (q: string) => void;

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
  initialMode = "jobs",
  initialQuery = "",
  searchDebounceMs = 120,
}: Props) {
  const [mode, setMode] = React.useState<QueryMode>(initialMode);
  const [jobsValue, setJobsValue] = React.useState(initialQuery);

  const handleJobsChange = React.useCallback(
    (q: string) => {
      setJobsValue(q);
      onSearchQueryChange?.(q);
    },
    [onSearchQueryChange],
  );

  const handleJobsSubmit = React.useCallback(
    (q: string) => {
      onSearchSubmit?.(q);
    },
    [onSearchSubmit],
  );

  return (
    <Box>
      <RadioGroup.Root
        value={mode}
        onValueChange={(v) => {
          if (v === "jobs" || v === "sql") setMode(v as QueryMode);
        }}
      >
        <Box style={{ display: "flex", gap: "1rem" }}>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              cursor: "pointer",
            }}
          >
            <RadioGroup.Item value="jobs" />
            <Text size="2">Jobs Search</Text>
          </label>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              cursor: "pointer",
            }}
          >
            <RadioGroup.Item value="sql" />
            <Text size="2">SQL Query</Text>
          </label>
        </Box>
      </RadioGroup.Root>

      <Box mt="4">
        {mode === "jobs" ? (
          <JobsSearchBar
            value={jobsValue}
            onChange={handleJobsChange}
            onSubmit={handleJobsSubmit}
            debounceMs={searchDebounceMs}
            placeholder="Search jobs…"
          />
        ) : (
          <SqlSearchBar
            onDrilldownToSearch={(q) => {
              setMode("jobs");
              setJobsValue(q);
              onDrilldownToSearch?.(q);
              onSearchSubmit?.(q);
            }}
            placeholder="Ask the data…"
          />
        )}
      </Box>

      <Box mt="2">
        <Text size="2" color="gray">
          {mode === "jobs"
            ? "Press Enter to search · Esc to clear"
            : "Press Enter to query · Esc to clear"}
        </Text>
      </Box>
    </Box>
  );
}
