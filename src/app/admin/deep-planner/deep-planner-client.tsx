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
  Select,
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
  const [workflowType, setWorkflowType] = useState("product_brief");
  const [problemDescription, setProblemDescription] = useState("");
  const [context, setContext] = useState("");

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
    if (!problemDescription.trim()) return;
    createTask({
      variables: {
        workflowType,
        problemDescription: problemDescription.trim(),
        context: context.trim() || null,
      },
    });
  };

  return (
    <Container size="4" p="8" style={{ maxWidth: "1200px" }}>
      <Flex justify="between" align="center" mb="6">
        <Box>
          <Heading size="7">Deep Planner</Heading>
          <Text color="gray" size="2">
            Autonomous BMAD planning tasks
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
          <Dialog.Root open={dialogOpen} onOpenChange={setDialogOpen}>
            <Dialog.Trigger>
              <Button>
                <PlusIcon /> New Task
              </Button>
            </Dialog.Trigger>
            <Dialog.Content maxWidth="500px">
              <Dialog.Title>Create Planning Task</Dialog.Title>
              <Dialog.Description size="2" color="gray" mb="4">
                Assign a BMAD workflow to run autonomously.
              </Dialog.Description>
              <Flex direction="column" gap="3">
                <label>
                  <Text size="2" weight="bold" mb="1">
                    Workflow Type
                  </Text>
                  <Select.Root
                    value={workflowType}
                    onValueChange={setWorkflowType}
                  >
                    <Select.Trigger style={{ width: "100%" }} />
                    <Select.Content>
                      <Select.Item value="product_brief">
                        Product Brief
                      </Select.Item>
                    </Select.Content>
                  </Select.Root>
                </label>
                <label>
                  <Text size="2" weight="bold" mb="1">
                    Problem Description
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
                  disabled={!problemDescription.trim() || creating}
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
        <Text color="gray">Loading tasks...</Text>
      )}

      {!loading && tasks.length === 0 && (
        <Card>
          <Flex direction="column" align="center" gap="3" p="6">
            <Text color="gray" size="3">
              No planning tasks yet
            </Text>
            <Text color="gray" size="2">
              Click &quot;New Task&quot; to assign your first BMAD planning
              workflow.
            </Text>
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
                      {task.workflowType.replace("_", " ")}
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
                <Flex direction="column" align="end" gap="1">
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
            </Card>
          </Link>
        ))}
      </Flex>
    </Container>
  );
}
