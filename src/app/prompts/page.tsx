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
  TextField,
  TextArea,
  Select,
  Switch,
} from "@radix-ui/themes";
import {
  MagicWandIcon,
  CodeIcon,
  InfoCircledIcon,
  ExternalLinkIcon,
  PlusIcon,
  CheckIcon,
} from "@radix-ui/react-icons";
import { useQuery, useMutation, gql } from "@apollo/client";
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

const CREATE_PROMPT = gql`
  mutation CreatePrompt($input: CreatePromptInput!) {
    createPrompt(input: $input) {
      name
      version
      type
      labels
      tags
      createdBy
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
    <Card style={{ borderLeft: "3px solid var(--blue-9)" }}>
      <Box p="5">
        <Flex direction="column" gap="4">
          {/* Header */}
          <Flex justify="between" align="start" wrap="wrap" gap="3">
            <Flex direction="column" gap="2" style={{ flex: 1, minWidth: "250px" }}>
              <Flex align="center" gap="3" wrap="wrap">
                <Code size="3" variant="soft" highContrast>
                  {prompt.name}
                </Code>
                <Badge color="blue" variant="soft" size="2">
                  {prompt.category}
                </Badge>
                {prompt.usageCount !== undefined && prompt.usageCount > 0 && (
                  <Badge color="green" variant="soft" size="2">
                    {prompt.usageCount} {prompt.usageCount === 1 ? 'use' : 'uses'}
                  </Badge>
                )}
              </Flex>
              <Text size="2" color="gray" style={{ lineHeight: 1.6 }}>
                {prompt.description}
              </Text>
            </Flex>

            <Flex gap="2" align="center">
              <Button
                variant="surface"
                size="2"
                onClick={() => setIsExpanded(!isExpanded)}
                style={{ cursor: "pointer" }}
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
                <Text size="2" weight="bold" color="gray" style={{ textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "8px", display: "block" }}>
                  Fallback Text
                </Text>
                <Box mt="2" style={{ 
                  backgroundColor: "var(--gray-3)", 
                  borderRadius: "8px",
                  border: "1px solid var(--gray-6)",
                  padding: "16px",
                  maxHeight: "500px",
                  overflow: "auto",
                }}>
                  <Text size="2" style={{ whiteSpace: "pre-wrap", fontFamily: "var(--code-font-family)", lineHeight: 1.6 }}>
                    {prompt.fallbackText}
                  </Text>
                </Box>
              </Box>

              <Callout.Root color="blue" size="2">
                <Callout.Icon>
                  <InfoCircledIcon />
                </Callout.Icon>
                <Callout.Text>
                  <Strong>Langfuse Setup:</Strong> Create a prompt named <Code>"{prompt.name}"</Code> with label <Code>"production"</Code> in your Langfuse dashboard to override this fallback.
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

function CreatePromptForm({ onSuccess }: { onSuccess?: () => void }) {
  const { user } = useAuth();
  const [promptType, setPromptType] = useState<"text" | "chat">("text");
  const [name, setName] = useState("");
  const [textPrompt, setTextPrompt] = useState("");
  const [chatMessages, setChatMessages] = useState<Array<{ role: string; content: string }>>([
    { role: "system", content: "" },
    { role: "user", content: "" },
  ]);
  const [labels, setLabels] = useState("production");
  const [tags, setTags] = useState("");
  const [addToProduction, setAddToProduction] = useState(true);

  const [createPrompt, { loading, error }] = useMutation(CREATE_PROMPT, {
    refetchQueries: [{ query: GET_PROMPTS }],
    onCompleted: () => {
      // Reset form
      setName("");
      setTextPrompt("");
      setChatMessages([
        { role: "system", content: "" },
        { role: "user", content: "" },
      ]);
      setLabels("production");
      setTags("");
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
      name,
      type: promptType.toUpperCase(),
      labels: addToProduction ? ["production"] : labels.split(",").map(l => l.trim()).filter(Boolean),
      tags: tags.split(",").map(t => t.trim()).filter(Boolean),
    };

    if (promptType === "text") {
      input.prompt = textPrompt;
    } else {
      input.chatMessages = chatMessages.filter(m => m.content.trim());
    }

    try {
      await createPrompt({ variables: { input } });
    } catch (err) {
      console.error("Error creating prompt:", err);
    }
  };

  const addChatMessage = () => {
    setChatMessages([...chatMessages, { role: "user", content: "" }]);
  };

  const updateChatMessage = (index: number, field: "role" | "content", value: string) => {
    const updated = [...chatMessages];
    updated[index][field] = value;
    setChatMessages(updated);
  };

  const removeChatMessage = (index: number) => {
    setChatMessages(chatMessages.filter((_, i) => i !== index));
  };

  return (
    <Card>
      <Box p="5">
        <form onSubmit={handleSubmit}>
          <Flex direction="column" gap="4">
            <Flex align="center" gap="3">
              <PlusIcon width="20" height="20" />
              <Text size="4" weight="bold">
                Create New Prompt
              </Text>
            </Flex>

            {error && (
              <Callout.Root color="red">
                <Callout.Icon>
                  <InfoCircledIcon />
                </Callout.Icon>
                <Callout.Text>
                  <Strong>Error:</Strong> {error.message}
                </Callout.Text>
              </Callout.Root>
            )}

            <Separator size="4" />

            {/* Prompt Name */}
            <Flex direction="column" gap="2">
              <Text size="2" weight="bold">
                Prompt Name *
              </Text>
              <TextField.Root
                placeholder="e.g., movie-critic"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              <Text size="1" color="gray">
                Unique identifier for this prompt
              </Text>
            </Flex>

            {/* Prompt Type */}
            <Flex direction="column" gap="2">
              <Text size="2" weight="bold">
                Type *
              </Text>
              <Select.Root value={promptType} onValueChange={(value: any) => setPromptType(value)}>
                <Select.Trigger />
                <Select.Content>
                  <Select.Item value="text">Text Prompt</Select.Item>
                  <Select.Item value="chat">Chat Prompt</Select.Item>
                </Select.Content>
              </Select.Root>
            </Flex>

            {/* Text Prompt */}
            {promptType === "text" && (
              <Flex direction="column" gap="2">
                <Text size="2" weight="bold">
                  Prompt Text *
                </Text>
                <TextArea
                  placeholder="As a {{criticlevel}} critic, do you like {{movie}}?"
                  value={textPrompt}
                  onChange={(e) => setTextPrompt(e.target.value)}
                  rows={6}
                  required
                />
                <Text size="1" color="gray">
                  Use {`{{variable}}`} for dynamic placeholders
                </Text>
              </Flex>
            )}

            {/* Chat Messages */}
            {promptType === "chat" && (
              <Flex direction="column" gap="3">
                <Flex align="center" justify="between">
                  <Text size="2" weight="bold">
                    Chat Messages *
                  </Text>
                  <Button type="button" variant="soft" size="1" onClick={addChatMessage}>
                    <PlusIcon /> Add Message
                  </Button>
                </Flex>

                {chatMessages.map((msg, idx) => (
                  <Card key={idx}>
                    <Box p="3">
                      <Flex direction="column" gap="2">
                        <Flex gap="2" align="center">
                          <Select.Root
                            value={msg.role}
                            onValueChange={(value) => updateChatMessage(idx, "role", value)}
                          >
                            <Select.Trigger style={{ width: "120px" }} />
                            <Select.Content>
                              <Select.Item value="system">System</Select.Item>
                              <Select.Item value="user">User</Select.Item>
                              <Select.Item value="assistant">Assistant</Select.Item>
                            </Select.Content>
                          </Select.Root>
                          {chatMessages.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              color="red"
                              size="1"
                              onClick={() => removeChatMessage(idx)}
                            >
                              Remove
                            </Button>
                          )}
                        </Flex>
                        <TextArea
                          placeholder={`${msg.role} message content...`}
                          value={msg.content}
                          onChange={(e) => updateChatMessage(idx, "content", e.target.value)}
                          rows={3}
                        />
                      </Flex>
                    </Box>
                  </Card>
                ))}
                <Text size="1" color="gray">
                  Use {`{{variable}}`} in message content for dynamic placeholders
                </Text>
              </Flex>
            )}

            {/* Labels */}
            <Flex direction="column" gap="2">
              <Flex align="center" gap="2">
                <Text size="2" weight="bold">
                  Deploy to Production
                </Text>
                <Switch
                  checked={addToProduction}
                  onCheckedChange={setAddToProduction}
                />
              </Flex>
              {!addToProduction && (
                <>
                  <TextField.Root
                    placeholder="production, staging, development"
                    value={labels}
                    onChange={(e) => setLabels(e.target.value)}
                  />
                  <Text size="1" color="gray">
                    Comma-separated labels (e.g., production, staging)
                  </Text>
                </>
              )}
            </Flex>

            {/* Tags */}
            <Flex direction="column" gap="2">
              <Text size="2" weight="bold">
                Tags (optional)
              </Text>
              <TextField.Root
                placeholder="feature-x, experiment-a"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
              />
              <Text size="1" color="gray">
                Comma-separated tags for organization
              </Text>
            </Flex>

            <Separator size="4" />

            <Button type="submit" size="3" disabled={loading || !name || (promptType === "text" ? !textPrompt : chatMessages.every(m => !m.content.trim()))}>
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
            <Tabs.Trigger value="create">Create Prompt</Tabs.Trigger>
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
                </Flex>
              )}
            </Tabs.Content>

            <Tabs.Content value="create">
              <CreatePromptForm onSuccess={() => {
                // Could add a toast notification here
                console.log("Prompt created successfully!");
              }} />
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
