"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Badge,
  Card,
  Container,
  Flex,
  Heading,
  Skeleton,
  Text,
} from "@radix-ui/themes";
import { useStudyTopicsQuery } from "@/__generated__/hooks";

function difficultyColor(d: string) {
  if (d === "beginner") return "green" as const;
  if (d === "advanced") return "red" as const;
  return "blue" as const;
}

export default function StudyCategoryPage() {
  const params = useParams<{ category: string }>();
  const { category } = params;

  const { data, loading } = useStudyTopicsQuery({ variables: { category } });
  const topics = data?.studyTopics ?? [];

  if (loading) {
    return (
      <Container size="3" p={{ initial: "4", md: "6" }}>
        <Skeleton height="40px" mb="6" />
        <Flex direction="column" gap="3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} height="100px" />
          ))}
        </Flex>
      </Container>
    );
  }

  return (
    <Container size="3" p={{ initial: "4", md: "6" }}>
      <Text size="2" mb="2" as="p">
        <Link href="/study" style={{ color: "var(--accent-9)", textDecoration: "none" }}>
          ← Study
        </Link>
      </Text>
      <Heading size="7" mb="6" style={{ textTransform: "capitalize" }}>
        {category}
      </Heading>

      {topics.length === 0 ? (
        <Text color="gray">No topics in this category yet.</Text>
      ) : (
        <Flex direction="column" gap="3">
          {topics.map((t) => (
            <Link
              key={t.id}
              href={`/study/${category}/${t.topic}`}
              style={{ textDecoration: "none" }}
            >
              <Card style={{ cursor: "pointer" }}>
                <Heading size="4" mb="1">
                  {t.title}
                </Heading>
                {t.summary && (
                  <Text color="gray" size="2" mb="2" as="p">
                    {t.summary}
                  </Text>
                )}
                <Flex gap="2" wrap="wrap">
                  <Badge color={difficultyColor(t.difficulty)} size="1">
                    {t.difficulty}
                  </Badge>
                  {t.tags.map((tag) => (
                    <Badge key={tag} variant="outline" size="1">
                      {tag}
                    </Badge>
                  ))}
                </Flex>
              </Card>
            </Link>
          ))}
        </Flex>
      )}
    </Container>
  );
}
