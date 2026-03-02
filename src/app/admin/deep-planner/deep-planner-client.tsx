"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@apollo/client";
import { gql } from "@/__generated__";
import { useAuth } from "@/lib/auth-hooks";
import { ADMIN_EMAIL } from "@/lib/constants";
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
  Separator,
  Text,
  TextArea,
  TextField,
} from "@radix-ui/themes";
import {
  ExclamationTriangleIcon,
  PlusIcon,
  ReloadIcon,
} from "@radix-ui/react-icons";

const DEEP_PLANNER_TASKS_QUERY = gql(`
  query DeepPlannerTasks {
    deepPlannerTasks {
      id
      workflowType
      problemDescription
      status
      currentStep
      checkpointCount
      totalSteps
      progressPercent
      errorMessage
      startedAt
      completedAt
      createdAt
      updatedAt
    }
  }
`);

const CREATE_DEEP_PLANNER_TASK_MUTATION = gql(`
  mutation CreateDeepPlannerTask(
    $workflowType: String!
    $problemDescription: String!
    $context: String
  ) {
    createDeepPlannerTask(
      workflowType: $workflowType
      problemDescription: $problemDescription
      context: $context
    ) {
      id
      workflowType
      problemDescription
      status
      createdAt
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

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "\u2014";
  const d = new Date(iso);
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isStale(updatedAt: string | null | undefined): boolean {
  if (!updatedAt) return false;
  const thirtyMinutes = 30 * 60 * 1000;
  return Date.now() - new Date(updatedAt).getTime() > thirtyMinutes;
}

export default function DeepPlannerClient() {
  const { user } = useAuth();
  const isAdmin = user?.email === ADMIN_EMAIL;

  const [dialogOpen, setDialogOpen] = useState(false);
  const [problemDescription, setProblemDescription] = useState("");
  const [context, setContext] = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const [integrationRepoUrl, setIntegrationRepoUrl] = useState("");

  const { data, loading, error, refetch } = useQuery(DEEP_PLANNER_TASKS_QUERY, {
    skip: !isAdmin,
    pollInterval: 0,
  });

  const [createTask, { loading: creating }] = useMutation(
    CREATE_DEEP_PLANNER_TASK_MUTATION,
    {
      onCompleted: () => {
        setDialogOpen(false);
        setProblemDescription("");
        setContext("");
        setIntegrationRepoUrl("");
        refetch();
      },
    }
  );

  // Poll running tasks every 10s
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasRunning = data?.deepPlannerTasks?.some(
    (t) => t.status === "RUNNING"
  );

  useEffect(() => {
    if (hasRunning) {
      pollRef.current = setInterval(() => refetch(), 10_000);
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [hasRunning, refetch]);

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

  const tasks = data?.deepPlannerTasks ?? [];

  const handleCreate = () => {
    const resolvedContext = JSON.stringify({
      ...(repoUrl.trim() ? { repoUrl: repoUrl.trim() } : {}),
      ...(integrationRepoUrl.trim() ? { integrationRepoUrl: integrationRepoUrl.trim() } : {}),
      ...(context.trim() ? { note: context.trim() } : {}),
    });

    // Derive a default description from repo URLs if not provided
    const description = problemDescription.trim() || [
      repoUrl.trim() && `Integrate with ${repoUrl.trim().split("/").pop()}`,
      integrationRepoUrl.trim() && `using ${integrationRepoUrl.trim().split("/").pop()}`,
    ].filter(Boolean).join(" ") || "Autonomous SDD task";

    createTask({
      variables: {
        workflowType: "autonomous_sdd",
        problemDescription: description,
        context: resolvedContext === "{}" ? null : resolvedContext,
      },
    });
  };

  return (
    <Container size="4" p="8" style={{ maxWidth: "1200px" }}>
      <Flex justify="between" align="center" mb="6">
        <Box>
          <Heading size="7">Deep Planner</Heading>
          <Text color="gray" size="2">
            Autonomous SDD tasks
          </Text>
        </Box>
        <Flex gap="2">
          <Button
            variant="soft"
            onClick={() => refetch()}
            disabled={loading}
          >
            <ReloadIcon /> Refresh
          </Button>
          <Dialog.Root
            open={dialogOpen}
            onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) {
                setProblemDescription("");
                setContext("");
                setRepoUrl("");
                setIntegrationRepoUrl("");
              }
            }}
          >
            <Dialog.Trigger>
              <Button>
                <PlusIcon /> New Task
              </Button>
            </Dialog.Trigger>
            <Dialog.Content maxWidth="520px">
              <Dialog.Title>Create Planning Task</Dialog.Title>
              <Dialog.Description size="2" color="gray" mb="4">
                Run an autonomous SDD workflow.
              </Dialog.Description>
              <Flex direction="column" gap="3">
                <label>
                  <Text size="2" weight="bold" mb="1">
                    Base Repo URL
                  </Text>
                  <TextField.Root
                    placeholder="https://github.com/owner/repo"
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                    type="url"
                  />
                </label>
                <label>
                  <Text size="2" weight="bold" mb="1">
                    Integration Repo URL
                  </Text>
                  <TextField.Root
                    placeholder="https://github.com/drift-labs"
                    value={integrationRepoUrl}
                    onChange={(e) => setIntegrationRepoUrl(e.target.value)}
                    type="url"
                  />
                </label>
                <label>
                  <Text size="2" weight="bold" mb="1">
                    Problem Description (optional)
                  </Text>
                  <TextArea
                    placeholder="Describe the planning problem..."
                    value={problemDescription}
                    onChange={(e) => setProblemDescription(e.target.value)}
                    rows={4}
                  />
                </label>
                <label>
                  <Text size="2" weight="bold" mb="1">
                    Context (optional)
                  </Text>
                  <TextArea
                    placeholder="Additional context, constraints, or references..."
                    value={context}
                    onChange={(e) => setContext(e.target.value)}
                    rows={3}
                  />
                </label>
              </Flex>
              <Flex gap="3" mt="4" justify="end">
                <Dialog.Close>
                  <Button variant="soft" color="gray">
                    Cancel
                  </Button>
                </Dialog.Close>
                <Button
                  onClick={handleCreate}
                  disabled={creating}
                  loading={creating}
                >
                  Start Task
                </Button>
              </Flex>
            </Dialog.Content>
          </Dialog.Root>
        </Flex>
      </Flex>

      {error && (
        <Card mb="4">
          <Text color="red">Error loading tasks: {error.message}</Text>
        </Card>
      )}

      {loading && tasks.length === 0 && (
        <Flex direction="column" gap="3">
          {[1, 2, 3].map((i) => (
            <Card key={i} style={{ opacity: 0.5 }}>
              <Flex justify="between" align="start">
                <Box style={{ flex: 1 }}>
                  <Flex gap="2" align="center" mb="2">
                    <Box style={{ width: 60, height: 20, background: "var(--gray-4)", borderRadius: "var(--radius-2)" }} />
                    <Box style={{ width: 90, height: 16, background: "var(--gray-3)", borderRadius: "var(--radius-2)" }} />
                  </Flex>
                  <Box style={{ width: `${60 + i * 10}%`, height: 18, background: "var(--gray-3)", borderRadius: "var(--radius-2)" }} />
                </Box>
                <Box>
                  <Box style={{ width: 70, height: 14, background: "var(--gray-3)", borderRadius: "var(--radius-2)" }} />
                </Box>
              </Flex>
            </Card>
          ))}
        </Flex>
      )}

      {!loading && tasks.length === 0 && (
        <Card>
          <Flex direction="column" align="center" gap="3" p="6">
            <Text color="gray" size="3">
              No planning tasks yet
            </Text>
            <Text color="gray" size="2">
              Create an autonomous SDD task.
            </Text>
            <Button onClick={() => setDialogOpen(true)}>
              <PlusIcon /> New Task
            </Button>
          </Flex>
        </Card>
      )}

      <Flex direction="column" gap="3">
        {tasks.map((task) => (
          <Link
            key={task.id}
            href={`/admin/deep-planner/${task.id}`}
            style={{ textDecoration: "none", color: "inherit" }}
          >
            <Card
              style={{ cursor: "pointer" }}
              className="rt-hover-card"
            >
              <Flex direction="column" gap="2">
                <Flex justify="between" align="start">
                  <Box>
                    <Flex gap="2" align="center" mb="1">
                      <Badge color={STATUS_COLORS[task.status] ?? "gray"}>
                        {task.status}
                      </Badge>
                      {task.status === "RUNNING" &&
                        isStale(task.updatedAt) && (
                          <Badge color="orange" variant="outline">
                            Stale — may have crashed
                          </Badge>
                        )}
                      <Text size="1" color="gray">
                        {task.workflowType.replace(/_/g, " ")}
                      </Text>
                    </Flex>
                    <Text size="3" weight="medium">
                      {task.problemDescription.length > 120
                        ? task.problemDescription.slice(0, 120) + "..."
                        : task.problemDescription}
                    </Text>
                    {task.status === "FAILED" && task.errorMessage && (
                      <Text size="1" color="red" mt="1">
                        {task.errorMessage}
                      </Text>
                    )}
                    {task.status === "RUNNING" && task.currentStep && (
                      <Text size="1" color="blue" mt="1">
                        Step: {task.currentStep}
                      </Text>
                    )}
                  </Box>
                  <Flex direction="column" align="end" gap="1" style={{ flexShrink: 0, marginLeft: "var(--space-4)" }}>
                    <Text size="1" color="gray">
                      {formatDate(task.createdAt)}
                    </Text>
                    <Text size="1" color="gray">
                      {task.checkpointCount}/{task.totalSteps} ({task.progressPercent}%)
                    </Text>
                    {task.completedAt && (
                      <Text size="1" color="gray">
                        Completed {formatDate(task.completedAt)}
                      </Text>
                    )}
                  </Flex>
                </Flex>
                {(task.progressPercent ?? 0) > 0 && (
                  <Box
                    style={{
                      width: "100%",
                      height: 4,
                      background: "var(--gray-4)",
                      borderRadius: 2,
                      overflow: "hidden",
                    }}
                  >
                    <Box
                      style={{
                        width: `${task.progressPercent}%`,
                        height: "100%",
                        background: task.status === "COMPLETE"
                          ? "var(--green-9)"
                          : task.status === "FAILED"
                          ? "var(--red-9)"
                          : task.status === "CANCELLED"
                          ? "var(--orange-9)"
                          : "var(--blue-9)",
                        borderRadius: 2,
                      }}
                    />
                  </Box>
                )}
              </Flex>
            </Card>
          </Link>
        ))}
      </Flex>
    </Container>
  );
}
