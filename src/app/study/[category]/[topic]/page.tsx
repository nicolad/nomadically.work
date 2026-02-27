"use client";

import { notFound } from "next/navigation";
import { useParams } from "next/navigation";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Badge, Box, Container, Flex, Heading, Skeleton, Text } from "@radix-ui/themes";
import { useStudyTopicQuery } from "@/__generated__/hooks";

export default function StudyTopicPage() {
  const params = useParams<{ category: string; topic: string }>();
  const { category, topic } = params;

  const { data, loading } = useStudyTopicQuery({
    variables: { category, topic },
  });

  if (loading) {
    return (
      <Container size="3" p={{ initial: "4", md: "6" }}>
        <Skeleton height="40px" mb="4" />
        <Skeleton height="24px" width="120px" mb="4" />
        <Skeleton height="400px" />
      </Container>
    );
  }

  if (!data?.studyTopic) {
    notFound();
  }

  const { title, difficulty, tags, bodyMd } = data.studyTopic;

  const difficultyColor =
    difficulty === "beginner"
      ? "green"
      : difficulty === "advanced"
        ? "red"
        : "blue";

  return (
    <Container size="3" p={{ initial: "4", md: "6" }}>
      <Box mb="4">
        <Link href={`/study/${category}`} style={{ color: "var(--accent-9)", textDecoration: "none" }}>
          ← Back to {category}
        </Link>
      </Box>

      <Heading size="7" mb="3">
        {title}
      </Heading>

      <Flex gap="2" align="center" mb="4" wrap="wrap">
        <Badge color={difficultyColor} size="2">
          {difficulty}
        </Badge>
        {tags.map((tag) => (
          <Badge key={tag} variant="outline" size="1">
            {tag}
          </Badge>
        ))}
      </Flex>

      {bodyMd && (
        <Box style={{ lineHeight: 1.7 }}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{bodyMd}</ReactMarkdown>
        </Box>
      )}
    </Container>
  );
}
