"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Badge,
  Button,
  Card,
  Container,
  Flex,
  Heading,
  Skeleton,
  Text,
} from "@radix-ui/themes";
import { MagicWandIcon } from "@radix-ui/react-icons";
import { useStudyTopicsQuery, useGenerateStudyTopicsForCategoryMutation } from "@/__generated__/hooks";
import { useAuth } from "@/lib/auth-hooks";
import { ADMIN_EMAIL } from "@/lib/constants";
import { StudyTopicModal } from "@/components/study/StudyTopicModal";

function difficultyColor(d: string) {
  if (d === "beginner") return "green" as const;
  if (d === "advanced") return "red" as const;
  return "blue" as const;
}

export default function StudyCategoryPage() {
  const params = useParams<{ category: string }>();
  const { category } = params;

  const { user } = useAuth();
  const isAdmin = user?.email === ADMIN_EMAIL;

  const { data, loading, refetch } = useStudyTopicsQuery({ variables: { category } });
  const topics = data?.studyTopics ?? [];

  const [generateTopics, { loading: generating }] = useGenerateStudyTopicsForCategoryMutation();
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);

  async function handleGenerate() {
    await generateTopics({ variables: { category } });
    refetch();
  }

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
      <Flex align="center" gap="2" mb="6">
        <Heading size="7" style={{ textTransform: "capitalize" }}>
          {category}
        </Heading>
        {isAdmin && (
          <Button
            size="1"
            variant="soft"
            color="violet"
            ml="auto"
            loading={generating}
            onClick={handleGenerate}
          >
            <MagicWandIcon /> Generate Topics
          </Button>
        )}
      </Flex>

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
          ))}
        </Flex>
      )}

      {selectedTopic && (
        <StudyTopicModal
          category={category}
          topic={selectedTopic}
          open={selectedTopic !== null}
          onOpenChange={(open) => { if (!open) setSelectedTopic(null); }}
        />
      )}
    </Container>
  );
}
