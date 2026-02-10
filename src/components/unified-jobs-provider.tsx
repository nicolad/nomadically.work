"use client";

import { useState } from "react";
import { Container, Box, Tabs } from "@radix-ui/themes";
import { SearchQueryBar } from "./SearchQueryBar";
import { SqlQueryInterface } from "./SqlQueryInterface";
import { JobsList } from "./jobs-list";

export function UnifiedJobsProvider() {
  const [searchFilter, setSearchFilter] = useState("");
  const [activeTab, setActiveTab] = useState("search");

  return (
    <Container size="4" py="6">
      <Tabs.Root value={activeTab} onValueChange={setActiveTab}>
        <Tabs.List>
          <Tabs.Trigger value="search">Search Jobs</Tabs.Trigger>
          <Tabs.Trigger value="sql">SQL Query</Tabs.Trigger>
        </Tabs.List>

        <Box mt="4">
          <Box style={{ display: activeTab === "search" ? "block" : "none" }}>
            <SearchQueryBar
              onSearchQueryChange={(q) => setSearchFilter(q)}
              onSearchSubmit={(q) => setSearchFilter(q)}
            />
          </Box>

          <Box style={{ display: activeTab === "sql" ? "block" : "none" }}>
            <SqlQueryInterface
              placeholder="e.g. Top 10 companies hiring React in the last 14 days"
              onDrilldownToSearch={(q) => {
                setSearchFilter(q);
                setActiveTab("search");
              }}
            />
          </Box>
        </Box>
      </Tabs.Root>

      <Box mt="4">
        <JobsList searchFilter={searchFilter} />
      </Box>
    </Container>
  );
}
