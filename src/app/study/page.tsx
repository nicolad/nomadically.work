"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Badge,
  Box,
  Button,
  Card,
  Container,
  Dialog,
  Flex,
  Heading,
  Select,
  Skeleton,
  Text,
  TextField,
} from "@radix-ui/themes";
import { PlusIcon, ReaderIcon } from "@radix-ui/react-icons";
import { useStudyCategoriesQuery, useCreateStudyTopicMutation } from "@/__generated__/hooks";
import { useAuth } from "@/lib/auth-hooks";
import { ADMIN_EMAIL } from "@/lib/constants";

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

function AddTopicModal({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState("");
  const [topic, setTopic] = useState("");
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [difficulty, setDifficulty] = useState("intermediate");

  const [createTopic, { loading }] = useCreateStudyTopicMutation();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await createTopic({
      variables: { category: category.trim(), topic: topic.trim(), title: title.trim(), summary: summary.trim() || undefined, difficulty },
    });
    setOpen(false);
    setCategory("");
    setTopic("");
    setTitle("");
    setSummary("");
    setDifficulty("intermediate");
    onCreated();
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger>
        <Button size="1" variant="soft" color="violet" ml="auto">
          <PlusIcon /> Add Topic
        </Button>
      </Dialog.Trigger>
      <Dialog.Content maxWidth="480px">
        <Dialog.Title>New Study Topic</Dialog.Title>
        <form onSubmit={handleSubmit}>
          <Flex direction="column" gap="3" mt="3">
            <label>
              <Text size="2" weight="medium" mb="1" as="p">Category</Text>
              <TextField.Root
                placeholder="e.g. react"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              />
            </label>
            <label>
              <Text size="2" weight="medium" mb="1" as="p">Topic slug</Text>
              <TextField.Root
                placeholder="e.g. use-effect-cleanup"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              />
            </label>
            <label>
              <Text size="2" weight="medium" mb="1" as="p">Title</Text>
              <TextField.Root
                placeholder="e.g. useEffect cleanup"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </label>
            <label>
              <Text size="2" weight="medium" mb="1" as="p">Summary</Text>
              <TextField.Root
                placeholder="One-line description (optional)"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
              />
            </label>
            <label>
              <Text size="2" weight="medium" mb="1" as="p">Difficulty</Text>
              <Select.Root value={difficulty} onValueChange={setDifficulty}>
                <Select.Trigger style={{ width: "100%" }} />
                <Select.Content>
                  <Select.Item value="beginner">Beginner</Select.Item>
                  <Select.Item value="intermediate">Intermediate</Select.Item>
                  <Select.Item value="advanced">Advanced</Select.Item>
                </Select.Content>
              </Select.Root>
            </label>
          </Flex>
          <Flex gap="2" justify="end" mt="4">
            <Dialog.Close>
              <Button variant="soft" color="gray" type="button">Cancel</Button>
            </Dialog.Close>
            <Button type="submit" loading={loading} disabled={loading}>
              Create
            </Button>
          </Flex>
        </form>
      </Dialog.Content>
    </Dialog.Root>
  );
}

export default function StudyIndexPage() {
  const { data, loading, refetch } = useStudyCategoriesQuery();
  const categories = data?.studyCategories ?? [];
  const { user } = useAuth();
  const isAdmin = user?.email === ADMIN_EMAIL;

  return (
    <Container size="3" p={{ initial: "4", md: "6" }}>
      <Flex align="center" gap="2" mb="2">
        <ReaderIcon width={22} height={22} style={{ color: "var(--violet-9)" }} />
        <Heading size="7">Study</Heading>
        {isAdmin && <AddTopicModal onCreated={() => refetch()} />}
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
