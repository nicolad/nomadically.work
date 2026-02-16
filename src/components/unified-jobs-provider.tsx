"use client";

import { useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Container, Box } from "@radix-ui/themes";
import { SearchQueryBar } from "./SearchQueryBar";
import { JobsList } from "./jobs-list";

export function UnifiedJobsProvider() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchFilter = searchParams.get("q") ?? "";

  const handleSearch = useCallback(
    (query: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (query.trim()) {
        params.set("q", query.trim());
      } else {
        params.delete("q");
      }
      // Remove offset when search changes
      params.delete("offset");
      router.push(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  return (
    <Container size="4" py="6">
      <Box mb="6">
        <SearchQueryBar
          onSearchSubmit={handleSearch}
          initialQuery={searchFilter}
        />
      </Box>
      <Box mt="4">
        <JobsList searchFilter={searchFilter} />
      </Box>
    </Container>
  );
}
