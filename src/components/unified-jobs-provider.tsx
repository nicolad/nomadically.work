"use client";

import { useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Container, Box, Flex, Badge, Text } from "@radix-ui/themes";
import { SearchQueryBar } from "./SearchQueryBar";
import { UserPreferences } from "./user-preferences";
import { JobsList } from "./jobs-list";
import { SourceFilter } from "./SourceFilter";

export function UnifiedJobsProvider() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchFilter = searchParams.get("q") ?? "";
  const remoteEuFilter = searchParams.get("remote_eu") === "1";
  const sourcesFilter = (searchParams.get("source") ?? "").split(",").filter(Boolean);

  const handleSearch = useCallback(
    (query: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (query.trim()) {
        params.set("q", query.trim());
      } else {
        params.delete("q");
      }
      params.delete("offset");
      router.push(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  const handleRemoteEuToggle = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (remoteEuFilter) {
      params.delete("remote_eu");
    } else {
      params.set("remote_eu", "1");
    }
    params.delete("offset");
    router.push(`?${params.toString()}`, { scroll: false });
  }, [router, searchParams, remoteEuFilter]);

  const handleSourcesChange = useCallback(
    (sources: string[]) => {
      const params = new URLSearchParams(searchParams.toString());
      if (sources.length > 0) {
        params.set("source", sources.join(","));
      } else {
        params.delete("source");
      }
      params.delete("offset");
      router.push(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  return (
    <Container size="4" py="4">
      <Box mb="5">
        <Text as="h1" size="5" weight="bold" mb="1" style={{ color: "var(--gray-12)", letterSpacing: "-0.02em" }}>
          remote EU jobs
        </Text>
        <Text as="p" size="2" style={{ color: "var(--gray-11)" }} mb="4">
          engineering and tech roles open to candidates in the EU
        </Text>
      </Box>
      <Box mb="4">
        <UserPreferences />
        <SearchQueryBar
          onSearchSubmit={handleSearch}
          initialQuery={searchFilter}
        />
        <Flex mt="2" gap="2" align="center" wrap="wrap">
          <Badge
            variant={remoteEuFilter ? "solid" : "outline"}
            color="green"
            style={{ cursor: "pointer", userSelect: "none" }}
            onClick={handleRemoteEuToggle}
          >
            remote EU only
          </Badge>
          <SourceFilter selected={sourcesFilter} onChange={handleSourcesChange} />
        </Flex>
      </Box>
      <Box mt="4">
        <JobsList searchFilter={searchFilter} isRemoteEu={remoteEuFilter} sourceTypes={sourcesFilter} />
      </Box>
    </Container>
  );
}
