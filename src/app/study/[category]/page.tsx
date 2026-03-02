"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Badge,
  Button,
  Card,
  Container,
  Dialog,
  Flex,
  Heading,
  Skeleton,
  Text,
  TextArea,
  TextField,
} from "@radix-ui/themes";
import { MagicWandIcon, PlusIcon } from "@radix-ui/react-icons";
import {
  useStudyTopicsQuery,
  useGenerateStudyTopicsForCategoryMutation,
  useCreateStudyTopicMutation,
} from "@/__generated__/hooks";
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
  const [createTopic, { loading: creating, error: createError }] = useCreateStudyTopicMutation();
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ topic: "", title: "", summary: "", tags: "" });

  const derivedSlug = form.topic || form.title.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

  async function handleGenerate() {
    await generateTopics({ variables: { category } });
    refetch();
  }

  async function handleCreate() {
    const tags = form.tags.split(",").map((t) => t.trim()).filter(Boolean);
    const result = await createTopic({
      variables: { category, topic: derivedSlug, title: form.title, summary: form.summary, tags },
    });
    if (result.data) {
      setAddOpen(false);
      setForm({ topic: "", title: "", summary: "", tags: "" });
      refetch();
    }
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
          <Flex gap="2" ml="auto">
            <Button size="1" variant="soft" color="gray" onClick={() => setAddOpen(true)}>
              <PlusIcon /> Add Topic
            </Button>
            <Button size="1" variant="soft" color="violet" loading={generating} onClick={handleGenerate}>
              <MagicWandIcon /> Generate Topics
            </Button>
          </Flex>
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

      <Dialog.Root open={addOpen} onOpenChange={(open) => { setAddOpen(open); if (!open) setForm({ topic: "", title: "", summary: "", tags: "" }); }}>
        <Dialog.Content maxWidth="480px">
          <Dialog.Title>Add Topic</Dialog.Title>
          <Flex direction="column" gap="4" mt="4">
            <Flex direction="column" gap="1">
              <Text size="2" weight="medium">Title</Text>
              <TextField.Root
                placeholder="e.g. Row Level Security"
                value={form.title}
                autoFocus
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); }}
              />
            </Flex>
            <Flex direction="column" gap="1">
              <Flex align="center" justify="between">
                <Text size="2" weight="medium">Slug</Text>
                {derivedSlug && (
                  <Text size="1" color="gray" style={{ fontFamily: "monospace" }}>{derivedSlug}</Text>
                )}
              </Flex>
              <TextField.Root
                placeholder="auto-derived from title"
                value={form.topic}
                onChange={(e) => setForm((f) => ({ ...f, topic: e.target.value }))}
              />
            </Flex>
            <Flex direction="column" gap="1">
              <Text size="2" weight="medium">Summary</Text>
              <TextArea
                placeholder="Short description (optional)"
                value={form.summary}
                rows={3}
                onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))}
              />
            </Flex>
            <Flex direction="column" gap="1">
              <Text size="2" weight="medium">Tags</Text>
              <TextField.Root
                placeholder="postgres, security, rls"
                value={form.tags}
                onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
                onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); }}
              />
            </Flex>
            {createError && (
              <Text size="2" color="red">{createError.message}</Text>
            )}
          </Flex>
          <Flex gap="2" justify="end" mt="5">
            <Dialog.Close>
              <Button variant="soft" color="gray">Cancel</Button>
            </Dialog.Close>
            <Button loading={creating} onClick={handleCreate}>
              Create
            </Button>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>
    </Container>
  );
}
