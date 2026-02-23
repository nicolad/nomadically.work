"use client";

import ReactMarkdown from "react-markdown";
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
  Dialog,
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
import {
  useGetApplicationQuery,
  useUpdateApplicationMutation,
  useGetTracksQuery,
  useLinkTrackToApplicationMutation,
  useUnlinkTrackFromApplicationMutation,
  useGenerateInterviewPrepMutation,
  useGenerateTopicDeepDiveMutation,
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
  const id = Number(params.id);

  const { data, loading } = useGetApplicationQuery({
    variables: { id },
    skip: isNaN(id),
  });

  const [updateApplication] = useUpdateApplicationMutation();
  const [linkTrack] = useLinkTrackToApplicationMutation();
  const [unlinkTrack] = useUnlinkTrackFromApplicationMutation();
  const [generateInterviewPrep] = useGenerateInterviewPrepMutation();
  const [generateTopicDeepDive] = useGenerateTopicDeepDiveMutation();
  const { data: tracksData } = useGetTracksQuery();
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [selectedReq, setSelectedReq] = useState<AiInterviewPrepRequirement | null>(null);
  const [deepDiveLoading, setDeepDiveLoading] = useState(false);
  const [deepDiveError, setDeepDiveError] = useState<string | null>(null);

  const app = data?.application;

  const handleStatusChange = async (status: ApplicationStatus) => {
    if (!app) return;
    await updateApplication({
      variables: { id: app.id, input: { status } },
      refetchQueries: ["GetApplication"],
    });
  };

  const scrollToJobDescription = () =>
    document.getElementById("job-description")?.scrollIntoView({ behavior: "smooth" });

  const handleOpenTopic = async (req: AiInterviewPrepRequirement) => {
    setSelectedReq(req);
    setDeepDiveError(null);
    if (!req.deepDive) {
      setDeepDiveLoading(true);
      try {
        const result = await generateTopicDeepDive({
          variables: { applicationId: app!.id, requirement: req.requirement },
          refetchQueries: ["GetApplication"],
        });
        // Update selectedReq with fresh data from response
        const updatedReqs = result.data?.generateTopicDeepDive?.aiInterviewPrep?.requirements;
        const updatedReq = updatedReqs?.find((r) => r.requirement === req.requirement);
        if (updatedReq) setSelectedReq(updatedReq as AiInterviewPrepRequirement);
      } catch (e) {
        setDeepDiveError(e instanceof Error ? e.message : "Generation failed");
      } finally {
        setDeepDiveLoading(false);
      }
    }
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
        <Card mb="5" id="job-description">
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
              {generating ? "Generating..." : app.aiInterviewPrep ? "Regenerate" : "Generate with AI"}
            </Button>
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
            <Flex direction="column" gap="2">
              {app.aiInterviewPrep.requirements.map((req: AiInterviewPrepRequirement) => (
                <Box
                  key={req.requirement}
                  p="3"
                  role="button"
                  tabIndex={0}
                  onClick={() => handleOpenTopic(req)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") handleOpenTopic(req);
                  }}
                  style={{
                    backgroundColor: "var(--gray-2)",
                    borderRadius: "var(--radius-2)",
                    cursor: "pointer",
                    transition: "background-color 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.backgroundColor = "var(--gray-3)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.backgroundColor = "var(--gray-2)";
                  }}
                >
                  <Flex justify="between" align="start" gap="2">
                    <Box style={{ flex: 1 }}>
                      <Text size="2" weight="bold" mb="1" as="div">
                        {req.requirement}
                      </Text>
                      {req.sourceQuote && (
                        <Text size="1" color="gray" as="div" style={{ fontStyle: "italic" }}>
                          &ldquo;{req.sourceQuote}&rdquo;
                        </Text>
                      )}
                    </Box>
                    <Flex gap="1" align="center" style={{ flexShrink: 0 }}>
                      {req.deepDive && (
                        <Badge size="1" variant="soft" color="green">
                          Ready
                        </Badge>
                      )}
                      <Text size="1" color="gray">
                        ›
                      </Text>
                    </Flex>
                  </Flex>
                  <Flex gap="1" wrap="wrap" mt="2">
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
      <Dialog.Root
        open={!!selectedReq}
        onOpenChange={(o) => {
          if (!o) {
            setSelectedReq(null);
            setDeepDiveError(null);
          }
        }}
      >
        <Dialog.Content maxWidth="680px" style={{ maxHeight: "85vh", overflowY: "auto" }}>
          {selectedReq && (
            <>
              <Dialog.Title>{selectedReq.requirement}</Dialog.Title>
              {selectedReq.sourceQuote && (
                <Box
                  mb="4"
                  pl="3"
                  role="button"
                  tabIndex={0}
                  style={{ borderLeft: "3px solid var(--accent-6)", cursor: "pointer" }}
                  onClick={() => { setSelectedReq(null); scrollToJobDescription(); }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      setSelectedReq(null);
                      scrollToJobDescription();
                    }
                  }}
                >
                  <Text size="1" color="gray" as="div" style={{ fontStyle: "italic" }}>
                    &ldquo;{selectedReq.sourceQuote}&rdquo;
                  </Text>
                </Box>
              )}

              {/* Interview questions */}
              <Text size="1" color="gray" weight="medium" mb="2" as="div">
                INTERVIEW QUESTIONS
              </Text>
              <Flex direction="column" gap="2" mb="4">
                {selectedReq.questions.map((q, i) => (
                  <Text key={q} size="2" as="div">
                    {i + 1}. {q}
                  </Text>
                ))}
              </Flex>

              {/* Study topics */}
              <Text size="1" color="gray" weight="medium" mb="2" as="div">
                STUDY TOPICS
              </Text>
              <Flex gap="2" wrap="wrap" mb="4">
                {selectedReq.studyTopics.map((t) => (
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

              {/* Deep dive section */}
              <Box pt="4" style={{ borderTop: "1px solid var(--gray-4)" }}>
                <Text size="1" color="gray" weight="medium" mb="3" as="div">
                  DEEP DIVE
                </Text>
                {deepDiveLoading ? (
                  <Flex direction="column" gap="3" py="4" align="center">
                    <Text size="2" color="gray">
                      Generating deep-dive with DeepSeek Reasoner…
                    </Text>
                    <Flex gap="2">
                      {[0, 1, 2].map((i) => (
                        <Box
                          key={i}
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            backgroundColor: "var(--accent-9)",
                            animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                          }}
                        />
                      ))}
                    </Flex>
                  </Flex>
                ) : deepDiveError ? (
                  <Text size="2" color="red">
                    {deepDiveError}
                  </Text>
                ) : selectedReq.deepDive ? (
                  <Box className="deep-dive-content">
                    <ReactMarkdown>{selectedReq.deepDive}</ReactMarkdown>
                  </Box>
                ) : null}
              </Box>

              <Flex justify="end" mt="4">
                <Dialog.Close>
                  <Button variant="soft" color="gray" size="2">
                    Close
                  </Button>
                </Dialog.Close>
              </Flex>
            </>
          )}
        </Dialog.Content>
      </Dialog.Root>
    </Container>
  );
}
