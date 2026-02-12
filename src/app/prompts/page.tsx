"use client";

import * as React from "react";
import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Container,
  Text,
  Heading,
  Flex,
  Box,
  Badge,
  Button,
  Tabs,
  Callout,
  Strong,
} from "@radix-ui/themes";
import {
  InfoCircledIcon,
  ExternalLinkIcon,
} from "@radix-ui/react-icons";
import { useAuth } from "@/auth/hooks";
import { useGetPromptsQuery } from "@/__generated__/hooks";
import { LangfuseTab } from "./LangfuseTab";
import { LangSmithTab } from "./LangSmithTab";

function PromptsPageContent() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get('provider') || 'langfuse';
  
  const [skipLangfuse, setSkipLangfuse] = useState(
    process.env.NEXT_PUBLIC_SKIP_LANGFUSE_PROMPTS === "true"
  );

  const { loading, error, data } = useGetPromptsQuery();

  const handleTabChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('provider', value);
    // Remove subtab param when switching providers
    params.delete('tab');
    router.push(`?${params.toString()}`);
  };

  return (
    <Container size="4" p={{ initial: "4", md: "8" }}>
      <Flex direction="column" gap="6">
        <Flex direction="column" gap="2">
          <Flex align="center" justify="between">
            <Heading size="8">Prompt Management</Heading>
            <Flex align="center" gap="3">
              <Button
                variant="soft"
                size="2"
                onClick={() => window.open(process.env.NEXT_PUBLIC_LANGFUSE_BASE_URL || "https://cloud.langfuse.com", "_blank")}
              >
                <ExternalLinkIcon />
                Open Langfuse
              </Button>
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

        <Tabs.Root value={activeTab} onValueChange={handleTabChange}>
          <Tabs.List>
            <Tabs.Trigger value="langfuse">Langfuse</Tabs.Trigger>
            <Tabs.Trigger value="langsmith">LangSmith</Tabs.Trigger>
          </Tabs.List>

          <Box pt="5">
            <Tabs.Content value="langfuse">
              <LangfuseTab />
            </Tabs.Content>

            <Tabs.Content value="langsmith">
              <LangSmithTab />
            </Tabs.Content>
          </Box>
        </Tabs.Root>
      </Flex>
    </Container>
  );
}

export default function PromptsPage() {
  return (
    <Suspense fallback={
      <Container size="4" p={{ initial: "4", md: "8" }}>
        <Flex direction="column" gap="6">
          <Heading size="8">Prompt Management</Heading>
          <Text size="3" color="gray">
            Loading...
          </Text>
        </Flex>
      </Container>
    }>
      <PromptsPageContent />
    </Suspense>
  );
}
