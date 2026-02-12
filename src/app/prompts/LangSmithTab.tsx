"use client";

import * as React from "react";
import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Card,
  Box,
  Flex,
  Text,
  Button,
  Separator,
  Tabs,
  Callout,
  Strong,
  TextField,
  TextArea,
  Switch,
  Badge,
  Code,
} from "@radix-ui/themes";
import {
  InfoCircledIcon,
  PlusIcon,
  CheckIcon,
  ExternalLinkIcon,
} from "@radix-ui/react-icons";
import { useAuth } from "@/auth/hooks";
import {
  useGetLangSmithPromptsQuery,
  useCreateLangSmithPromptMutation,
} from "@/__generated__/hooks";

function CreateLangSmithPromptForm({ onSuccess }: { onSuccess?: () => void }) {
  const { user } = useAuth();
  const [promptIdentifier, setPromptIdentifier] = useState("");
  const [description, setDescription] = useState("");
  const [readme, setReadme] = useState("");
  const [tags, setTags] = useState("");
  const [isPublic, setIsPublic] = useState(false);

  const [createPrompt, { loading, error }] = useCreateLangSmithPromptMutation({
    refetchQueries: ["GetLangSmithPrompts"],
    onCompleted: () => {
      // Reset form
      setPromptIdentifier("");
      setDescription("");
      setReadme("");
      setTags("");
      setIsPublic(false);
      onSuccess?.();
    },
  });

  if (!user) {
    return (
      <Card>
        <Box p="6" style={{ textAlign: "center" }}>
          <Text size="3" color="gray">
            Sign in to create prompts
          </Text>
        </Box>
      </Card>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const input: any = {
      description: description || undefined,
      readme: readme || undefined,
      tags: tags ? tags.split(",").map(t => t.trim()).filter(Boolean) : undefined,
      isPublic,
    };

    try {
      await createPrompt({
        variables: {
          promptIdentifier,
          input,
        },
      });
    } catch (err) {
      console.error("Error creating LangSmith prompt:", err);
    }
  };

  return (
    <Card>
      <Box p="5">
        <form onSubmit={handleSubmit}>
          <Flex direction="column" gap="4">
            <Flex align="center" gap="3">
              <PlusIcon width="20" height="20" />
              <Text size="4" weight="bold">
                Create New LangSmith Prompt
              </Text>
            </Flex>

            {error && (
              <Callout.Root color="red">
                <Callout.Icon>
                  <InfoCircledIcon />
                </Callout.Icon>
                <Callout.Text>
                  <Flex direction="column" gap="2">
                    <Text>
                      <Strong>Error:</Strong> {error.message}
                    </Text>
                    {(error.message.includes("Prompt Engineering") ||
                      error.message.includes("403") ||
                      error.message.includes("Forbidden")) && (
                      <Flex direction="column" gap="1">
                        <Text size="2">
                          <Strong>Fix Required:</Strong> Generate a new API key
                          with proper permissions:
                        </Text>
                        <Text size="1">
                          1. Go to{" "}
                          <a
                            href="https://smith.langchain.com/settings"
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ textDecoration: "underline" }}
                          >
                            LangSmith Settings
                          </a>
                        </Text>
                        <Text size="1">
                          2. Create API Key with: Read + Write + Prompt
                          Engineering
                        </Text>
                        <Text size="1">
                          3. Update LANGSMITH_API_KEY in .env.local
                        </Text>
                        <Text size="1">4. Restart development server</Text>
                        <Text size="1" color="gray" mt="1">
                          See LANGSMITH_SETUP.md for detailed instructions
                        </Text>
                      </Flex>
                    )}
                  </Flex>
                </Callout.Text>
              </Callout.Root>
            )}

            <Separator size="4" />

            {/* Prompt Identifier */}
            <Flex direction="column" gap="2">
              <Text size="2" weight="bold">
                Prompt Name *
              </Text>
              <TextField.Root
                placeholder="e.g., movie-critic"
                value={promptIdentifier}
                onChange={(e) => setPromptIdentifier(e.target.value)}
                required
              />
              <Text size="1" color="gray">
                Ownership is determined by your API key. Choose a unique name for your workspace.
              </Text>
            </Flex>

            {/* Description */}
            <Flex direction="column" gap="2">
              <Text size="2" weight="bold">
                Description
              </Text>
              <TextField.Root
                placeholder="Brief description of your prompt"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </Flex>

            {/* Readme */}
            <Flex direction="column" gap="2">
              <Text size="2" weight="bold">
                README
              </Text>
              <TextArea
                placeholder="Detailed documentation in Markdown..."
                value={readme}
                onChange={(e) => setReadme(e.target.value)}
                rows={6}
              />
              <Text size="1" color="gray">
                Markdown formatted documentation
              </Text>
            </Flex>

            {/* Tags */}
            <Flex direction="column" gap="2">
              <Text size="2" weight="bold">
                Tags
              </Text>
              <TextField.Root
                placeholder="tag1, tag2, tag3"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
              />
              <Text size="1" color="gray">
                Comma-separated tags for categorization
              </Text>
            </Flex>

            {/* Public Toggle */}
            <Flex direction="column" gap="2">
              <Flex align="center" gap="2">
                <Text size="2" weight="bold">
                  Make Public
                </Text>
                <Switch
                  checked={isPublic}
                  onCheckedChange={setIsPublic}
                />
              </Flex>
              <Text size="1" color="gray">
                Public prompts can be discovered and used by others
              </Text>
            </Flex>

            <Separator size="4" />

            <Button type="submit" size="3" disabled={loading || !promptIdentifier}>
              {loading ? (
                "Creating..."
              ) : (
                <>
                  <CheckIcon /> Create Prompt
                </>
              )}
            </Button>
          </Flex>
        </form>
      </Box>
    </Card>
  );
}

