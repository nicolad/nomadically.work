"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation } from "@apollo/client";
import { gql } from "@/__generated__";
import { useAuth } from "@/lib/auth-hooks";
import { ADMIN_EMAIL } from "@/lib/constants";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import {
  Badge,
  Box,
  Button,
  Card,
  Container,
  Flex,
  Heading,
  Separator,
  Spinner,
  Text,
} from "@radix-ui/themes";
import {
  ArrowLeftIcon,
  CheckIcon,
  ClipboardIcon,
  CrossCircledIcon,
  ExclamationTriangleIcon,
  PlayIcon,
} from "@radix-ui/react-icons";

const DEEP_PLANNER_TASK_QUERY = gql(`
  query DeepPlannerTask($id: ID!) {
    deepPlannerTask(id: $id) {
      id
      workflowType
      problemDescription
      context
      status
      currentStep
      checkpointCount
      totalSteps
      progressPercent
      outputArtifact
      errorMessage
      startedAt
      completedAt
      createdAt
      updatedAt
    }
  }
`);

const TRIGGER_DEEP_PLANNER_TASK = gql(`
  mutation TriggerDeepPlannerTask($id: ID!) {
    triggerDeepPlannerTask(id: $id) {
      id
      status
      currentStep
    }
  }
`);

const CANCEL_DEEP_PLANNER_TASK = gql(`
  mutation CancelDeepPlannerTask($id: ID!) {
    cancelDeepPlannerTask(id: $id) {
      id
      status
    }
  }
`);

const STATUS_COLORS: Record<string, "gray" | "blue" | "green" | "red" | "orange"> = {
  PENDING: "gray",
  RUNNING: "blue",
  COMPLETE: "green",
  FAILED: "red",
  CANCELLED: "orange",
};

const PROGRESS_BAR_COLORS: Record<string, string> = {
  PENDING: "var(--gray-6)",
  RUNNING: "var(--blue-9)",
  COMPLETE: "var(--green-9)",
  FAILED: "var(--red-9)",
  CANCELLED: "var(--orange-9)",
};

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "\u2014";
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(
  start: string | null | undefined,
  end: string | null | undefined
): string {
  if (!start || !end) return "\u2014";
  const ms = new Date(end).getTime() - new Date(start).getTime();
  const mins = Math.floor(ms / 60_000);
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  if (hours > 0) return `${hours}h ${remMins}m`;
  return `${mins}m`;
}

function isStale(updatedAt: string | null | undefined): boolean {
  if (!updatedAt) return false;
  return Date.now() - new Date(updatedAt).getTime() > 30 * 60 * 1000;
}

