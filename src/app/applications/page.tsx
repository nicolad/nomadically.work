"use client";

import {
  Container,
  Heading,
  Button,
  Flex,
  Dialog,
  TextField,
  Text,
  Box,
  Card,
  Badge,
  Skeleton,
  IconButton,
  Tooltip,
  DropdownMenu,
} from "@radix-ui/themes";
import {
  PlusIcon,
  ExternalLinkIcon,
  DotsHorizontalIcon,
  ArrowRightIcon,
} from "@radix-ui/react-icons";
import { useState } from "react";
import { useAuth } from "@/lib/auth-hooks";
import {
  useCreateApplicationMutation,
  useGetApplicationsQuery,
  useUpdateApplicationMutation,
} from "@/__generated__/hooks";
import type { ApplicationStatus, GetApplicationsQuery } from "@/__generated__/hooks";
import Link from "next/link";

type Application = GetApplicationsQuery["applications"][number];

// Pipeline columns — maps DB enum values to display labels
const COLUMNS: { status: ApplicationStatus; label: string; color: "gray" | "blue" | "orange" | "green" | "red" | "purple" }[] = [
  { status: "pending",   label: "Saved",       color: "gray" },
  { status: "submitted", label: "Applied",      color: "blue" },
  { status: "reviewed",  label: "Interviewing", color: "orange" },
  { status: "accepted",  label: "Offer",        color: "green" },
  { status: "rejected",  label: "Rejected",     color: "red" },
];

const NEXT_STATUS: Partial<Record<ApplicationStatus, ApplicationStatus>> = {
  pending:   "submitted",
  submitted: "reviewed",
  reviewed:  "accepted",
};

function companyInitials(name: string): string {
  return name
    .split(/[\s\-_.]/)
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

// ──────────────────────────────────────────────────────────────────────────────
// Application Card
// ──────────────────────────────────────────────────────────────────────────────
function AppCard({
  app,
  onMove,
  onReject,
}: {
  app: Application;
  onMove: (id: number, status: ApplicationStatus) => void;
  onReject: (id: number) => void;
}) {
  const displayName = app.companyName ?? app.jobId;
  const displayTitle = app.jobTitle ?? "Job application";
  const initials = companyInitials(displayName);
  const nextStatus = NEXT_STATUS[app.status];
  const nextLabel = COLUMNS.find((c) => c.status === nextStatus)?.label;

  return (
    <Card
      size="1"
      style={{
        cursor: "default",
        transition: "box-shadow 0.15s ease",
      }}
    >
      <Flex direction="column" gap="2">
        {/* Company + title row */}
        <Flex gap="2" align="start">
          <Box
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              backgroundColor: "var(--accent-3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              fontWeight: 700,
              fontSize: 12,
              color: "var(--accent-11)",
            }}
          >
            {initials}
          </Box>
          <Box style={{ flex: 1, minWidth: 0 }}>
            <Text
              size="2"
              weight="medium"
              style={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                display: "block",
              }}
            >
              {displayTitle}
            </Text>
            <Text size="1" color="gray" style={{ display: "block" }}>
              {app.companyName ?? "—"}
            </Text>
          </Box>
        </Flex>

        {/* Date + actions row */}
        <Flex justify="between" align="center" gap="1">
          <Text size="1" color="gray">
            {formatDate(app.createdAt)}
          </Text>
          <Flex gap="1" align="center">
            {app.jobId.startsWith("http") && (
              <Tooltip content="Open job posting">
                <IconButton
                  size="1"
                  variant="ghost"
                  color="gray"
                  asChild
                >
                  <a href={app.jobId} target="_blank" rel="noopener noreferrer">
                    <ExternalLinkIcon />
                  </a>
                </IconButton>
              </Tooltip>
            )}
            <DropdownMenu.Root>
              <DropdownMenu.Trigger>
                <IconButton size="1" variant="ghost" color="gray">
                  <DotsHorizontalIcon />
                </IconButton>
              </DropdownMenu.Trigger>
              <DropdownMenu.Content size="1">
                {nextStatus && nextLabel && (
                  <DropdownMenu.Item
                    onClick={() => onMove(app.id, nextStatus)}
                  >
                    <ArrowRightIcon />
                    Move to {nextLabel}
                  </DropdownMenu.Item>
                )}
                {app.status !== "rejected" && (
                  <DropdownMenu.Item
                    color="red"
                    onClick={() => onReject(app.id)}
                  >
                    Mark Rejected
                  </DropdownMenu.Item>
                )}
                {app.status === "rejected" && (
                  <DropdownMenu.Item
                    onClick={() => onMove(app.id, "pending")}
                  >
                    Move back to Saved
                  </DropdownMenu.Item>
                )}
              </DropdownMenu.Content>
            </DropdownMenu.Root>
          </Flex>
        </Flex>

        {/* Notes preview */}
        {app.notes && (
          <Text
            size="1"
            color="gray"
            style={{
              overflow: "hidden",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              lineHeight: "1.4",
            }}
          >
            {app.notes}
          </Text>
        )}
      </Flex>
    </Card>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Kanban Column
