"use client";

import { ApolloProvider, useApollo } from "@/apollo/client";
import { CompaniesList } from "./companies-list";

export function CompaniesProvider() {
  const apolloClient = useApollo(null);

  return (
    <ApolloProvider client={apolloClient}>
      <CompaniesList />
    </ApolloProvider>
  );
}