export default function TaskDetailClient() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const isAdmin = user?.email === ADMIN_EMAIL;
  const [copied, setCopied] = useState(false);
  const [isRunning, setIsRunning] = useState(false);

  const { data, loading, error } = useQuery(DEEP_PLANNER_TASK_QUERY, {
    variables: { id },
    skip: !isAdmin || !id,
    // Poll for RUNNING tasks every 10s, PENDING tasks every 15s (waiting for worker pickup)
    pollInterval: isRunning ? 10_000 : 0,
  });

  const task = data?.deepPlannerTask;

  useEffect(() => {
    // Poll while RUNNING (10s) or PENDING (15s — waiting for worker pickup)
    setIsRunning(task?.status === "RUNNING" || task?.status === "PENDING");
  }, [task?.status]);

  const [triggerTask, { loading: triggering }] = useMutation(TRIGGER_DEEP_PLANNER_TASK, {
    variables: { id },
    refetchQueries: ["DeepPlannerTask"],
  });

  const [cancelTask, { loading: cancelling }] = useMutation(CANCEL_DEEP_PLANNER_TASK, {
    variables: { id },
    refetchQueries: ["DeepPlannerTask"],
  });

  function copyId() {
    if (!task) return;
    navigator.clipboard.writeText(task.id).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  if (!user) {
    return (
      <Container size="3" p="8">
        <Flex align="center" gap="3" justify="center" style={{ minHeight: 200 }}>
          <Spinner size="3" />
          <Text color="gray">Checking authentication...</Text>
        </Flex>
      </Container>
    );
  }

  if (!isAdmin) {
    return (
      <Container size="3" p="8">
        <Card>
          <Flex direction="column" align="center" gap="4" p="6">
            <ExclamationTriangleIcon width="32" height="32" color="red" />
            <Heading size="5">Access denied</Heading>
            <Text color="gray">
              This page is restricted to administrators.
            </Text>
            <Button asChild variant="soft">
              <Link href="/">Back to Jobs</Link>
            </Button>
          </Flex>
        </Card>
      </Container>
    );
  }

  if (loading) {
    return (
      <Container size="3" p="8">
        <Flex align="center" gap="3" justify="center" style={{ minHeight: 200 }}>
          <Spinner size="3" />
          <Text color="gray">Loading task...</Text>
        </Flex>
      </Container>
    );
  }

  if (error) {
    return (
      <Container size="3" p="8">
        <Card>
          <Flex direction="column" gap="3" p="2">
            <Text color="red">Error: {error.message}</Text>
            <Button asChild variant="soft" style={{ alignSelf: "flex-start" }}>
              <Link href="/admin/deep-planner">
                <ArrowLeftIcon /> Back to Tasks
              </Link>
            </Button>
          </Flex>
        </Card>
      </Container>
    );
  }

  if (!task) {
    return (
      <Container size="3" p="8">
        <Card>
          <Flex direction="column" align="center" gap="3" p="4">
            <Text color="gray">Task not found</Text>
            <Button asChild variant="soft">
              <Link href="/admin/deep-planner">Back to Tasks</Link>
            </Button>
          </Flex>
        </Card>
      </Container>
    );
  }

  const progressPercent = task.progressPercent ?? 0;

  return (
    <Container size="4" p="8" style={{ maxWidth: "1000px" }}>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.75); }
        }
      `}</style>

      <Flex justify="between" align="center" mb="4">
        <Button asChild variant="ghost">
          <Link href="/admin/deep-planner">
            <ArrowLeftIcon /> Back to Tasks
          </Link>
        </Button>
        <Flex gap="2">
          {task.status === "RUNNING" && (
            <Button
              color="red"
              variant="soft"
              onClick={() => cancelTask()}
              disabled={cancelling}
              loading={cancelling}
            >
              <CrossCircledIcon /> Cancel
            </Button>
          )}
          {(task.status === "PENDING" || task.status === "FAILED" || task.status === "CANCELLED") && (
            <Button
              onClick={() => triggerTask()}
              disabled={triggering}
              loading={triggering}
            >
              <PlayIcon /> {task.status === "PENDING" ? "Start" : "Retry"} Task
            </Button>
          )}
        </Flex>
      </Flex>

      <Card mb="4">
        <Flex direction="column" gap="4">
          {/* Status row */}
          <Flex justify="between" align="center">
            <Flex gap="2" align="center">
              {task.status === "RUNNING" && (
                <span style={{
                  display: "inline-block",
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "var(--blue-9)",
                  animation: "pulse 1.5s ease-in-out infinite",
                  flexShrink: 0,
                }} />
              )}
              <Badge color={STATUS_COLORS[task.status] ?? "gray"} size="2">
                {task.status}
              </Badge>
              {task.status === "RUNNING" && isStale(task.updatedAt) && (
                <Badge color="orange" variant="outline" size="1">
                  Stale — may have crashed
                </Badge>
              )}
              <Text size="2" color="gray">
                {task.workflowType.replace(/_/g, " ")}
              </Text>
            </Flex>
            <Flex align="center" gap="2">
              <Text size="1" color="gray">
                {task.id}
              </Text>
              <Button
                variant="ghost"
                size="1"
                color={copied ? "green" : "gray"}
                onClick={copyId}
                title="Copy task ID"
              >
                {copied ? <CheckIcon /> : <ClipboardIcon />}
              </Button>
            </Flex>
          </Flex>

          {/* Problem description */}
          <Text size="3" weight="medium">
            {task.problemDescription}
          </Text>

          {task.context && (() => {
            let parsed: Record<string, string> | null = null;
            try { parsed = JSON.parse(task.context); } catch {}

            if (parsed && typeof parsed === "object" && (parsed.repoUrl || parsed.integrationRepoUrl)) {
              return (
                <Box>
                  <Text size="1" color="gray" weight="bold" mb="1">
                    Integration Context
                  </Text>
                  <Flex direction="column" gap="1">
                    {parsed.repoUrl && (
                      <Text size="2" color="gray">
                        Base repo: <a href={parsed.repoUrl} target="_blank" rel="noopener noreferrer" style={{ color: "var(--blue-9)" }}>{parsed.repoUrl}</a>
                      </Text>
                    )}
                    {parsed.integrationRepoUrl && (
                      <Text size="2" color="gray">
                        Target repo: <a href={parsed.integrationRepoUrl} target="_blank" rel="noopener noreferrer" style={{ color: "var(--blue-9)" }}>{parsed.integrationRepoUrl}</a>
                      </Text>
                    )}
                    {parsed.note && (
                      <Text size="2" color="gray">{parsed.note}</Text>
                    )}
                  </Flex>
                </Box>
              );
            }

            return (
              <Box>
                <Text size="1" color="gray" weight="bold" mb="1">
                  Context
                </Text>
                <Text size="2" color="gray">
                  {task.context}
                </Text>
              </Box>
            );
          })()}

          {/* Current step callout when running */}
          {task.status === "RUNNING" && task.currentStep && (
            <Box
              p="3"
              style={{
                background: "var(--blue-2)",
                border: "1px solid var(--blue-6)",
                borderRadius: "var(--radius-3)",
              }}
            >
              <Text size="1" color="blue" weight="bold">
                Currently executing
              </Text>
              <Text size="2" color="blue" style={{ display: "block" }}>
                {task.currentStep}
              </Text>
            </Box>
          )}

          <Separator size="4" />

          {/* Metadata grid */}
          <Box
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
              gap: "var(--space-3)",
            }}
          >
            {[
              { label: "Created", value: formatDate(task.createdAt) },
              { label: "Started", value: formatDate(task.startedAt) },
              { label: "Completed", value: formatDate(task.completedAt) },
              { label: "Duration", value: formatDuration(task.startedAt, task.completedAt) },
              {
                label: "Progress",
                value: `${task.checkpointCount}/${task.totalSteps} (${progressPercent}%)`,
              },
              ...(task.status !== "RUNNING" && task.currentStep
                ? [{ label: "Last Step", value: task.currentStep }]
                : []),
            ].map(({ label, value }) => (
              <Box
                key={label}
                p="2"
                style={{
                  background: "var(--gray-2)",
                  borderRadius: "var(--radius-2)",
                }}
              >
                <Text size="1" color="gray" style={{ display: "block" }}>
                  {label}
                </Text>
                <Text size="2" weight="medium">
                  {value}
                </Text>
              </Box>
            ))}
          </Box>

          {/* Progress bar — always visible */}
          <Box>
            <Flex justify="between" align="center" mb="1">
              <Text size="1" color="gray">
                Execution Progress
              </Text>
              <Text size="1" color="gray">
                {progressPercent}%
              </Text>
            </Flex>
            <Box
              style={{
                width: "100%",
                height: 8,
                background: "var(--gray-4)",
                borderRadius: 4,
                overflow: "hidden",
              }}
            >
              <Box
                style={{
                  width: `${progressPercent}%`,
                  height: "100%",
                  background: PROGRESS_BAR_COLORS[task.status] ?? "var(--gray-6)",
                  borderRadius: 4,
                  transition: "width 0.5s ease",
                }}
              />
            </Box>
          </Box>

          {(task.status === "FAILED" || task.status === "CANCELLED") && task.errorMessage && (
            <Box
              p="3"
              style={{
                background: "var(--red-2)",
                border: "1px solid var(--red-6)",
                borderRadius: "var(--radius-3)",
              }}
            >
              <Text size="1" color="red" weight="bold">
                Error
              </Text>
              <Text size="2" color="red" style={{ display: "block" }}>
                {task.errorMessage}
              </Text>
            </Box>
          )}
        </Flex>
      </Card>

      {task.outputArtifact && (
        <Card>
          <Box mb="3">
            <Flex justify="between" align="center">
              <Heading size="4">Output Artifact</Heading>
              <Flex gap="2">
                {task.status === "FAILED" && (
                  <Badge color="orange">Partial — task failed</Badge>
                )}
                {task.status === "CANCELLED" && (
                  <Badge color="orange">Partial — cancelled</Badge>
                )}
                {task.status === "RUNNING" && (
                  <Badge color="blue">Live preview ({progressPercent}%)</Badge>
                )}
              </Flex>
            </Flex>
            <Separator size="4" mt="3" />
          </Box>
          <Box className="markdown-content" style={{ lineHeight: 1.7 }}>
            <ReactMarkdown>{task.outputArtifact}</ReactMarkdown>
          </Box>
        </Card>
      )}

      {!task.outputArtifact && task.status === "RUNNING" && (
        <Card>
          <Flex direction="column" align="center" gap="3" p="6">
            <Spinner size="3" />
            <Text color="blue" size="3">
              Task is running... ({progressPercent}%)
            </Text>
            <Text color="gray" size="2">
              The artifact will appear here as sections are completed.
            </Text>
          </Flex>
        </Card>
      )}

      {!task.outputArtifact && task.status === "PENDING" && (
        <Card>
          <Flex direction="column" align="center" gap="3" p="6">
            <Text color="gray" size="3">
              Waiting for worker to start...
            </Text>
          </Flex>
        </Card>
      )}
    </Container>
  );
}