// ──────────────────────────────────────────────────────────────────────────────
function KanbanColumn({
  status,
  label,
  color,
  apps,
  onMove,
  onReject,
}: {
  status: ApplicationStatus;
  label: string;
  color: "gray" | "blue" | "orange" | "green" | "red" | "purple";
  apps: Application[];
  onMove: (id: number, status: ApplicationStatus) => void;
  onReject: (id: number) => void;
}) {
  return (
    <Box
      style={{
        flex: "0 0 240px",
        minWidth: 240,
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      {/* Column header */}
      <Flex align="center" gap="2" mb="2">
        <Badge color={color} variant="soft" size="1">
          {label}
        </Badge>
        <Text size="1" color="gray">
          {apps.length}
        </Text>
      </Flex>

      {/* Cards */}
      <Flex direction="column" gap="2" style={{ flex: 1 }}>
        {apps.map((app) => (
          <AppCard
            key={app.id}
            app={app}
            onMove={onMove}
            onReject={onReject}
          />
        ))}
        {apps.length === 0 && (
          <Box
            p="3"
            style={{
              border: "1px dashed var(--gray-6)",
              borderRadius: 8,
              textAlign: "center",
            }}
          >
            <Text size="1" color="gray">
              Empty
            </Text>
          </Box>
        )}
      </Flex>
    </Box>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Add Application Dialog (manual entry fallback)
// ──────────────────────────────────────────────────────────────────────────────
function AddApplicationDialog({
  onCreated,
}: {
  onCreated: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [jobUrl, setJobUrl] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [createApplication, { loading }] = useCreateApplicationMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobUrl) return;
    try {
      await createApplication({
        variables: {
          input: {
            jobId: jobUrl,
            questions: [],
            jobTitle: jobTitle || undefined,
            companyName: companyName || undefined,
          },
        },
        refetchQueries: ["GetApplications"],
        awaitRefetchQueries: true,
      });
      setOpen(false);
      setJobUrl("");
      setJobTitle("");
      setCompanyName("");
      onCreated();
    } catch (error) {
      console.error("Error creating application:", error);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger>
        <Button size="2">
          <PlusIcon /> Add Manually
        </Button>
      </Dialog.Trigger>
      <Dialog.Content maxWidth="440px">
        <Dialog.Title>Track a Job</Dialog.Title>
        <Dialog.Description size="2" mb="4" color="gray">
          Paste a job posting URL to start tracking it. Tip: use the{" "}
          <Text weight="medium">Save Job</Text> button on any job page for
          one-click tracking.
        </Dialog.Description>
        <form onSubmit={handleSubmit}>
          <Flex direction="column" gap="3">
            <label>
              <Text size="2" weight="medium" mb="1" as="div">
                Job URL *
              </Text>
              <TextField.Root
                placeholder="https://jobs.example.com/..."
                type="url"
                value={jobUrl}
                onChange={(e) => setJobUrl(e.target.value)}
                required
              />
            </label>
            <label>
              <Text size="2" weight="medium" mb="1" as="div">
                Job Title
              </Text>
              <TextField.Root
                placeholder="Senior React Engineer"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
              />
            </label>
            <label>
              <Text size="2" weight="medium" mb="1" as="div">
                Company
              </Text>
              <TextField.Root
                placeholder="Acme Corp"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
              />
            </label>
          </Flex>
          <Flex gap="3" mt="5" justify="end">
            <Dialog.Close>
              <Button variant="soft" color="gray" type="button">
                Cancel
              </Button>
            </Dialog.Close>
            <Button type="submit" disabled={loading || !jobUrl}>
              {loading ? "Saving..." : "Save Job"}
            </Button>
          </Flex>
        </form>
      </Dialog.Content>
    </Dialog.Root>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Page
// ──────────────────────────────────────────────────────────────────────────────
export default function ApplicationsPage() {
  const { user } = useAuth();
  const { data, loading, refetch } = useGetApplicationsQuery();
  const [updateApplication] = useUpdateApplicationMutation();

  const handleMove = async (id: number, status: ApplicationStatus) => {
    await updateApplication({
      variables: { id, input: { status } },
      optimisticResponse: {
        updateApplication: {
          __typename: "Application",
          id,
          jobId: "",
          status,
          notes: null,
          jobTitle: null,
          companyName: null,
        },
      },
      update(cache, { data: mutData }) {
        if (!mutData?.updateApplication) return;
        const updated = mutData.updateApplication;
        cache.modify({
          id: cache.identify({ __typename: "Application", id: updated.id }),
          fields: {
            status: () => updated.status,
          },
        });
      },
    });
  };

  const handleReject = (id: number) => handleMove(id, "rejected");

  const apps = data?.applications ?? [];
  const byStatus = Object.fromEntries(
    COLUMNS.map(({ status }) => [
      status,
      apps.filter((a) => a.status === status),
    ]),
  ) as Record<ApplicationStatus, Application[]>;

  const total = apps.length;
  const activeCount = apps.filter(
    (a) => a.status !== "rejected",
  ).length;

  return (
    <Container
      size="4"
      p={{ initial: "4", md: "8" }}
      style={{ maxWidth: "100%", overflowX: "auto" }}
    >
      {/* Header */}
      <Flex justify="between" align="center" mb="6" wrap="wrap" gap="3">
        <Box>
          <Heading size="8" mb="1">
            Application Pipeline
          </Heading>
          {total > 0 && (
            <Text size="2" color="gray">
              {activeCount} active · {total} total
            </Text>
          )}
        </Box>
        <Flex gap="2" align="center">
          <Button size="2" variant="soft" color="gray" asChild>
            <Link href="/">Browse Jobs</Link>
          </Button>
          <AddApplicationDialog onCreated={() => refetch()} />
        </Flex>
      </Flex>

      {/* Loading */}
      {loading && (
        <Flex gap="4" style={{ overflowX: "auto", paddingBottom: 8 }}>
          {COLUMNS.map(({ status }) => (
            <Box key={status} style={{ flex: "0 0 240px" }}>
              <Skeleton height="32px" mb="3" />
              <Skeleton height="80px" mb="2" />
              <Skeleton height="80px" />
            </Box>
          ))}
        </Flex>
      )}

      {/* Empty state */}
      {!loading && total === 0 && (
        <Card size="3" style={{ textAlign: "center" }}>
          <Flex direction="column" align="center" gap="4" p="6">
            <Heading size="5" color="gray">
              No applications yet
            </Heading>
            <Text color="gray" size="3">
              Browse jobs and click <Text weight="medium">Save Job</Text> to
              start tracking your pipeline.
            </Text>
            <Button asChild>
              <Link href="/">Browse Remote EU Jobs</Link>
            </Button>
          </Flex>
        </Card>
      )}

      {/* Kanban board */}
      {!loading && total > 0 && (
        <Flex gap="4" style={{ overflowX: "auto", paddingBottom: 8 }}>
          {COLUMNS.map(({ status, label, color }) => (
            <KanbanColumn
              key={status}
              status={status}
              label={label}
              color={color}
              apps={byStatus[status] ?? []}
              onMove={handleMove}
              onReject={handleReject}
            />
          ))}
        </Flex>
      )}

      {/* Sign-in prompt */}
      {!user && (
        <Card size="3" style={{ textAlign: "center" }}>
          <Text color="gray">
            Sign in to track your job applications.
          </Text>
        </Card>
      )}
    </Container>
  );
}
