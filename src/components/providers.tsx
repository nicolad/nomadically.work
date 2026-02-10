"use client";

import { ApolloProvider, useApollo } from "@/apollo/client";

type Props = {
  children: React.ReactNode;
};

export function Providers({ children }: Props) {
  const apolloClient = useApollo(null);

  return <ApolloProvider client={apolloClient}>{children}</ApolloProvider>;
}