function LangSmithPromptsList() {
  const { loading, error, data } = useGetLangSmithPromptsQuery();
  // All prompts from the backend query
  const prompts = data?.langsmithPrompts || [];

  // Debug logging
  React.useEffect(() => {
    if (data?.langsmithPrompts) {
      console.log('LangSmith prompts loaded:', data.langsmithPrompts.length, data.langsmithPrompts);
    }
  }, [data]);

  if (loading) {
    return (
      <Card>
        <Box p="6" style={{ textAlign: "center" }}>
          <Text size="3" color="gray">
            Loading prompts...
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
          <Strong>Error loading prompts:</Strong> {error.message}
        </Callout.Text>
      </Callout.Root>
    );
  }

  if (prompts.length === 0 && !loading) {
    return (
      <Card>
        <Box p="6" style={{ textAlign: "center" }}>
          <Flex direction="column" gap="3">
            <Text size="3" color="gray">
              No prompts found.
            </Text>
            <Text size="2" color="gray">
              Create your first prompt to get started.
            </Text>
          </Flex>
        </Box>
      </Card>
    );
  }

  return (
    <Flex direction="column" gap="4">
      {prompts.map((prompt) => (
        <Card key={prompt.id} style={{ borderLeft: "3px solid var(--purple-9)" }}>
          <Box p="5">
            <Flex direction="column" gap="3">
              <Flex justify="between" align="start" wrap="wrap" gap="3">
                <Flex direction="column" gap="2" style={{ flex: 1, minWidth: "250px" }}>
                  <Flex align="center" gap="3" wrap="wrap">
                    <Code size="3" variant="soft" highContrast>
                      {prompt.fullName}
                    </Code>
                    {prompt.isPublic && (
                      <Badge color="green" variant="soft" size="2">
                        Public
                      </Badge>
                    )}
                    {prompt.isArchived && (
                      <Badge color="gray" variant="soft" size="2">
                        Archived
                      </Badge>
                    )}
                    {prompt.numCommits > 0 && (
                      <Badge color="purple" variant="soft" size="2">
                        {prompt.numCommits} {prompt.numCommits === 1 ? 'commit' : 'commits'}
                      </Badge>
                    )}
                  </Flex>
                  {prompt.description && (
                    <Text size="2" color="gray" style={{ lineHeight: 1.6 }}>
                      {prompt.description}
                    </Text>
                  )}
                  <Flex gap="3" wrap="wrap">
                    {prompt.numLikes > 0 && (
                      <Text size="1" color="gray">
                        ❤️ {prompt.numLikes}
                      </Text>
                    )}
                    {prompt.numDownloads > 0 && (
                      <Text size="1" color="gray">
                        ⬇️ {prompt.numDownloads}
                      </Text>
                    )}
                    {prompt.numViews > 0 && (
                      <Text size="1" color="gray">
                        👁️ {prompt.numViews}
                      </Text>
                    )}
                  </Flex>
                </Flex>

                <Flex gap="2" align="center">
                  <Button
                    variant="soft"
                    size="2"
                    onClick={() => {
                      const langsmithUrl = "https://smith.langchain.com";
                      window.open(`${langsmithUrl}/hub/${prompt.fullName}`, "_blank");
                    }}
                  >
                    <ExternalLinkIcon />
                    View in LangSmith
                  </Button>
                </Flex>
              </Flex>

              {prompt.tags && prompt.tags.length > 0 && (
                <>
                  <Separator size="4" />
                  <Flex gap="2" wrap="wrap">
                    {prompt.tags.map((tag, idx) => (
                      <Badge key={idx} color="purple" variant="surface" size="1">
                        {tag}
                      </Badge>
                    ))}
                  </Flex>
                </>
              )}
            </Flex>
          </Box>
        </Card>
      ))}
    </Flex>
  );
}

