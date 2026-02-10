"use client";

import { useState } from "react";
import { ApolloProvider, useApollo } from "@/apollo/client";
import { Container } from "@radix-ui/themes";
import { UnifiedQueryBar } from "./UnifiedQueryBar";
import { JobsList } from "./jobs-list";

export function UnifiedJobsProvider() {
  const apolloClient = useApollo(null);
  const [searchFilter, setSearchFilter] = useState("");

  return (
    <ApolloProvider client={apolloClient}>
      <Container size="4" py="6">
        <UnifiedQueryBar
          onSearchQueryChange={(q) => setSearchFilter(q)}
          onSearchSubmit={(q) => setSearchFilter(q)}
          sqlEndpoint="/api/text-to-sql"
          jobsPanel={<JobsList searchFilter={searchFilter} />}
        />
      </Container>
    </ApolloProvider>
  );
}
