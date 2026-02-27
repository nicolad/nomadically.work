"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { Badge, Box, Card, Container, Flex, Heading, Skeleton, Text } from "@radix-ui/themes";
import { useStudyTopicsQuery } from "@/__generated__/hooks";

export default function StudyCategoryPage() {
  const params = useParams<{ category: string }>();
  const { category } = params;

  const { data, loading } = useStudyTopicsQuery({
    variables: { category },
  });

  if (loading) {
    return (
      <Container size="3" p={{ initial: "4", md: "6" }}>
        <Skeleton height="40px" mb="6" />
        <Flex direction="column" gap="3">
          <Skeleton height="100px" />
          <Skeleton height="100px" />
          <Skeleton height="100px" />
        </Flex>
      </Container>
    );
  }

  const topics = data?.studyTopics ?? [];

  return (
    <Container size="3" p={{ initial: "4", md: "6" }}>
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
              style={{ textDecoration: "none", color: "inherit" }}
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
                  <Badge
                    color={
                      t.difficulty === "beginner"
                        ? "green"
                        : t.difficulty === "advanced"
                          ? "red"
                          : "blue"
                    }
                    size="1"
                  >
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
