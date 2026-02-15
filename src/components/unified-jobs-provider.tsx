"use client";

import { useState } from "react";
import { Container, Box, Text } from "@radix-ui/themes";
import { SearchQueryBar } from "./SearchQueryBar";
import { JobsList } from "./jobs-list";

export function UnifiedJobsProvider() {
  const [searchFilter, setSearchFilter] = useState("");
  const [searchTrigger, setSearchTrigger] = useState(0);

  const handleSearch = (query: string) => {
    setSearchFilter(query);
    // Increment trigger to force refetch even if query is the same
    setSearchTrigger((prev) => prev + 1);
  };

  return (
    <Container size="4" py="6">
      <Box mb="6">
        <SearchQueryBar onSearchSubmit={handleSearch} />
      </Box>
      <Box mt="4">
        <JobsList searchFilter={searchFilter} searchTrigger={searchTrigger} />
      </Box>
    </Container>
  );
}
