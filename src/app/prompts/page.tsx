"use client";

import * as React from "react";
import { useState } from "react";
import {
  Container,
  Text,
  Heading,
  Flex,
  Card,
  Box,
  Badge,
  Button,
  Separator,
  Tabs,
  Code,
  Callout,
  Strong,
} from "@radix-ui/themes";
import {
  MagicWandIcon,
  CodeIcon,
  InfoCircledIcon,
  ExternalLinkIcon,
} from "@radix-ui/react-icons";
import { useQuery, gql } from "@apollo/client";
import { useAuth } from "@/auth/hooks";

const GET_PROMPTS = gql`
  query GetPrompts {
    prompts {
      name
      fallbackText
      description
      category
      usageCount
      lastUsedBy
    }
  }
`;

const GET_MY_PROMPT_USAGE = gql`
  query GetMyPromptUsage($limit: Int) {
    myPromptUsage(limit: $limit) {
      promptName
      userEmail
      version
      label
      usedAt
      traceId
    }
  }
`;

type PromptInfo = {
  name: string;
  fallbackText: string;
  description: string;
  category: string;
  usageCount?: number;
  lastUsedBy?: string | null;
};

function PromptCard({ prompt }: { prompt: PromptInfo }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <Card>
      <Box p="5">
        <Flex direction="column" gap="4">
          {/* Header */}
          <Flex justify="between" align="start">
            <Flex direction="column" gap="2">
              <Flex align="center" gap="3">
                <Code size="3" variant="soft">
                  {prompt.name}
                </Code>
                <Badge color="blue" variant="soft">
                  {prompt.category}
                </Badge>
                {prompt.usageCount !== undefined && prompt.usageCount > 0 && (
                  <Badge color="green" variant="soft">
                    {prompt.usageCount} uses
                  </Badge>
                )}
              </Flex>
              <Text size="2" color="gray">
                {prompt.description}
              </Text>
            </Flex>

            <Flex gap="2">
              <Button
                variant="soft"
                size="2"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                <CodeIcon />
                {isExpanded ? "Hide" : "View"} Prompt
              </Button>
            </Flex>
          </Flex>

          {/* Expanded Content */}
          {isExpanded && (
            <>
              <Separator size="4" />
              <Box>
                <Text size="1" weight="bold" style={{ textTransform: "uppercase", letterSpacing: "0.1em" }}>
                  Fallback Text
                </Text>
                <Box mt="2" style={{ 
                  backgroundColor: "var(--gray-2)", 
                  borderRadius: "8px",
                  padding: "12px",
                  maxHeight: "400px",
                  overflow: "auto",
                }}>
                  <Text size="2" style={{ whiteSpace: "pre-wrap", fontFamily: "monospace" }}>
                    {prompt.fallbackText}
                  </Text>
                </Box>
              </Box>

              <Callout.Root color="blue" size="1">
                <Callout.Icon>
                  <InfoCircledIcon />
                </Callout.Icon>
                <Callout.Text>
                  To manage this prompt in Langfuse:{" "}
                  <Strong>Create a prompt named "{prompt.name}"</Strong> with label "production"
                </Callout.Text>
              </Callout.Root>
            </>
          )}
        </Flex>
      </Box>
    </Card>
  );
}

