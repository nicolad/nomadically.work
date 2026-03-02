"use client";

import {
  Heading,
  Flex,
  Text,
  Box,
  Card,
  Badge,
  Skeleton,
} from "@radix-ui/themes";
import { useStudyTopicsQuery } from "@/__generated__/hooks";
import Link from "next/link";
import type { TabBaseProps } from "./types";

export function StudyTab(_props: TabBaseProps) {
  const { data: studyData, loading: studyLoading } = useStudyTopicsQuery({
    variables: { category: "application-prep" },
  });

  return (
    <Card size="3">
      <Flex justify="between" align="center" mb="3">
        <Heading size="4">Study Topics</Heading>
        <Badge color="blue" size="1">{studyData?.studyTopics?.length ?? 0} topics</Badge>
      </Flex>

      {studyLoading ? (
        <Flex direction="column" gap="2">
          {[...Array(3)].map((_, i) => <Skeleton key={i} height="80px" />)}
        </Flex>
      ) : !studyData?.studyTopics?.length ? (
        <Text size="2" color="gray">No study topics generated yet.</Text>
      ) : (
        <Flex direction="column" gap="2">
          {studyData.studyTopics.map((topic) => (
            <Link
              key={topic.topic}
              href={`/study/application-prep/${topic.topic}`}
              style={{ textDecoration: "none" }}
            >
              <Card variant="surface" style={{ cursor: "pointer" }}>
                <Flex justify="between" align="start" gap="3">
                  <Box style={{ flex: 1 }}>
                    <Flex align="center" gap="2" mb="1">
                      <Text size="2" weight="bold" style={{ color: "var(--accent-11)" }}>
                        {topic.title}
                      </Text>
                    </Flex>
                    {topic.summary && (
                      <Text size="1" color="gray" as="p" style={{ margin: 0, lineHeight: 1.4 }}>
                        {topic.summary.length > 180 ? topic.summary.slice(0, 180) + "\u2026" : topic.summary}
                      </Text>
                    )}
                    <Flex gap="1" mt="2" wrap="wrap">
                      <Badge
                        size="1"
                        color={topic.difficulty === "advanced" ? "red" : topic.difficulty === "intermediate" ? "orange" : "green"}
                      >
                        {topic.difficulty}
                      </Badge>
                      {topic.tags.slice(0, 4).map((tag) => (
                        <Badge key={tag} size="1" variant="outline" color="gray">{tag}</Badge>
                      ))}
                    </Flex>
                  </Box>
                  <Text size="1" color="gray" style={{ whiteSpace: "nowrap" }}>
                    {topic.bodyMd ? `${Math.round((topic.bodyMd.length / 1000))}k chars` : ""}
                  </Text>
                </Flex>
              </Card>
            </Link>
          ))}
        </Flex>
      )}
    </Card>
  );
}
