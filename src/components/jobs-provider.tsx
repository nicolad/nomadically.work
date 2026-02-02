"use client";

import { ApolloProvider, useApollo } from "@/apollo/client";
import { JobsList } from "./jobs-list";

export function JobsProvider() {
  const apolloClient = useApollo(null);

  return (
    <ApolloProvider client={apolloClient}>
      <JobsList />
    </ApolloProvider>
  );
}
