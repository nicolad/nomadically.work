"use client";

import * as React from "react";
import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
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
  CopyIcon,
} from "@radix-ui/react-icons";
import { useAuth } from "@/auth/hooks";
import {
  useGetPromptsQuery,
  useGetMyPromptUsageQuery,
  useCreatePromptMutation,
  GetPromptsQuery,
} from "@/__generated__/hooks";

type PromptInfo = GetPromptsQuery['prompts'][0];

function PromptCard({ prompt }: { prompt: PromptInfo }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  // Extract user-friendly name (remove email prefix if present)
  const displayName = prompt.name.includes('__') 
    ? prompt.name.split('__')[1] 
    : prompt.name;

  // Derive category from tags if available
  const category = prompt.tags.find((tag: string) => 
    tag.startsWith('category:')
  )?.replace('category:', '') || "general";

  // Extract project ID from Langfuse public key (format: pk-lf-{projectId}-{hash})
  const getLangfuseProjectId = () => {
    const publicKey = process.env.NEXT_PUBLIC_LANGFUSE_PUBLIC_KEY;
    if (publicKey) {
      const parts = publicKey.split('-');
      return parts[2] || null;
    }
    return null;
  };

  const handleCopyPrompt = async () => {
    try {
      let textToCopy = '';
      
      if (prompt.type === 'text') {
        textToCopy = prompt.content || '';
      } else {
        // For chat prompts, format as readable text
        if (Array.isArray(prompt.content)) {
          textToCopy = prompt.content
            .map((msg: any) => `[${msg.role.toUpperCase()}]\n${msg.content}`)
            .join('\n\n');
        }
      }
      
      await navigator.clipboard.writeText(textToCopy);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <Card style={{ borderLeft: "3px solid var(--blue-9)" }}>
      <Box p="5">
        <Flex direction="column" gap="4">
          {/* Header */}
          <Flex justify="between" align="start" wrap="wrap" gap="3">
            <Flex direction="column" gap="2" style={{ flex: 1, minWidth: "250px" }}>
              <Flex align="center" gap="3" wrap="wrap">
                <Code size="3" variant="soft" highContrast>
                  {displayName}
                </Code>
                <Badge color="blue" variant="soft" size="2">
                  {category}
                </Badge>
                <Badge color="purple" variant="soft" size="2">
                  {prompt.type}
                </Badge>
                {prompt.versions && prompt.versions.length > 0 && (
                  <Badge color="gray" variant="soft" size="2">
                    v{Math.max(...prompt.versions)}
                  </Badge>
                )}
                {prompt.usageCount !== undefined && prompt.usageCount !== null && prompt.usageCount > 0 && (
                  <Badge color="green" variant="soft" size="2">
                    {prompt.usageCount} {prompt.usageCount === 1 ? 'use' : 'uses'}
                  </Badge>
                )}
              </Flex>
              <Text size="2" color="gray" style={{ lineHeight: 1.6 }}>
                {prompt.labels.length > 0 ? `Labels: ${prompt.labels.join(', ')}` : 'No labels'}
              </Text>
            </Flex>

            <Flex gap="2" align="center">
              <Button
                variant="soft"
                size="2"
                onClick={() => {
                  const langfuseUrl = process.env.NEXT_PUBLIC_LANGFUSE_BASE_URL || "https://cloud.langfuse.com";
                  const projectId = getLangfuseProjectId();
                  
                  console.log('Langfuse URL:', langfuseUrl);
                  console.log('Project ID:', projectId);
                  console.log('Prompt Name:', prompt.name);
                  
                  if (projectId) {
                    const url = `${langfuseUrl}/project/${projectId}/prompts/${encodeURIComponent(prompt.name)}`;
                    console.log('Opening URL:', url);
                    window.open(url, "_blank");
                  } else {
                    console.warn('No project ID found, opening general prompts page');
                    window.open(`${langfuseUrl}/prompts`, "_blank");
                  }
                }}
              >
                <ExternalLinkIcon />
                Edit in Langfuse
              </Button>
              <Button
                variant="surface"
                size="2"
                onClick={() => setIsExpanded(!isExpanded)}
                style={{ cursor: "pointer" }}
              >
                <CodeIcon />
                {isExpanded ? "Hide" : "View"} Details
              </Button>
            </Flex>
          </Flex>

          {/* Expanded Content */}
          {isExpanded && (
            <>
              <Separator size="4" />
              <Flex direction="column" gap="3">
                {/* Prompt Content */}
                {prompt.content && (
                  <Box>
                    <Flex justify="between" align="center" mb="2">
                      <Text size="2" weight="bold" color="gray" style={{ textTransform: "uppercase", letterSpacing: "0.1em" }}>
                        Prompt Content
                      </Text>
                      <Button
                        variant="soft"
                        size="1"
                        onClick={handleCopyPrompt}
                        style={{ cursor: "pointer" }}
                      >
                        {isCopied ? (
                          <>
                            <CheckIcon /> Copied!
                          </>
                        ) : (
                          <>
                            <CopyIcon /> Copy
                          </>
                        )}
                      </Button>
                    </Flex>
                    {prompt.type === 'text' ? (
                      <Box
                        p="4"
                        style={{
                          backgroundColor: "var(--gray-2)",
                          borderRadius: "var(--radius-3)",
                          border: "1px solid var(--gray-6)",
                          fontFamily: "var(--code-font-family)",
                          fontSize: "13px",
                          lineHeight: "1.6",
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-word",
                          maxHeight: "400px",
                          overflowY: "auto",
                        }}
                      >
                        {prompt.content}
                      </Box>
                    ) : (
                      <Flex direction="column" gap="2">
                        {Array.isArray(prompt.content) && prompt.content.map((msg: any, idx: number) => (
                          <Box
                            key={idx}
                            p="3"
                            style={{
                              backgroundColor: "var(--gray-2)",
                              borderRadius: "var(--radius-3)",
                              border: "1px solid var(--gray-6)",
                            }}
                          >
                            <Flex direction="column" gap="2">
                              <Badge size="1" color={msg.role === 'system' ? 'purple' : msg.role === 'user' ? 'blue' : 'green'} variant="soft">
                                {msg.role}
                              </Badge>
                              <Text
                                size="2"
                                style={{
                                  fontFamily: "var(--code-font-family)",
                                  fontSize: "13px",
                                  lineHeight: "1.6",
                                  whiteSpace: "pre-wrap",
                                  wordBreak: "break-word",
                                }}
                              >
                                {msg.content}
                              </Text>
                            </Flex>
                          </Box>
                        ))}
                      </Flex>
                    )}
                  </Box>
                )}

                <Box>
                  <Text size="2" weight="bold" color="gray" style={{ textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "8px", display: "block" }}>
                    Metadata
                  </Text>
                  <Flex direction="column" gap="2">
                    <Text size="2" color="gray">
                      <Strong>Full Name:</Strong> {prompt.name}
                    </Text>
                    <Text size="2" color="gray">
                      <Strong>Type:</Strong> {prompt.type}
                    </Text>
                    <Text size="2" color="gray">
                      <Strong>Versions:</Strong> {prompt.versions.join(', ')}
                    </Text>
                    <Text size="2" color="gray">
                      <Strong>Labels:</Strong> {prompt.labels.join(', ') || 'none'}
                    </Text>
                    <Text size="2" color="gray">
                      <Strong>Last Updated:</Strong> {new Date(prompt.lastUpdatedAt).toLocaleString()}
                    </Text>
                    {prompt.lastUsedBy && (
                      <Text size="2" color="gray">
                        <Strong>Last Used By:</Strong> {prompt.lastUsedBy}
                      </Text>
                    )}
                  </Flex>
                </Box>

                {prompt.tags.length > 0 && (
                  <Box>
                    <Text size="2" weight="bold" color="gray" style={{ textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "8px", display: "block" }}>
                      Tags
                    </Text>
                    <Flex gap="2" wrap="wrap">
                      {prompt.tags.map((tag, idx) => (
                        <Badge key={idx} color="gray" variant="surface" size="1">
                          {tag}
                        </Badge>
                      ))}
                    </Flex>
                  </Box>
                )}
              </Flex>

              <Callout.Root color="blue" size="2">
                <Callout.Icon>
                  <InfoCircledIcon />
                </Callout.Icon>
                <Callout.Text>
                  <Strong>Langfuse Prompt:</Strong> Manage this prompt in your Langfuse dashboard to update versions and labels.
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

  const [createPrompt, { loading, error }] = useCreatePromptMutation({
    refetchQueries: ["GetPrompts"],
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
  const { loading, error, data } = useGetMyPromptUsageQuery({
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

function LangfuseTabContent() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeSubTab = searchParams.get('tab') || 'prompts';
  
  const { loading, error, data } = useGetPromptsQuery();
  // Backend already filters by user tag, no need to filter again
  const REGISTERED_PROMPTS = data?.prompts || [];

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
          {REGISTERED_PROMPTS.length > 0 && (
            <Badge ml="2" size="1" color="blue" variant="soft">
              {REGISTERED_PROMPTS.length}
            </Badge>
          )}
        </Tabs.Trigger>
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
          ) : REGISTERED_PROMPTS.length === 0 ? (
            <Card>
              <Box p="6" style={{ textAlign: "center" }}>
                <Flex direction="column" gap="3">
                  <Text size="3" color="gray">
                    No prompts found.
                  </Text>
                  <Text size="2" color="gray">
                    Create your first prompt to get started.
                  </Text>
                  <Button
                    variant="soft"
                    size="2"
                    onClick={() => handleTabChange('create')}
                  >
                    <PlusIcon />
                    Create Prompt
                  </Button>
                </Flex>
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
  );
}

export function LangfuseTab() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LangfuseTabContent />
    </Suspense>
  );
}
