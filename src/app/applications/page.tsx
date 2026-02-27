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
  DropdownMenu,
} from "@radix-ui/themes";
import {
  PlusIcon,
  DotsHorizontalIcon,
  ArrowRightIcon,
  ChevronDownIcon,
  ChevronRightIcon,
} from "@radix-ui/react-icons";
import { useState } from "react";
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


function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

// ──────────────────────────────────────────────────────────────────────────────
// Pipeline Funnel Bar
// ──────────────────────────────────────────────────────────────────────────────
function PipelineFunnel({ apps }: { apps: Application[] }) {
  const counts = Object.fromEntries(COLUMNS.map((c) => [c.status, 0])) as Record<ApplicationStatus, number>;
  for (const app of apps) {
    if (counts[app.status] !== undefined) counts[app.status]++;
  }

  return (
    <Flex gap="2" mb="5" wrap="wrap">
      {COLUMNS.map((col, i) => (
        <Flex key={col.status} align="center" gap="2">
          <Flex
            align="center"
            gap="2"
            px="3"
            py="2"
            style={{
              borderRadius: 8,
              backgroundColor: counts[col.status] > 0 ? `var(--${col.color}-3)` : "var(--gray-2)",
              border: `1px solid var(--${col.color}-6)`,
              opacity: counts[col.status] > 0 ? 1 : 0.5,
            }}
          >
            <Text size="2" weight="medium" color={counts[col.status] > 0 ? col.color : "gray"}>
              {col.label}
            </Text>
            <Badge color={counts[col.status] > 0 ? col.color : "gray"} variant="solid" size="1" radius="full">
              {counts[col.status]}
            </Badge>
          </Flex>
          {i < COLUMNS.length - 1 && (
            <Text size="1" color="gray" style={{ opacity: 0.4 }}>›</Text>
          )}
        </Flex>
      ))}
    </Flex>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Application Row
// ──────────────────────────────────────────────────────────────────────────────
function ApplicationRow({
  app,
  index,
  onMove,
  onReject,
}: {
  app: Application;
  index: number;
  onMove: (id: number, status: ApplicationStatus) => void;
  onReject: (id: number) => void;
}) {
  const displayTitle = app.jobTitle ?? "Job application";
  const nextStatus = NEXT_STATUS[app.status];
  const nextLabel = COLUMNS.find((c) => c.status === nextStatus)?.label;

  return (
    <Link
      href={`/applications/${app.id}`}
      style={{ textDecoration: "none", color: "inherit" }}
    >
      <Flex
        align="center"
        gap="3"
        px="4"
        py="3"
        style={{
          borderTop: index > 0 ? "1px solid var(--gray-5)" : undefined,
          backgroundColor: "var(--color-surface)",
          cursor: "pointer",
          transition: "background-color 0.1s",
        }}
        className="app-row"
      >
        {/* Title + company */}
        <Box style={{ flex: 1, minWidth: 0 }}>
          <Text size="2" weight="medium" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", display: "block" }}>
            {displayTitle}
          </Text>
          <Text size="1" color="gray">
            {app.companyName ?? "—"}{" "}· {formatDate(app.createdAt)}
          </Text>
        </Box>

        {/* Actions */}
        <Box onClick={(e) => e.preventDefault()}>
          <DropdownMenu.Root>
            <DropdownMenu.Trigger>
              <IconButton size="1" variant="ghost" color="gray">
                <DotsHorizontalIcon />
              </IconButton>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content size="1">
              {nextStatus && nextLabel && (
                <DropdownMenu.Item onClick={() => onMove(app.id, nextStatus)}>
                  <ArrowRightIcon />
                  Move to {nextLabel}
                </DropdownMenu.Item>
              )}
              {app.status !== "rejected" && (
                <DropdownMenu.Item color="red" onClick={() => onReject(app.id)}>
                  Mark Rejected
                </DropdownMenu.Item>
              )}
              {app.status === "rejected" && (
                <DropdownMenu.Item onClick={() => onMove(app.id, "pending")}>
                  Restore to Saved
                </DropdownMenu.Item>
              )}
            </DropdownMenu.Content>
          </DropdownMenu.Root>
        </Box>
      </Flex>
    </Link>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Status Section (collapsible group)
// ──────────────────────────────────────────────────────────────────────────────
function StatusSection({
  column,
  apps,
  onMove,
  onReject,
  defaultOpen = true,
}: {
  column: (typeof COLUMNS)[number];
  apps: Application[];
  onMove: (id: number, status: ApplicationStatus) => void;
  onReject: (id: number) => void;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Box mb="3">
      {/* Section header */}
      <Flex
        align="center"
        gap="2"
        px="3"
        py="2"
        onClick={() => setOpen((v) => !v)}
        style={{ cursor: "pointer", userSelect: "none" }}
      >
        <Box style={{ color: "var(--gray-9)", flexShrink: 0 }}>
          {open ? <ChevronDownIcon /> : <ChevronRightIcon />}
        </Box>
        <Badge color={column.color} variant="soft" size="2">
          {column.label}
        </Badge>
        <Text size="1" color="gray">
          {apps.length} {apps.length === 1 ? "application" : "applications"}
        </Text>
      </Flex>

      {/* Rows */}
      {open && apps.length > 0 && (
        <Box style={{ border: "1px solid var(--gray-5)", borderRadius: 8, overflow: "hidden", ml: 6 }}>
          {apps.map((app, i) => (
            <ApplicationRow
              key={app.id}
              app={app}
              index={i}
              onMove={onMove}
              onReject={onReject}
            />
          ))}
        </Box>
      )}

      {open && apps.length === 0 && (
        <Flex
          align="center"
          justify="center"
          py="4"
          style={{
            border: "1px dashed var(--gray-5)",
            borderRadius: 8,
            backgroundColor: "var(--gray-1)",
          }}
        >
          <Text size="1" color="gray">
            Nothing here yet
          </Text>
        </Flex>
      )}
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
    try {
      await createApplication({
        variables: {
          input: {
            jobId: jobUrl || null,
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
                Job URL
              </Text>
              <TextField.Root
                placeholder="https://jobs.example.com/..."
                type="url"
                value={jobUrl}
                onChange={(e) => setJobUrl(e.target.value)}
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
            <Button type="submit" disabled={loading}>
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
  const total = apps.length;
  const activeCount = apps.filter((a) => a.status !== "rejected").length;

  const byStatus = Object.fromEntries(
    COLUMNS.map((c) => [c.status, apps.filter((a) => a.status === c.status)])
  ) as Record<ApplicationStatus, Application[]>;

  return (
    <Container size="4" p={{ initial: "4", md: "8" }}>
      {/* Header */}
      <Flex justify="between" align="center" mb="4" wrap="wrap" gap="3">
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
        <AddApplicationDialog onCreated={() => refetch()} />
      </Flex>

      {/* Pipeline funnel */}
      {!loading && total > 0 && <PipelineFunnel apps={apps} />}

      {/* Loading */}
      {loading && (
        <Flex direction="column" gap="3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} height="52px" />
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

      {/* Grouped sections */}
      {!loading && total > 0 && (
        <Box>
          {COLUMNS.map((col) => (
            <StatusSection
              key={col.status}
              column={col}
              apps={byStatus[col.status] ?? []}
              onMove={handleMove}
              onReject={handleReject}
              defaultOpen={col.status !== "rejected"}
            />
          ))}
        </Box>
      )}
    </Container>
  );
}
