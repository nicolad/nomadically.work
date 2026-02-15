"use client";

import { useState } from "react";
import { Container, Box, Text } from "@radix-ui/themes";
import { SearchQueryBar } from "./SearchQueryBar";
import { JobsList } from "./jobs-list";

export function UnifiedJobsProvider() {
  const [searchFilter, setSearchFilter] = useState("");

  return (
    <Container size="4" py="6">
      <Box mb="6">
        <SearchQueryBar onSearchSubmit={(q) => setSearchFilter(q)} />
      </Box>
      <Box mt="4">
        <JobsList searchFilter={searchFilter} />
      </Box>
    </Container>
  );
}
