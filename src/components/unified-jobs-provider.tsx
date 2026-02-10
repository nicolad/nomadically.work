"use client";

import { useState } from "react";
import { ApolloProvider, useApollo } from "@/apollo/client";
import { Container, Box } from "@radix-ui/themes";
import { SearchQueryBar } from "./SearchQueryBar";
import { JobsList } from "./jobs-list";

export function UnifiedJobsProvider() {
  const apolloClient = useApollo(null);
  const [searchFilter, setSearchFilter] = useState("");

  return (
    <ApolloProvider client={apolloClient}>
      <Container size="4" py="6">
        <SearchQueryBar
          onSearchQueryChange={(q) => setSearchFilter(q)}
          onSearchSubmit={(q) => setSearchFilter(q)}
          onDrilldownToSearch={(q) => setSearchFilter(q)}
          sqlEndpoint="/api/text-to-sql"
        />
        
        <Box mt="4">
          <JobsList searchFilter={searchFilter} />
        </Box>
      </Container>
    </ApolloProvider>
  );
}
