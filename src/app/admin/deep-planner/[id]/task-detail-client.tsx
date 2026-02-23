"use client";

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
  Text,
} from "@radix-ui/themes";
import {
  ArrowLeftIcon,
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

const STATUS_COLORS: Record<string, "gray" | "blue" | "green" | "red"> = {
  PENDING: "gray",
  RUNNING: "blue",
  COMPLETE: "green",
  FAILED: "red",
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

export default function TaskDetailClient() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const isAdmin = user?.email === ADMIN_EMAIL;

  const { data, loading, error } = useQuery(DEEP_PLANNER_TASK_QUERY, {
    variables: { id },
    skip: !isAdmin || !id,
    pollInterval: 0,
  });

  const task = data?.deepPlannerTask;

  const [triggerTask, { loading: triggering }] = useMutation(TRIGGER_DEEP_PLANNER_TASK, {
    variables: { id },
    refetchQueries: ["DeepPlannerTask"],
  });

  // Poll while running
  useQuery(DEEP_PLANNER_TASK_QUERY, {
    variables: { id },
    skip: !isAdmin || !id || task?.status !== "RUNNING",
    pollInterval: task?.status === "RUNNING" ? 10_000 : 0,
  });

  if (!user) {
    return (
      <Container size="3" p="8">
        <Text color="gray">Loading...</Text>
      </Container>
    );
  }

  if (!isAdmin) {
    return (
      <Container size="3" p="8">
        <Card>
          <Flex direction="column" align="center" gap="4">
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
        <Text color="gray">Loading task...</Text>
      </Container>
    );
  }

  if (error) {
    return (
      <Container size="3" p="8">
        <Card>
          <Text color="red">Error: {error.message}</Text>
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

  return (
    <Container size="4" p="8" style={{ maxWidth: "1000px" }}>
      <Flex justify="between" align="center" mb="4">
        <Button asChild variant="ghost">
          <Link href="/admin/deep-planner">
            <ArrowLeftIcon /> Back to Tasks
          </Link>
        </Button>
        {(task.status === "PENDING" || task.status === "FAILED") && (
          <Button
            onClick={() => triggerTask()}
            disabled={triggering}
            loading={triggering}
          >
            <PlayIcon /> {task.status === "FAILED" ? "Retry" : "Start"} Task
          </Button>
        )}
      </Flex>

      <Card mb="4">
        <Flex direction="column" gap="3">
          <Flex justify="between" align="center">
            <Flex gap="2" align="center">
              <Badge
                color={STATUS_COLORS[task.status] ?? "gray"}
                size="2"
              >
                {task.status}
              </Badge>
              <Text size="2" color="gray">
                {task.workflowType.replace("_", " ")}
              </Text>
            </Flex>
            <Text size="1" color="gray">
              ID: {task.id}
            </Text>
          </Flex>

          <Text size="3" weight="medium">
            {task.problemDescription}
          </Text>

          {task.context && (
            <Box>
              <Text size="1" color="gray" weight="bold">
                Context
              </Text>
              <Text size="2" color="gray">
                {task.context}
              </Text>
            </Box>
          )}

          <Separator size="4" />

          <Flex gap="5" wrap="wrap">
            <Box>
              <Text size="1" color="gray">
                Created
              </Text>
              <Text size="2">{formatDate(task.createdAt)}</Text>
            </Box>
            <Box>
              <Text size="1" color="gray">
                Started
              </Text>
              <Text size="2">{formatDate(task.startedAt)}</Text>
            </Box>
            <Box>
              <Text size="1" color="gray">
                Completed
              </Text>
              <Text size="2">{formatDate(task.completedAt)}</Text>
            </Box>
            <Box>
              <Text size="1" color="gray">
                Duration
              </Text>
              <Text size="2">
                {formatDuration(task.startedAt, task.completedAt)}
              </Text>
            </Box>
            <Box>
              <Text size="1" color="gray">
                Checkpoints
              </Text>
              <Text size="2">{task.checkpointCount}</Text>
            </Box>
            {task.currentStep && (
              <Box>
                <Text size="1" color="gray">
                  Current Step
                </Text>
                <Text size="2">{task.currentStep}</Text>
              </Box>
            )}
          </Flex>

          {task.status === "FAILED" && task.errorMessage && (
            <>
              <Separator size="4" />
              <Box>
                <Text size="1" color="red" weight="bold">
                  Error
                </Text>
                <Text size="2" color="red">
                  {task.errorMessage}
                </Text>
              </Box>
            </>
          )}
        </Flex>
      </Card>

      {task.outputArtifact && (
        <Card>
          {task.status === "FAILED" && (
            <Badge color="orange" mb="3">
              Partial artifact — task failed before completion
            </Badge>
          )}
          <Box className="markdown-content" style={{ lineHeight: 1.7 }}>
            <ReactMarkdown>{task.outputArtifact}</ReactMarkdown>
          </Box>
        </Card>
      )}

      {!task.outputArtifact && task.status === "RUNNING" && (
        <Card>
          <Flex direction="column" align="center" gap="3" p="6">
            <Text color="blue" size="3">
              Task is running...
            </Text>
            <Text color="gray" size="2">
              The artifact will appear here when the worker completes execution.
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
