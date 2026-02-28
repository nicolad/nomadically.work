"use client";

import Link from "next/link";
import { Badge, Box, Card, Container, Flex, Heading, Skeleton, Text } from "@radix-ui/themes";
import { ReaderIcon } from "@radix-ui/react-icons";
import { useStudyCategoriesQuery } from "@/__generated__/hooks";

function categoryLabel(cat: string) {
  const labels: Record<string, string> = {
    react: "React",
    db: "Databases",
    algorithms: "Algorithms",
    "system-design": "System Design",
    behavioral: "Behavioral",
    typescript: "TypeScript",
  };
  return labels[cat] ?? cat.charAt(0).toUpperCase() + cat.slice(1);
}

function categoryDescription(cat: string) {
  const desc: Record<string, string> = {
    react: "Hooks, rendering, state management, and modern React patterns.",
    db: "Transactions, indexing, consistency, foreign keys, and query optimization.",
    algorithms: "Data structures, complexity, sorting, graphs, and dynamic programming.",
    "system-design": "Scalability, distributed systems, caching, and architecture patterns.",
    behavioral: "STAR format, conflict resolution, leadership, and impact storytelling.",
    typescript: "Types, generics, type narrowing, and advanced TS patterns.",
  };
  return desc[cat] ?? "Study topics and deep dives for interview preparation.";
}

export default function StudyIndexPage() {
  const { data, loading } = useStudyCategoriesQuery();
  const categories = data?.studyCategories ?? [];

  return (
    <Container size="3" p={{ initial: "4", md: "6" }}>
      <Flex align="center" gap="2" mb="2">
        <ReaderIcon width={22} height={22} style={{ color: "var(--violet-9)" }} />
        <Heading size="7">Study</Heading>
      </Flex>
      <Text color="gray" size="2" as="p" mb="6">
        Technical deep dives and concept explainers for interview prep.
      </Text>

      {loading ? (
        <Flex direction="column" gap="3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} height="88px" />
          ))}
        </Flex>
      ) : categories.length === 0 ? (
        <Text color="gray">No study categories yet.</Text>
      ) : (
        <Flex direction="column" gap="3">
          {categories.map((cat) => (
            <Link key={cat} href={`/study/${cat}`} style={{ textDecoration: "none" }}>
              <Card style={{ cursor: "pointer" }}>
                <Flex justify="between" align="center">
                  <Box>
                    <Heading size="4" mb="1">
                      {categoryLabel(cat)}
                    </Heading>
                    <Text color="gray" size="2">
                      {categoryDescription(cat)}
                    </Text>
                  </Box>
                  <Badge variant="soft" color="violet" size="1" style={{ flexShrink: 0, marginLeft: 12 }}>
                    {cat}
                  </Badge>
                </Flex>
              </Card>
            </Link>
          ))}
        </Flex>
      )}
    </Container>
  );
}
