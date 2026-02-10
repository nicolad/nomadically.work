"use client";

import { useState } from "react";
import { Container, Box, Text } from "@radix-ui/themes";
import { SearchQueryBar } from "./SearchQueryBar";
import { SqlQueryInterface } from "./SqlQueryInterface";
import { JobsList } from "./jobs-list";

export function UnifiedJobsProvider() {
  const [searchFilter, setSearchFilter] = useState("");

  return (
    <Container size="4" py="6">
      <Box mb="6">
        <SearchQueryBar
          onSearchQueryChange={(q) => setSearchFilter(q)}
          onSearchSubmit={(q) => setSearchFilter(q)}
        />
      </Box>

      <Box mb="6">
        <Text size="3" weight="medium" mb="3" as="div">
          or Query with SQL
        </Text>
        <SqlQueryInterface
          placeholder="e.g. Top 10 companies hiring React in the last 14 days"
          onDrilldownToSearch={(q) => {
            setSearchFilter(q);
          }}
        />
      </Box>

      <Box mt="4">
        <JobsList searchFilter={searchFilter} />
      </Box>
    </Container>
  );
}
