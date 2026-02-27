"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Badge,
  Box,
  Card,
  Container,
  Dialog,
  Flex,
  Heading,
  ScrollArea,
  Skeleton,
  Text,
} from "@radix-ui/themes";
import { Cross2Icon } from "@radix-ui/react-icons";
import { useStudyTopicsQuery, useStudyTopicQuery } from "@/__generated__/hooks";

function difficultyColor(d: string) {
  if (d === "beginner") return "green" as const;
  if (d === "advanced") return "red" as const;
  return "blue" as const;
}

function TopicDialog({
  category,
  topic,
  onClose,
}: {
  category: string;
  topic: string;
  onClose: () => void;
}) {
  const { data, loading } = useStudyTopicQuery({ variables: { category, topic } });
  const t = data?.studyTopic;

  return (
    <Dialog.Root open onOpenChange={(open) => { if (!open) onClose(); }}>
      <Dialog.Content
        maxWidth="780px"
        style={{ maxHeight: "85vh", display: "flex", flexDirection: "column" }}
      >
        {loading || !t ? (
          <Flex direction="column" gap="3" p="2">
            <Skeleton height="32px" width="60%" />
            <Skeleton height="20px" width="30%" />
            <Skeleton height="300px" />
          </Flex>
        ) : (
          <>
            <Flex justify="between" align="start" mb="3" gap="4">
              <Flex direction="column" gap="2" style={{ flex: 1, minWidth: 0 }}>
                <Dialog.Title size="6" mb="0">{t.title}</Dialog.Title>
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
              </Flex>
              <Dialog.Close>
                <Box
                  style={{ cursor: "pointer", color: "var(--gray-9)", flexShrink: 0, marginTop: 2 }}
                  onClick={onClose}
                >
                  <Cross2Icon width={16} height={16} />
                </Box>
              </Dialog.Close>
            </Flex>

            <ScrollArea style={{ flex: 1 }} scrollbars="vertical">
              {t.bodyMd && (
                <Box style={{ lineHeight: 1.7, paddingRight: 8 }}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{t.bodyMd}</ReactMarkdown>
                </Box>
              )}
            </ScrollArea>
          </>
        )}
      </Dialog.Content>
    </Dialog.Root>
  );
}

export default function StudyCategoryPage() {
  const params = useParams<{ category: string }>();
  const { category } = params;
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);

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
      <Heading size="7" mb="6" style={{ textTransform: "capitalize" }}>
        {category}
      </Heading>

      {topics.length === 0 ? (
        <Text color="gray">No topics in this category yet.</Text>
      ) : (
        <Flex direction="column" gap="3">
          {topics.map((t) => (
            <Card
              key={t.id}
              style={{ cursor: "pointer" }}
              onClick={() => setSelectedTopic(t.topic)}
            >
              <Heading size="4" mb="1">{t.title}</Heading>
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
          ))}
        </Flex>
      )}

      {selectedTopic && (
        <TopicDialog
          category={category}
          topic={selectedTopic}
          onClose={() => setSelectedTopic(null)}
        />
      )}
    </Container>
  );
}
