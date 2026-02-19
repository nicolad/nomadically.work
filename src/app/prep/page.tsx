"use client";

import * as React from "react";
import { useState, Suspense } from "react";
import {
  Container,
  Heading,
  Text,
  Flex,
  Card,
  Badge,
  Button,
  Dialog,
  TextField,
  Select,
} from "@radix-ui/themes";
import { PlayIcon, PlusIcon } from "@radix-ui/react-icons";
import {
  useGetTracksQuery,
  useCreateTrackMutation,
} from "@/__generated__/hooks";

function AddTrackDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [slug, setSlug] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [level, setLevel] = useState("beginner");

  const [createTrack, { loading }] = useCreateTrackMutation({
    onCompleted() {
      setOpen(false);
      setSlug("");
      setTitle("");
      setDescription("");
      setLevel("beginner");
      onCreated();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!slug || !title) return;
    createTrack({
      variables: {
        input: { slug, title, description: description || undefined, level },
      },
    });
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger>
        <Button size="2">
          <PlusIcon />
          Add Track
        </Button>
      </Dialog.Trigger>
      <Dialog.Content maxWidth="480px">
        <Dialog.Title>New Track</Dialog.Title>
        <Dialog.Description size="2" color="gray" mb="4">
          Create a new learning track for interview preparation.
        </Dialog.Description>
        <form onSubmit={handleSubmit}>
          <Flex direction="column" gap="3">
            <label>
              <Text size="2" weight="medium" mb="1" as="div">
                Title *
              </Text>
              <TextField.Root
                placeholder="e.g. System Design"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </label>
            <label>
              <Text size="2" weight="medium" mb="1" as="div">
                Slug *
              </Text>
              <TextField.Root
                placeholder="e.g. system-design"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                required
              />
            </label>
            <label>
              <Text size="2" weight="medium" mb="1" as="div">
                Description
              </Text>
              <TextField.Root
                placeholder="Short description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </label>
            <label>
              <Text size="2" weight="medium" mb="1" as="div">
                Level
              </Text>
              <Select.Root value={level} onValueChange={setLevel}>
                <Select.Trigger style={{ width: "100%" }} />
                <Select.Content>
                  <Select.Item value="beginner">Beginner</Select.Item>
                  <Select.Item value="intermediate">Intermediate</Select.Item>
                  <Select.Item value="advanced">Advanced</Select.Item>
                </Select.Content>
              </Select.Root>
            </label>
          </Flex>
          <Flex gap="3" mt="5" justify="end">
            <Dialog.Close>
              <Button variant="soft" color="gray" type="button">
                Cancel
              </Button>
            </Dialog.Close>
            <Button type="submit" disabled={loading || !slug || !title}>
              {loading ? "Creating…" : "Create Track"}
            </Button>
          </Flex>
        </form>
      </Dialog.Content>
    </Dialog.Root>
  );
}

function PrepPageContent() {
  const { loading, error, data, refetch } = useGetTracksQuery();

  if (loading) {
    return (
      <Container size="4" p={{ initial: "4", md: "8" }}>
        <Text color="gray">Loading tracks...</Text>
      </Container>
    );
  }

  if (error) {
    return (
      <Container size="4" p={{ initial: "4", md: "8" }}>
        <Text color="red">Error loading tracks: {error.message}</Text>
      </Container>
    );
  }

  const tracks = data?.tracks || [];

  return (
    <Container size="4" p={{ initial: "4", md: "8" }}>
      <Flex direction="column" gap="6">
        <Flex direction="column" gap="2">
          <Heading size="8">Interview Prep</Heading>
          <Text color="gray" size="3">
            Structured learning tracks to help you prepare for your next role
          </Text>
        </Flex>

        <Flex justify="end">
          <AddTrackDialog onCreated={() => refetch()} />
        </Flex>

        {tracks.length === 0 ? (
          <Card size="3">
            <Text color="gray">No tracks available yet.</Text>
          </Card>
        ) : (
          <Flex direction="column" gap="4">
            {tracks.map((track) => (
              <Card key={track.id} size="3">
                <Flex direction="column" gap="3">
                  <Flex justify="between" align="start">
                    <Flex direction="column" gap="2">
                      <Heading size="5">{track.title}</Heading>
                      <Text color="gray" size="2">
                        {track.description}
                      </Text>
                    </Flex>
                    {track.level && (
                      <Badge color="blue" variant="soft">
                        {track.level}
                      </Badge>
                    )}
                  </Flex>

                  {track.items.length > 0 && (
                    <Flex direction="column" gap="1">
                      <Text size="1" color="gray" weight="medium">
                        {track.items.length}{" "}
                        {track.items.length === 1 ? "module" : "modules"}
                      </Text>
                    </Flex>
                  )}

                  <Flex gap="2">
                    <Button size="2" variant="soft">
                      <PlayIcon />
                      Start Track
                    </Button>
                  </Flex>
                </Flex>
              </Card>
            ))}
          </Flex>
        )}
      </Flex>
    </Container>
  );
}

export default function PrepPage() {
  return (
    <Suspense
      fallback={
        <Container size="4" p="8">
          <Text color="gray">Loading tracks...</Text>
        </Container>
      }
    >
      <PrepPageContent />
    </Suspense>
  );
}