function LangSmithSetupGuide() {
  return (
    <Card>
      <Box p="5">
        <Flex direction="column" gap="4">
          <Flex align="center" gap="3">
            <InfoCircledIcon width="20" height="20" />
            <Text size="4" weight="bold">
              LangSmith Prompt Hub
            </Text>
          </Flex>

          <Text size="2" color="gray" style={{ lineHeight: 1.6 }}>
            LangSmith provides a centralized prompt hub for versioning, sharing, and 
            collaborating on prompts. Create prompt repositories and manage versions 
            through commits.
          </Text>

          <Separator size="4" />

          <Flex direction="column" gap="3">
            <Text size="2" weight="bold">
              Quick Start:
            </Text>

            <Callout.Root color="orange">
              <Callout.Icon>
                <InfoCircledIcon />
              </Callout.Icon>
              <Callout.Text>
                <Flex direction="column" gap="1">
                  <Text size="2" weight="bold">
                    API Key Permissions Required
                  </Text>
                  <Text size="2">
                    Your LangSmith API key must have these scopes:
                  </Text>
                  <Text size="1">✓ Read</Text>
                  <Text size="1">✓ Write</Text>
                  <Text size="1">✓ Prompt Engineering (required for creating prompts)</Text>
                  <Text size="1" mt="2">
                    Generate key at:{" "}
                    <a
                      href="https://smith.langchain.com/settings"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ textDecoration: "underline" }}
                    >
                      LangSmith Settings → API Keys
                    </a>
                  </Text>
                </Flex>
              </Callout.Text>
            </Callout.Root>

            <Flex direction="column" gap="2">
              <Text size="2" color="gray">
                1. <Strong>Generate API key</Strong> with all required permissions
              </Text>
              <Text size="2" color="gray">
                2. <Strong>Add to .env.local:</Strong>{" "}
                <Code size="1">LANGSMITH_API_KEY="lsv2_sk_..."</Code>
              </Text>
              <Text size="2" color="gray">
                3. <Strong>Restart dev server</Strong> to load new key
              </Text>
              <Text size="2" color="gray">
                4. <Strong>Create a prompt</Strong> with a unique identifier
              </Text>
              <Text size="2" color="gray">
                5. <Strong>Push commits</Strong> to version your prompt changes
              </Text>
            </Flex>
          </Flex>

          <Separator size="4" />

          <Flex direction="column" gap="2">
            <Text size="2" weight="bold">
              Verify Setup:
            </Text>
            <Text size="2" color="gray">
              Run the diagnostic script to test your API key:
            </Text>
            <Code size="2" variant="soft">
              pnpm exec tsx scripts/test-langsmith-connection.ts
            </Code>
            <Text size="1" color="gray" mt="1">
              This will verify your API key has all required permissions.
            </Text>
          </Flex>

          <Separator size="4" />

          <Flex direction="column" gap="2">
            <Text size="2" weight="bold">
              Key Features:
            </Text>
            <Flex direction="column" gap="1">
              <Text size="2" color="gray">
                • <Strong>Version Control</Strong> - Git-like commits for prompt history
              </Text>
              <Text size="2" color="gray">
                • <Strong>Prompt Hub</Strong> - Discover and share prompts with the community
              </Text>
              <Text size="2" color="gray">
                • <Strong>Team Collaboration</Strong> - Work together on prompt engineering
              </Text>
              <Text size="2" color="gray">
                • <Strong>Integration</Strong> - Pull prompts directly in your code
              </Text>
            </Flex>
          </Flex>

          <Button
            variant="solid"
            size="3"
            style={{ marginTop: "8px" }}
            onClick={() => window.open("https://smith.langchain.com", "_blank")}
          >
            Open LangSmith Dashboard
            <ExternalLinkIcon />
          </Button>
        </Flex>
      </Box>
    </Card>
  );
}

function LangSmithTabContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data } = useGetLangSmithPromptsQuery();
  const activeSubTab = searchParams.get('tab') || 'prompts';
  
  // All prompts for the count
  const userPrompts = data?.langsmithPrompts || [];

  const handleTabChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', value);
    router.push(`?${params.toString()}`);
  };

  return (
    <Tabs.Root value={activeSubTab} onValueChange={handleTabChange}>
      <Tabs.List>
        <Tabs.Trigger value="prompts">
          Prompts
          {userPrompts.length > 0 && (
            <Badge ml="2" size="1" color="purple" variant="soft">
              {userPrompts.length}
            </Badge>
          )}
        </Tabs.Trigger>
        <Tabs.Trigger value="create">Create Prompt</Tabs.Trigger>
        <Tabs.Trigger value="setup">Setup Guide</Tabs.Trigger>
      </Tabs.List>

      <Box pt="5">
        <Tabs.Content value="prompts">
          <LangSmithPromptsList />
        </Tabs.Content>

        <Tabs.Content value="create">
          <CreateLangSmithPromptForm onSuccess={() => {
            console.log("LangSmith prompt created successfully!");
          }} />
        </Tabs.Content>

        <Tabs.Content value="setup">
          <LangSmithSetupGuide />
        </Tabs.Content>
      </Box>
    </Tabs.Root>
  );
}

export function LangSmithTab() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LangSmithTabContent />
    </Suspense>
  );
}
