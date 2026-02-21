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
  Table,
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
// Applications Table
// ──────────────────────────────────────────────────────────────────────────────
function ApplicationsTable({
  apps,
  onMove,
  onReject,
}: {
  apps: Application[];
  onMove: (id: number, status: ApplicationStatus) => void;
  onReject: (id: number) => void;
}) {
  return (
    <Table.Root variant="surface">
      <Table.Header>
        <Table.Row>
          <Table.ColumnHeaderCell>Company</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell>Role</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell>Status</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell>Applied</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell />
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {apps.map((app) => {
          const displayName = app.companyName ?? app.jobId;
          const displayTitle = app.jobTitle ?? "Job application";
          const initials = companyInitials(displayName);
          const nextStatus = NEXT_STATUS[app.status];
          const nextLabel = COLUMNS.find((c) => c.status === nextStatus)?.label;
          const statusCol = COLUMNS.find((c) => c.status === app.status);

          return (
            <Table.Row key={app.id}>
              <Table.Cell>
                <Flex align="center" gap="2">
                  <Box
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 6,
                      backgroundColor: "var(--accent-3)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      fontWeight: 700,
                      fontSize: 11,
                      color: "var(--accent-11)",
                    }}
                  >
                    {initials}
                  </Box>
                  <Text size="2" weight="medium">
                    {app.companyName ?? "—"}
                  </Text>
                </Flex>
              </Table.Cell>
              <Table.Cell>
                <Flex align="center" gap="1">
                  <Text size="2">{displayTitle}</Text>
                  {app.jobId.startsWith("http") && (
                    <Tooltip content="Open job posting">
                      <IconButton size="1" variant="ghost" color="gray" asChild>
                        <a href={app.jobId} target="_blank" rel="noopener noreferrer">
                          <ExternalLinkIcon />
                        </a>
                      </IconButton>
                    </Tooltip>
                  )}
                </Flex>
              </Table.Cell>
              <Table.Cell>
                <Badge color={statusCol?.color ?? "gray"} variant="soft" size="1">
                  {statusCol?.label ?? app.status}
                </Badge>
              </Table.Cell>
              <Table.Cell>
                <Text size="2" color="gray">
                  {formatDate(app.createdAt)}
                </Text>
              </Table.Cell>
              <Table.Cell>
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
              </Table.Cell>
            </Table.Row>
          );
        })}
      </Table.Body>
    </Table.Root>
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
  const total = apps.length;
  const activeCount = apps.filter((a) => a.status !== "rejected").length;

  return (
    <Container size="4" p={{ initial: "4", md: "8" }}>
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
        <Table.Root variant="surface">
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeaderCell>Company</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Role</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Status</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Applied</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell />
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {Array.from({ length: 5 }).map((_, i) => (
              <Table.Row key={i}>
                <Table.Cell><Skeleton height="20px" width="120px" /></Table.Cell>
                <Table.Cell><Skeleton height="20px" width="180px" /></Table.Cell>
                <Table.Cell><Skeleton height="20px" width="80px" /></Table.Cell>
                <Table.Cell><Skeleton height="20px" width="60px" /></Table.Cell>
                <Table.Cell><Skeleton height="20px" width="24px" /></Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
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

      {/* Applications table */}
      {!loading && total > 0 && (
        <ApplicationsTable
          apps={apps}
          onMove={handleMove}
          onReject={handleReject}
        />
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