function LangfuseSetupGuide() {
  return (
    <Card>
      <Box p="5">
        <Flex direction="column" gap="4">
          <Flex align="center" gap="3">
            <MagicWandIcon width="20" height="20" />
            <Text size="4" weight="bold">
              Langfuse Prompt Management
            </Text>
          </Flex>

          <Text size="2" color="gray" style={{ lineHeight: 1.6 }}>
            Langfuse provides centralized prompt management with version control, 
            no-code updates, and zero-latency caching. Prompts are managed in the 
            Langfuse UI and automatically fetched by your application.
          </Text>

          <Separator size="4" />

          <Flex direction="column" gap="3">
            <Text size="2" weight="bold">
              Quick Start:
            </Text>

            <Flex direction="column" gap="2">
              <Text size="2" color="gray">
                1. <Strong>Visit Langfuse UI</Strong> → Prompts → Create New Prompt
              </Text>
              <Text size="2" color="gray">
                2. <Strong>Name your prompt</Strong> (e.g., "job-classifier")
              </Text>
              <Text size="2" color="gray">
                3. <Strong>Add your prompt text</Strong> and save with label "production"
              </Text>
              <Text size="2" color="gray">
                4. <Strong>Your app fetches it automatically</Strong> with client-side caching
              </Text>
            </Flex>
          </Flex>

          <Separator size="4" />

          <Flex direction="column" gap="2">
            <Text size="2" weight="bold">
              Key Features:
            </Text>
            <Flex direction="column" gap="1">
              <Text size="2" color="gray">
                • <Strong>Version Control</Strong> - Track all prompt changes over time
              </Text>
              <Text size="2" color="gray">
                • <Strong>Labels</Strong> - Deploy different versions to production/staging
              </Text>
              <Text size="2" color="gray">
                • <Strong>Zero Latency</Strong> - Client-side caching for instant retrieval
              </Text>
              <Text size="2" color="gray">
                • <Strong>No-Code Updates</Strong> - Non-technical team members can iterate
              </Text>
              <Text size="2" color="gray">
                • <Strong>Linked Traces</Strong> - See performance by prompt version
              </Text>
            </Flex>
          </Flex>

          <Button
            variant="solid"
            size="3"
            style={{ marginTop: "8px" }}
            onClick={() => window.open(process.env.NEXT_PUBLIC_LANGFUSE_BASE_URL || "https://cloud.langfuse.com", "_blank")}
          >
            Open Langfuse Dashboard
            <ExternalLinkIcon />
          </Button>
        </Flex>
      </Box>
    </Card>
  );
}

function PromptUsageHistory() {
  const { user } = useAuth();
  const { loading, error, data } = useQuery(GET_MY_PROMPT_USAGE, {
    variables: { limit: 50 },
    skip: !user,
  });

  if (!user) {
    return (
      <Card>
        <Box p="6" style={{ textAlign: "center" }}>
          <Text size="3" color="gray">
            Sign in to view your prompt usage history
          </Text>
        </Box>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <Box p="6" style={{ textAlign: "center" }}>
          <Text size="3" color="gray">
            Loading usage history...
          </Text>
        </Box>
      </Card>
    );
  }

  if (error) {
    return (
      <Callout.Root color="red">
        <Callout.Icon>
          <InfoCircledIcon />
        </Callout.Icon>
        <Callout.Text>
          <Strong>Error loading usage history:</Strong> {error.message}
        </Callout.Text>
      </Callout.Root>
    );
  }

  const usageData = data?.myPromptUsage || [];

  if (usageData.length === 0) {
    return (
      <Card>
        <Box p="6" style={{ textAlign: "center" }}>
          <Text size="3" color="gray">
            No prompt usage history yet. Start using prompts to see them here.
          </Text>
        </Box>
      </Card>
    );
  }

  return (
    <Card>
      <Box p="5">
        <Flex direction="column" gap="4">
          <Flex align="center" justify="between">
            <Text size="4" weight="bold">
              Your Prompt Usage
            </Text>
            <Badge color="blue" variant="soft">
              {usageData.length} {usageData.length === 1 ? 'use' : 'uses'}
            </Badge>
          </Flex>

          <Separator size="4" />

          <Flex direction="column" gap="2">
            {usageData.map((usage: any, idx: number) => (
              <Box key={idx}>
                <Flex justify="between" align="center" gap="3" wrap="wrap">
                  <Flex direction="column" gap="1">
                    <Flex align="center" gap="2">
                      <Code size="2" variant="ghost">
                        {usage.promptName}
                      </Code>
                      {usage.version && (
                        <Badge size="1" color="gray" variant="surface">
                          v{usage.version}
                        </Badge>
                      )}
                      {usage.label && (
                        <Badge size="1" color="blue" variant="soft">
                          {usage.label}
                        </Badge>
                      )}
                    </Flex>
                    <Text size="1" color="gray">
                      {new Date(usage.usedAt).toLocaleString()}
                    </Text>
                  </Flex>
                </Flex>
                {idx < usageData.length - 1 && (
                  <Separator size="4" my="2" />
                )}
              </Box>
            ))}
          </Flex>
        </Flex>
      </Box>
    </Card>
  );
}

