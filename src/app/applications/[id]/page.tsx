"use client";

import {
  Container,
  Heading,
  Button,
  Flex,
  Text,
  Box,
  Card,
  Badge,
  Skeleton,
  TextArea,
  DropdownMenu,
  Select,
  IconButton,
} from "@radix-ui/themes";
import {
  ArrowLeftIcon,
  ExternalLinkIcon,
  ChevronDownIcon,
  Cross1Icon,
  PlusIcon,
} from "@radix-ui/react-icons";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-hooks";
import {
  useGetApplicationQuery,
  useUpdateApplicationMutation,
  useGetTracksQuery,
  useLinkTrackToApplicationMutation,
  useUnlinkTrackFromApplicationMutation,
  useGenerateInterviewPrepMutation,
} from "@/__generated__/hooks";
import type { ApplicationStatus, AiInterviewPrepRequirement } from "@/__generated__/hooks";
import Link from "next/link";

const COLUMNS: {
  status: ApplicationStatus;
  label: string;
  color: "gray" | "blue" | "orange" | "green" | "red";
}[] = [
  { status: "pending", label: "Saved", color: "gray" },
  { status: "submitted", label: "Applied", color: "blue" },
  { status: "reviewed", label: "Interviewing", color: "orange" },
  { status: "accepted", label: "Offer", color: "green" },
  { status: "rejected", label: "Rejected", color: "red" },
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function companyInitials(name: string): string {
  return name
    .split(/[\s\-_.]/)
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function ApplicationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const id = Number(params.id);

  const { data, loading } = useGetApplicationQuery({
    variables: { id },
    skip: !user || isNaN(id),
  });

  const [updateApplication] = useUpdateApplicationMutation();
  const [linkTrack] = useLinkTrackToApplicationMutation();
  const [unlinkTrack] = useUnlinkTrackFromApplicationMutation();
  const [generateInterviewPrep] = useGenerateInterviewPrepMutation();
  const { data: tracksData } = useGetTracksQuery();
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  const app = data?.application;

  const handleStatusChange = async (status: ApplicationStatus) => {
    if (!app) return;
    await updateApplication({
      variables: { id: app.id, input: { status } },
      refetchQueries: ["GetApplication"],
    });
  };

  const handleSaveNotes = async () => {
    if (!app) return;
    await updateApplication({
      variables: { id: app.id, input: { notes: notesValue } },
      refetchQueries: ["GetApplication"],
    });
    setEditingNotes(false);
  };

  const statusCol = app
    ? COLUMNS.find((c) => c.status === app.status)
    : undefined;

  if (!user) {
    return (
      <Container size="3" p="8">
        <Card style={{ textAlign: "center" }}>
          <Text color="gray">Sign in to view your applications.</Text>
        </Card>
      </Container>
    );
  }

  if (loading) {
    return (
      <Container size="3" p="8">
        <Skeleton height="32px" mb="6" style={{ maxWidth: 200 }} />
        <Skeleton height="400px" />
      </Container>
    );
  }

  if (!app) {
    return (
      <Container size="3" p="8">
        <Card>
          <Flex direction="column" align="center" gap="4" p="6">
            <Heading size="5">Application Not Found</Heading>
            <Text color="gray">
              This application doesn't exist or you don't have access.
            </Text>
            <Button asChild>
              <Link href="/applications">Back to Applications</Link>
            </Button>
          </Flex>
        </Card>
      </Container>
    );
  }

  const displayName = app.companyName ?? app.jobId;
  const displayTitle = app.jobTitle ?? "Job application";
  const initials = companyInitials(displayName);

  return (
    <Container size="3" p={{ initial: "4", md: "8" }}>
      {/* Back link */}
      <Box mb="6">
        <Button variant="ghost" asChild>
          <Link href="/applications">
            <ArrowLeftIcon /> Back to Applications
          </Link>
        </Button>
      </Box>

      {/* Header */}
      <Flex gap="4" align="start" mb="6">
        <Box
          style={{
            width: 48,
            height: 48,
            borderRadius: 8,
            backgroundColor: "var(--accent-3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            fontWeight: 700,
            fontSize: 16,
            color: "var(--accent-11)",
          }}
        >
          {initials}
        </Box>
        <Box style={{ flex: 1 }}>
          <Heading size="7" mb="1">
            {displayTitle}
          </Heading>
          <Text size="3" color="gray">
            {app.companyName ?? "Unknown company"} &middot; Added{" "}
            {formatDate(app.createdAt)}
          </Text>
        </Box>
      </Flex>

      {/* Status + Actions */}
      <Card mb="5">
        <Flex justify="between" align="center">
          <Flex align="center" gap="3">
            <Text size="2" weight="medium">
              Status
            </Text>
            <Badge
              color={statusCol?.color ?? "gray"}
              variant="soft"
              size="2"
            >
              {statusCol?.label ?? app.status}
            </Badge>
          </Flex>
          <DropdownMenu.Root>
            <DropdownMenu.Trigger>
              <Button variant="soft" size="2">
                Change Status <ChevronDownIcon />
              </Button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content size="1">
              {COLUMNS.map((col) => (
                <DropdownMenu.Item
                  key={col.status}
                  disabled={col.status === app.status}
                  onClick={() => handleStatusChange(col.status)}
                >
                  <Badge color={col.color} variant="soft" size="1">
                    {col.label}
                  </Badge>
                </DropdownMenu.Item>
              ))}
            </DropdownMenu.Content>
          </DropdownMenu.Root>
        </Flex>
      </Card>

      {/* Job link */}
      {app.jobId.startsWith("http") && (
        <Card mb="5">
          <Flex align="center" gap="2">
            <Text size="2" weight="medium">
              Job Posting
            </Text>
            <a
              href={app.jobId}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                color: "var(--accent-11)",
                textDecoration: "none",
              }}
            >
              <Text size="2" style={{ wordBreak: "break-all" }}>
                {app.jobId}
              </Text>
              <ExternalLinkIcon />
            </a>
          </Flex>
        </Card>
      )}

      {/* Resume */}
      {app.resume && (
        <Card mb="5">
          <Flex align="center" gap="2">
            <Text size="2" weight="medium">
              Resume
            </Text>
            <a
              href={app.resume as unknown as string}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "var(--accent-11)" }}
            >
              <Text size="2">View Resume</Text>
            </a>
          </Flex>
        </Card>
      )}

      {/* Questions & Answers */}
      {app.questions && app.questions.length > 0 && (
        <Card mb="5">
          <Heading size="4" mb="3">
            Questions & Answers ({app.questions.length})
          </Heading>
          <Flex direction="column" gap="3">
            {app.questions.map((q, idx) => (
              <Box
                key={q.questionId}
                p="3"
                style={{
                  backgroundColor: "var(--gray-3)",
                  borderRadius: "var(--radius-2)",
                }}
              >
                <Text size="2" weight="medium" mb="1" as="div">
                  {idx + 1}. {q.questionText}
                </Text>
                <Text size="2" color="gray">
                  {q.answerText || "No answer provided"}
                </Text>
              </Box>
            ))}
          </Flex>
        </Card>
      )}

      {/* Job Description */}
      {app.jobDescription && (
        <Card mb="5">
          <Heading size="4" mb="3">
            Job Description
          </Heading>
          <Box
            style={{ lineHeight: 1.7, fontSize: "var(--font-size-2)" }}
            dangerouslySetInnerHTML={{ __html: app.jobDescription }}
          />
        </Card>
      )}

      {/* Interview Prep */}
      <Card mb="5">
        <Flex justify="between" align="center" mb="3">
          <Heading size="4">Interview Prep</Heading>
          <Flex gap="2" align="center">
            {!app.aiInterviewPrep && (
              <Button
                variant="soft"
                size="2"
                disabled={generating || !app.jobDescription}
                title={!app.jobDescription ? "No job description available for this application" : undefined}
                onClick={async () => {
                  setGenerating(true);
                  setGenerateError(null);
                  try {
                    await generateInterviewPrep({
                      variables: { applicationId: app.id },
                      refetchQueries: ["GetApplication"],
                    });
                  } catch (e) {
                    const msg = e instanceof Error ? e.message : "Generation failed";
                    setGenerateError(msg);
                  } finally {
                    setGenerating(false);
                  }
                }}
              >
                <PlusIcon />
                {generating ? "Generating..." : "Generate with AI"}
              </Button>
            )}
            {generateError && (
              <Text size="1" color="red">
                {generateError}
              </Text>
            )}
          {(() => {
            const linkedSlugs = new Set(
              app.interviewPrep?.map((t) => t.slug) ?? [],
            );
            const available = (tracksData?.tracks ?? []).filter(
              (t) => !linkedSlugs.has(t.slug),
            );
            if (available.length === 0) return null;
            return (
              <Select.Root
                onValueChange={(slug) => {
                  linkTrack({
                    variables: { applicationId: app.id, trackSlug: slug },
                    refetchQueries: ["GetApplication"],
                  });
                }}
              >
                <Select.Trigger placeholder="Add track..." variant="soft" />
                <Select.Content>
                  {available.map((t) => (
                    <Select.Item key={t.slug} value={t.slug}>
                      {t.title}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
            );
          })()}
          </Flex>
        </Flex>
        {app.interviewPrep && app.interviewPrep.length > 0 ? (
          <Flex direction="column" gap="2">
            {app.interviewPrep.map((track) => (
              <Flex
                key={track.slug}
                align="center"
                justify="between"
                p="3"
                style={{
                  backgroundColor: "var(--gray-3)",
                  borderRadius: "var(--radius-2)",
                }}
              >
                <Box>
                  <Text size="2" weight="medium" as="div">
                    {track.title}
                  </Text>
                  {track.description && (
                    <Text size="1" color="gray">
                      {track.description}
                    </Text>
                  )}
                </Box>
                <Flex align="center" gap="2">
                  {track.level && (
                    <Badge size="1" variant="soft" color="blue">
                      {track.level}
                    </Badge>
                  )}
                  <IconButton
                    size="1"
                    variant="ghost"
                    color="gray"
                    onClick={() => {
                      unlinkTrack({
                        variables: {
                          applicationId: app.id,
                          trackSlug: track.slug,
                        },
                        refetchQueries: ["GetApplication"],
                      });
                    }}
                  >
                    <Cross1Icon />
                  </IconButton>
                </Flex>
              </Flex>
            ))}
          </Flex>
        ) : (
          <Text size="2" color="gray">
            No prep tracks linked yet. Add one to start preparing.
          </Text>
        )}
        {app.aiInterviewPrep && (
          <Box mt="4" pt="4" style={{ borderTop: "1px solid var(--gray-4)" }}>
            <Text size="1" color="gray" weight="medium" mb="3" as="div">
              AI-GENERATED PREP
            </Text>
            <Text size="2" color="gray" mb="4" as="div">
              {app.aiInterviewPrep.summary}
            </Text>
            <Flex direction="column" gap="3">
              {app.aiInterviewPrep.requirements.map((req: AiInterviewPrepRequirement) => (
                <Box
                  key={req.requirement}
                  p="3"
                  style={{
                    backgroundColor: "var(--gray-2)",
                    borderRadius: "var(--radius-2)",
                  }}
                >
                  <Text size="2" weight="bold" mb="2" as="div">
                    {req.requirement}
                  </Text>
                  <Text size="1" color="gray" mb="1" as="div">
                    Interview questions:
                  </Text>
                  <Flex direction="column" gap="1" mb="2">
                    {req.questions.map((q: string) => (
                      <Text key={q} size="2" as="div">
                        • {q}
                      </Text>
                    ))}
                  </Flex>
                  <Text size="1" color="gray" mb="1" as="div">
                    Study topics:
                  </Text>
                  <Flex gap="2" wrap="wrap">
                    {req.studyTopics.map((t: string) => (
                      <Text
                        key={t}
                        size="1"
                        style={{
                          padding: "2px 8px",
                          backgroundColor: "var(--violet-3)",
                          borderRadius: "4px",
                        }}
                      >
                        {t}
                      </Text>
                    ))}
                  </Flex>
                </Box>
              ))}
            </Flex>
          </Box>
        )}
      </Card>

      {/* Notes */}
      <Card>
        <Flex justify="between" align="center" mb="3">
          <Heading size="4">Notes</Heading>
          {!editingNotes && (
            <Button
              variant="soft"
              size="1"
              onClick={() => {
                setNotesValue(app.notes ?? "");
                setEditingNotes(true);
              }}
            >
              {app.notes ? "Edit" : "Add Notes"}
            </Button>
          )}
        </Flex>
        {editingNotes ? (
          <Flex direction="column" gap="2">
            <TextArea
              value={notesValue}
              onChange={(e) => setNotesValue(e.target.value)}
              placeholder="Add notes about this application..."
              rows={4}
            />
            <Flex gap="2" justify="end">
              <Button
                variant="soft"
                color="gray"
                size="1"
                onClick={() => setEditingNotes(false)}
              >
                Cancel
              </Button>
              <Button size="1" onClick={handleSaveNotes}>
                Save
              </Button>
            </Flex>
          </Flex>
        ) : (
          <Text size="2" color={app.notes ? undefined : "gray"}>
            {app.notes || "No notes yet."}
          </Text>
        )}
      </Card>
    </Container>
  );
}
