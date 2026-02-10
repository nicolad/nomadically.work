"use client";

import { useState } from "react";
import { Container, Box } from "@radix-ui/themes";
import { SearchQueryBar } from "./SearchQueryBar";
import { JobsList } from "./jobs-list";

export function UnifiedJobsProvider() {
  const [searchFilter, setSearchFilter] = useState("");

  return (
    <Container size="4" py="6">
      <SearchQueryBar
        onSearchQueryChange={(q) => setSearchFilter(q)}
        onSearchSubmit={(q) => setSearchFilter(q)}
        onDrilldownToSearch={(q) => setSearchFilter(q)}
      />
      <Box mt="4">
        <JobsList searchFilter={searchFilter} />
      </Box>
    </Container>
  );
}