export default function PromptsPage() {
  const { user } = useAuth();
  const [skipLangfuse, setSkipLangfuse] = useState(
    process.env.NEXT_PUBLIC_SKIP_LANGFUSE_PROMPTS === "true"
  );

  const { loading, error, data } = useQuery(GET_PROMPTS);
  const REGISTERED_PROMPTS = data?.prompts || [];

  return (
    <Container size="4" p={{ initial: "4", md: "8" }}>
      <Flex direction="column" gap="6">
        <Flex direction="column" gap="2">
          <Flex align="center" justify="between">
            <Heading size="8">Prompt Management</Heading>
            {user && (
              <Flex align="center" gap="2">
                <Text size="2" color="gray">
                  Signed in as
                </Text>
                <Badge color="blue" variant="soft">
                  {user.email}
                </Badge>
              </Flex>
            )}
          </Flex>
          <Text size="3" color="gray">
            Centralized prompt storage, versioning, and deployment via Langfuse
          </Text>
        </Flex>

        {skipLangfuse && (
          <Callout.Root color="orange">
            <Callout.Icon>
              <InfoCircledIcon />
            </Callout.Icon>
            <Callout.Text>
              <Strong>Langfuse prompts are disabled.</Strong> Application is using fallback prompts only.
              Set SKIP_LANGFUSE_PROMPTS=false to enable remote prompt management.
            </Callout.Text>
          </Callout.Root>
        )}

        {error && (
          <Callout.Root color="red">
            <Callout.Icon>
              <InfoCircledIcon />
            </Callout.Icon>
            <Callout.Text>
              <Strong>Error loading prompts:</Strong> {error.message}
            </Callout.Text>
          </Callout.Root>
        )}

        <Tabs.Root defaultValue="prompts">
          <Tabs.List>
            <Tabs.Trigger value="prompts">Registered Prompts</Tabs.Trigger>
            <Tabs.Trigger value="usage">My Usage</Tabs.Trigger>
            <Tabs.Trigger value="setup">Setup Guide</Tabs.Trigger>
          </Tabs.List>

          <Box pt="5">
            <Tabs.Content value="prompts">
              {loading ? (
                <Card>
                  <Box p="6" style={{ textAlign: "center" }}>
                    <Text size="3" color="gray">
                      Loading prompts...
                    </Text>
                  </Box>
                </Card>
              ) : (
                <Flex direction="column" gap="4">
                  {REGISTERED_PROMPTS.map((prompt: PromptInfo) => (
                    <PromptCard key={prompt.name} prompt={prompt} />
                  ))}

                  {REGISTERED_PROMPTS.length === 0 && (
                    <Card>
                      <Box p="6" style={{ textAlign: "center" }}>
                        <Text size="3" color="gray">
                          No prompts registered yet. Add prompts to PROMPTS constant in{" "}
                          <Code>src/observability/prompts.ts</Code>
                        </Text>
                      </Box>
                    </Card>
                  )}
                </Flex>
              )}
            </Tabs.Content>

            <Tabs.Content value="usage">
              <PromptUsageHistory />
            </Tabs.Content>

            <Tabs.Content value="setup">
              <LangfuseSetupGuide />
            </Tabs.Content>
          </Box>
        </Tabs.Root>
      </Flex>
    </Container>
  );
}
