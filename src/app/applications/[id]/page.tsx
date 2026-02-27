"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
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
  Tabs,
} from "@radix-ui/themes";
import {
  ArrowLeftIcon,
  ExternalLinkIcon,
  ChevronDownIcon,
  Cross1Icon,
  PlusIcon,
  Pencil1Icon,
  Link2Icon,
  TrashIcon,
} from "@radix-ui/react-icons";
import { useState, useRef, useCallback, useMemo, useEffect, lazy, Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  useGetApplicationQuery,
  useUpdateApplicationMutation,
  useGetTracksQuery,
  useLinkTrackToApplicationMutation,
  useUnlinkTrackFromApplicationMutation,
  useGenerateInterviewPrepMutation,
  useGenerateTopicDeepDiveMutation,
  useGenerateStudyTopicDeepDiveMutation,
  useGetCompanyQuery,
  useUpdateCompanyMutation,
  useGenerateRequirementFromSelectionMutation,
  useLinkSelectionToRequirementMutation,
  useDeleteApplicationMutation,
  useGenerateInterviewQuestionsMutation,
  useGenerateAgenticCodingMutation,
} from "@/__generated__/hooks";
import type { ApplicationStatus, AiInterviewPrepRequirement } from "@/__generated__/hooks";
import { useTextSelection } from "@/hooks/useTextSelection";
import { TextSelectionToolbar } from "@/components/app-detail/TextSelectionToolbar";
import { PrepLinkPanel } from "@/components/app-detail/PrepLinkPanel";
import { JobDescriptionWithHighlights } from "@/components/app-detail/JobDescriptionWithHighlights";
import Link from "next/link";
import { useAuth } from "@/lib/auth-hooks";
import { ADMIN_EMAIL } from "@/lib/constants";
import { CompanyPicker } from "@/components/company-picker";
import { findBestMatch } from "@/lib/match-requirement";

const InterviewPrepFlow = lazy(() => import("@/components/interview-prep-flow"));

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

  const { data, loading, refetch } = useGetApplicationQuery({
    variables: { id },
    skip: isNaN(id),
  });

  const [updateApplication] = useUpdateApplicationMutation();
  const [deleteApplication] = useDeleteApplicationMutation();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [linkTrack] = useLinkTrackToApplicationMutation();
  const [unlinkTrack] = useUnlinkTrackFromApplicationMutation();
  const [generateInterviewPrep] = useGenerateInterviewPrepMutation();
  const [generateTopicDeepDive] = useGenerateTopicDeepDiveMutation();
  const [generateStudyTopicDeepDive] = useGenerateStudyTopicDeepDiveMutation();
  const [generateRequirementFromSelection] = useGenerateRequirementFromSelectionMutation();
  const [linkSelectionToRequirement] = useLinkSelectionToRequirementMutation();
  const [generateInterviewQuestions] = useGenerateInterviewQuestionsMutation();
  const [generateAgenticCoding] = useGenerateAgenticCodingMutation();
  const { data: tracksData } = useGetTracksQuery();
  const { user } = useAuth();
  const isAdmin = user?.email === ADMIN_EMAIL;

  const app = data?.application;

  const { data: companyData } = useGetCompanyQuery({
    variables: { key: app?.companyKey ?? "" },
    skip: !app?.companyKey || !isAdmin,
  });
  const [updateCompany] = useUpdateCompanyMutation();
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [selectedReq, setSelectedReq] = useState<AiInterviewPrepRequirement | null>(null);
  const [deepDiveLoading, setDeepDiveLoading] = useState(false);
  const [deepDiveError, setDeepDiveError] = useState<string | null>(null);
  const [selectedStudyTopic, setSelectedStudyTopic] = useState<{ req: AiInterviewPrepRequirement; topic: string } | null>(null);
  const [studyTopicLoading, setStudyTopicLoading] = useState(false);
  const [studyTopicError, setStudyTopicError] = useState<string | null>(null);
  const [editingCompany, setEditingCompany] = useState(false);
  const [companyNameValue, setCompanyNameValue] = useState("");
  const [companyWebsiteValue, setCompanyWebsiteValue] = useState("");
  const [companySaving, setCompanySaving] = useState(false);
  const [companySaveError, setCompanySaveError] = useState<string | null>(null);
  const [editingJobDescription, setEditingJobDescription] = useState(false);
  const [jobDescriptionValue, setJobDescriptionValue] = useState("");
  const [prepView, setPrepView] = useState<"list" | "graph">("list");
  const [generatingRecruiter, setGeneratingRecruiter] = useState(false);
  const [recruiterError, setRecruiterError] = useState<string | null>(null);
  const [generatingTechnical, setGeneratingTechnical] = useState(false);
  const [technicalError, setTechnicalError] = useState<string | null>(null);
  const [questionsTab, setQuestionsTab] = useState<"recruiter" | "technical">("recruiter");
  const [generatingAgentic, setGeneratingAgentic] = useState(false);
  const [agenticError, setAgenticError] = useState<string | null>(null);
  const [agenticExerciseOpen, setAgenticExerciseOpen] = useState<number | null>(null);
  const [copiedPrompt, setCopiedPrompt] = useState<number | null>(null);

  // Text selection state
  const jobDescriptionRef = useRef<HTMLDivElement | null>(null);
  const { selectedText, selectionRect, clearSelection } = useTextSelection(jobDescriptionRef);
  const [linkPanelOpen, setLinkPanelOpen] = useState(false);
  const [pendingLinkText, setPendingLinkText] = useState("");
  const [generatingFromSelection, setGeneratingFromSelection] = useState(false);
  const [linkingRequirement, setLinkingRequirement] = useState<string | null>(null);
  const [selectionError, setSelectionError] = useState<string | null>(null);
  const [isDiving, setIsDiving] = useState(false);
  const [flashRequirement, setFlashRequirement] = useState<string | null>(null);
  const [activeLinkTarget, setActiveLinkTarget] = useState<string | null>(null);

  const requirements = app?.aiInterviewPrep?.requirements ?? [];
  const bestMatch = useMemo(() => {
    if (!selectedText || requirements.length === 0) return null;
    const match = findBestMatch(selectedText, requirements);
    if (!match) return null;
    return { requirement: match.requirement.requirement, score: match.score };
  }, [selectedText, requirements]);

  useEffect(() => {
    if (!flashRequirement) return;
    const t = setTimeout(() => setFlashRequirement(null), 2000);
    return () => clearTimeout(t);
  }, [flashRequirement]);

  const handleAutoLink = useCallback(async (requirement: string) => {
    if (!app) return;
    setLinkingRequirement(requirement);
    setSelectionError(null);
    try {
      await linkSelectionToRequirement({
        variables: { applicationId: app.id, requirement, sourceQuote: selectedText },
        refetchQueries: ["GetApplication"],
      });
      clearSelection();
      if (activeLinkTarget === requirement) setActiveLinkTarget(null);
    } catch (e) {
      setSelectionError(e instanceof Error ? e.message : "Link failed");
    } finally {
      setLinkingRequirement(null);
    }
  }, [app, selectedText, clearSelection, linkSelectionToRequirement, activeLinkTarget]);

  const handleGenerateFromSelection = useCallback(async (text: string) => {
    if (!app) return;
    clearSelection();
    setGeneratingFromSelection(true);
    setSelectionError(null);
    try {
      const { data: result } = await generateRequirementFromSelection({
        variables: { applicationId: app.id, selectedText: text },
        refetchQueries: ["GetApplication"],
      });
      const updatedReqs = result?.generateRequirementFromSelection?.aiInterviewPrep?.requirements;
      if (updatedReqs && updatedReqs.length > 0) {
        const newReq = updatedReqs[updatedReqs.length - 1] as AiInterviewPrepRequirement;
        setFlashRequirement(newReq.requirement);
        setGeneratingFromSelection(false);
        await handleOpenTopic(newReq);
        return;
      }
    } catch (e) {
      setSelectionError(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setGeneratingFromSelection(false);
    }
  }, [app, clearSelection, generateRequirementFromSelection]); // handleOpenTopic intentionally omitted — plain function, defined later in scope

  const handleOpenLinkPanel = useCallback((text: string) => {
    clearSelection();
    setPendingLinkText(text);
    setLinkPanelOpen(true);
  }, [clearSelection]);

  const handleLinkRequirement = useCallback(async (requirement: string) => {
    if (!app) return;
    setLinkingRequirement(requirement);
    setSelectionError(null);
    try {
      await linkSelectionToRequirement({
        variables: { applicationId: app.id, requirement, sourceQuote: pendingLinkText },
        refetchQueries: ["GetApplication"],
      });
      setLinkPanelOpen(false);
      setPendingLinkText("");
    } catch (e) {
      setSelectionError(e instanceof Error ? e.message : "Link failed");
    } finally {
      setLinkingRequirement(null);
    }
  }, [app, pendingLinkText, linkSelectionToRequirement]);

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

  const handleDiveDeep = useCallback(async (text: string) => {
    const currentMatch = bestMatch;
    if (!app || !currentMatch) return;
    if (!app.aiInterviewPrep) {
      setSelectionError("Generate interview prep first before diving deep");
      return;
    }
    const reqName = currentMatch.requirement;
    setIsDiving(true);
    setSelectionError(null);
    try {
      await linkSelectionToRequirement({
        variables: { applicationId: app.id, requirement: reqName, sourceQuote: text },
      });
      clearSelection();
      const { data: freshData } = await refetch();
      const freshReq = freshData?.application?.aiInterviewPrep?.requirements?.find(
        (r) => r.requirement === reqName,
      );
      if (freshReq) {
        setFlashRequirement(reqName);
        await handleOpenTopic(freshReq as AiInterviewPrepRequirement);
      }
    } catch (e) {
      setSelectionError(e instanceof Error ? e.message : "Dive failed");
    } finally {
      setIsDiving(false);
    }
  }, [app, bestMatch, linkSelectionToRequirement, clearSelection, refetch, handleOpenTopic]);

  const handleOpenStudyTopic = async (e: React.MouseEvent, req: AiInterviewPrepRequirement, topic: string) => {
    e.stopPropagation();
    const existing = req.studyTopicDeepDives?.find((d) => d.topic === topic);
    setSelectedStudyTopic({ req, topic });
    setStudyTopicError(null);
    if (!existing?.deepDive) {
      setStudyTopicLoading(true);
      try {
        const result = await generateStudyTopicDeepDive({
          variables: { applicationId: app!.id, requirement: req.requirement, studyTopic: topic },
          refetchQueries: ["GetApplication"],
        });
        const updatedReqs = result.data?.generateStudyTopicDeepDive?.aiInterviewPrep?.requirements;
        const updatedReq = updatedReqs?.find((r) => r.requirement === req.requirement);
        if (updatedReq) setSelectedStudyTopic({ req: updatedReq as AiInterviewPrepRequirement, topic });
      } catch (e) {
        setStudyTopicError(e instanceof Error ? e.message : "Generation failed");
      } finally {
        setStudyTopicLoading(false);
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

  const handleSaveCompany = async () => {
    const company = companyData?.company;
    if (!company) return;
    setCompanySaving(true);
    setCompanySaveError(null);
    try {
      await updateCompany({
        variables: {
          id: company.id,
          input: { name: companyNameValue, website: companyWebsiteValue || null },
        },
        refetchQueries: ["GetCompany"],
      });
      setEditingCompany(false);
    } catch (e) {
      setCompanySaveError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setCompanySaving(false);
    }
  };

  const handleSaveJobDescription = async () => {
    if (!app) return;
    await updateApplication({
      variables: { id: app.id, input: { jobDescription: jobDescriptionValue } },
      refetchQueries: ["GetApplication"],
    });
    setEditingJobDescription(false);
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
      <Flex justify="between" align="center" mb="6">
        <Button variant="ghost" asChild>
          <Link href="/applications">
            <ArrowLeftIcon /> Back to Applications
          </Link>
        </Button>
        <Button variant="soft" color="red" size="2" onClick={() => setDeleteDialogOpen(true)}>
          <TrashIcon /> Delete
        </Button>
      </Flex>

      {/* Delete confirmation dialog */}
      <Dialog.Root open={deleteDialogOpen} onOpenChange={(o) => { if (!o && !deleting) setDeleteDialogOpen(false); }}>
        <Dialog.Content maxWidth="400px">
          <Dialog.Title>Delete application?</Dialog.Title>
          <Dialog.Description size="2" color="gray">
            This will permanently delete this application and all associated data. This action cannot be undone.
          </Dialog.Description>
          <Flex gap="2" justify="end" mt="4">
            <Dialog.Close>
              <Button variant="soft" color="gray" size="2" disabled={deleting}>Cancel</Button>
            </Dialog.Close>
            <Button
              color="red"
              size="2"
              disabled={deleting}
              onClick={async () => {
                if (!app) return;
                setDeleting(true);
                try {
                  await deleteApplication({ variables: { id: app.id } });
                  router.push("/applications");
                } catch {
                  setDeleting(false);
                  setDeleteDialogOpen(false);
                }
              }}
            >
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>

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
          <Flex align="center" gap="2" wrap="wrap">
            <Text size="3" color="gray">
              {app.companyKey ? (
                <Link href={`/companies/${app.companyKey}`} target="_blank" rel="noopener noreferrer" style={{ color: "inherit", textDecoration: "underline", textUnderlineOffset: 2 }}>
                  {app.companyName ?? "Unknown company"}
                </Link>
              ) : (
                app.companyName ?? "Unknown company"
              )}{" "}
              &middot; Added {formatDate(app.createdAt)}
            </Text>
            {isAdmin && app.companyKey && (
              <IconButton
                size="1"
                variant="ghost"
                color="gray"
                onClick={() => {
                  setCompanyNameValue(companyData?.company?.name ?? app.companyName ?? "");
                  setCompanyWebsiteValue(companyData?.company?.website ?? "");
                  setCompanySaveError(null);
                  setEditingCompany(true);
                }}
              >
                <Pencil1Icon />
              </IconButton>
            )}
            {isAdmin && !app.companyKey && (
              <CompanyPicker
                companyKey={app.companyKey}
                companyName={app.companyName}
                onLinked={async (_key, name) => {
                  // Update application's company_name so the LEFT JOIN resolves
                  await updateApplication({
                    variables: { id: app.id, input: { companyName: name } },
                    refetchQueries: ["GetApplication"],
                  });
                }}
              />
            )}
          </Flex>
        </Box>
      </Flex>

      {/* Company edit dialog */}
      <Dialog.Root open={editingCompany} onOpenChange={(o) => { if (!o) setEditingCompany(false); }}>
        <Dialog.Content maxWidth="420px">
          <Dialog.Title>Edit Company</Dialog.Title>
          <Flex direction="column" gap="3" mt="2">
            <Box>
              <Text size="2" weight="medium" mb="1" as="div">Name</Text>
              <input
                value={companyNameValue}
                onChange={(e) => setCompanyNameValue(e.target.value)}
                placeholder="Company name"
                style={{
                  width: "100%",
                  padding: "6px 10px",
                  borderRadius: "var(--radius-2)",
                  border: "1px solid var(--gray-6)",
                  background: "var(--gray-2)",
                  color: "var(--gray-12)",
                  fontSize: "var(--font-size-2)",
                  boxSizing: "border-box",
                }}
              />
            </Box>
            <Box>
              <Text size="2" weight="medium" mb="1" as="div">Website</Text>
              <input
                value={companyWebsiteValue}
                onChange={(e) => setCompanyWebsiteValue(e.target.value)}
                placeholder="https://example.com"
                style={{
                  width: "100%",
                  padding: "6px 10px",
                  borderRadius: "var(--radius-2)",
                  border: "1px solid var(--gray-6)",
                  background: "var(--gray-2)",
                  color: "var(--gray-12)",
                  fontSize: "var(--font-size-2)",
                  boxSizing: "border-box",
                }}
              />
            </Box>
            {companySaveError && (
              <Text size="1" color="red">{companySaveError}</Text>
            )}
          </Flex>
          <Flex gap="2" justify="end" mt="4">
            <Dialog.Close>
              <Button variant="soft" color="gray" size="2">Cancel</Button>
            </Dialog.Close>
            <Button size="2" disabled={companySaving} onClick={handleSaveCompany}>
              {companySaving ? "Saving…" : "Save"}
            </Button>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>

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
          {isAdmin && (
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
          )}
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
      {activeLinkTarget && (
        <Flex
          mb="2"
          align="center"
          justify="between"
          style={{
            background: "var(--amber-3)",
            border: "1px solid var(--amber-7)",
            borderRadius: 4,
            padding: "6px 12px",
          }}
        >
          <Text size="2" style={{ color: "var(--amber-11)" }}>
            Select text to link to &ldquo;{activeLinkTarget.length > 40 ? activeLinkTarget.slice(0, 40) + "…" : activeLinkTarget}&rdquo;
          </Text>
          <Button size="1" variant="ghost" color="gray" onClick={() => setActiveLinkTarget(null)}>
            Cancel
          </Button>
        </Flex>
      )}
      <Card mb="5" id="job-description">
        <Flex justify="between" align="center" mb="3">
          <Heading size="4">Job Description</Heading>
          {isAdmin && !editingJobDescription && (
            <Button
              variant="soft"
              size="1"
              onClick={() => {
                setJobDescriptionValue(app.jobDescription ?? "");
                setEditingJobDescription(true);
              }}
            >
              {app.jobDescription ? "Edit" : "Add"}
            </Button>
          )}
        </Flex>
        {editingJobDescription ? (
          <Flex direction="column" gap="2">
            <TextArea
              value={jobDescriptionValue}
              onChange={(e) => setJobDescriptionValue(e.target.value)}
              placeholder="Paste the job description here..."
              rows={12}
            />
            <Flex gap="2" justify="end">
              <Button
                variant="soft"
                color="gray"
                size="1"
                onClick={() => setEditingJobDescription(false)}
              >
                Cancel
              </Button>
              <Button size="1" onClick={handleSaveJobDescription}>
                Save
              </Button>
            </Flex>
          </Flex>
        ) : app.jobDescription ? (
          <Box className="deep-dive-content" style={{ lineHeight: 1.7, fontSize: "var(--font-size-2)", position: "relative" }}>
            <JobDescriptionWithHighlights
              jobDescription={app.jobDescription}
              requirements={app.aiInterviewPrep?.requirements ?? []}
              onHighlightClick={(req) => handleOpenTopic(req)}
              containerRef={jobDescriptionRef}
              flashRequirement={flashRequirement}
            />
          </Box>
        ) : (
          <Text size="2" color="gray">No job description yet.</Text>
        )}
      </Card>

      {/* Interview Questions (AI-generated) */}
      <Card mb="5">
        <Heading size="4" mb="3">Interview Questions</Heading>

        {app.aiInterviewQuestions?.companyContext && (
          <Box mb="4" p="3" style={{ backgroundColor: "var(--blue-2)", borderRadius: "var(--radius-2)" }}>
            <Text size="1" color="gray" weight="medium" mb="1" as="div">COMPANY CONTEXT</Text>
            <Text size="2" as="div">{app.aiInterviewQuestions.companyContext}</Text>
          </Box>
        )}

        <Tabs.Root value={questionsTab} onValueChange={(v) => setQuestionsTab(v as "recruiter" | "technical")}>
          <Tabs.List>
            <Tabs.Trigger value="recruiter">
              Ask Recruiter
              {(app.aiInterviewQuestions?.recruiterQuestions?.length ?? 0) > 0 && (
                <Badge size="1" variant="soft" color="green" ml="2">{app.aiInterviewQuestions!.recruiterQuestions.length}</Badge>
              )}
            </Tabs.Trigger>
            <Tabs.Trigger value="technical">
              Technical Prep
              {(app.aiInterviewQuestions?.technicalQuestions?.length ?? 0) > 0 && (
                <Badge size="1" variant="soft" color="blue" ml="2">{app.aiInterviewQuestions!.technicalQuestions.length}</Badge>
              )}
            </Tabs.Trigger>
          </Tabs.List>

          <Tabs.Content value="recruiter">
            <Box pt="3">
              {isAdmin && (
                <Flex gap="2" align="center" mb="3">
                  <Button
                    variant="soft"
                    size="2"
                    color="green"
                    disabled={generatingRecruiter || !app.jobDescription}
                    title={!app.jobDescription ? "No job description available" : undefined}
                    onClick={async () => {
                      setGeneratingRecruiter(true);
                      setRecruiterError(null);
                      try {
                        await generateInterviewQuestions({
                          variables: { applicationId: app.id, type: "recruiter" },
                          refetchQueries: ["GetApplication"],
                        });
                      } catch (e) {
                        setRecruiterError(e instanceof Error ? e.message : "Generation failed");
                      } finally {
                        setGeneratingRecruiter(false);
                      }
                    }}
                  >
                    <PlusIcon />
                    {generatingRecruiter
                      ? "Generating..."
                      : (app.aiInterviewQuestions?.recruiterQuestions?.length ?? 0) > 0
                        ? "Regenerate"
                        : "Generate Questions to Ask"}
                  </Button>
                  {recruiterError && <Text size="1" color="red">{recruiterError}</Text>}
                </Flex>
              )}

              {generatingRecruiter && (
                <Flex direction="column" gap="3" py="6" align="center">
                  <Text size="2" color="gray">Generating smart questions to ask the recruiter...</Text>
                  <Flex gap="2">
                    {[0, 1, 2].map((i) => (
                      <Box key={i} style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "var(--green-9)", animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite` }} />
                    ))}
                  </Flex>
                </Flex>
              )}

              {(app.aiInterviewQuestions?.recruiterQuestions?.length ?? 0) > 0 ? (
                <Box>
                  <Flex direction="column" gap="3">
                    {app.aiInterviewQuestions!.recruiterQuestions.map((q, i) => (
                      <Box key={i} p="3" style={{ backgroundColor: "var(--gray-2)", borderRadius: "var(--radius-2)", borderLeft: `3px solid ${
                        q.category === "Culture" ? "var(--green-9)" :
                        q.category === "Growth" ? "var(--blue-9)" :
                        q.category === "Team Structure" ? "var(--violet-9)" :
                        q.category === "Remote Work" ? "var(--cyan-9)" :
                        q.category === "Process" ? "var(--gray-9)" :
                        q.category === "Role Clarity" ? "var(--orange-9)" :
                        q.category === "Compensation" ? "var(--amber-9)" :
                        q.category === "Red Flags" ? "var(--crimson-9)" :
                        q.category === "Leadership" ? "var(--indigo-9)" :
                        q.category === "Challenges" ? "var(--plum-9)" :
                        "var(--green-9)"
                      }` }}>
                        <Flex justify="between" align="start" gap="2" mb="2">
                          <Text size="2" weight="bold" as="div">{i + 1}. {q.question}</Text>
                          <Badge size="1" variant="soft" color={
                            q.category === "Culture" ? "green" :
                            q.category === "Growth" ? "blue" :
                            q.category === "Team Structure" ? "violet" :
                            q.category === "Remote Work" ? "cyan" :
                            q.category === "Process" ? "gray" :
                            q.category === "Role Clarity" ? "orange" :
                            q.category === "Compensation" ? "amber" :
                            q.category === "Red Flags" ? "crimson" :
                            q.category === "Leadership" ? "indigo" :
                            q.category === "Challenges" ? "plum" :
                            "green"
                          } style={{ flexShrink: 0 }}>{q.category}</Badge>
                        </Flex>
                        <Text size="2" color="gray" as="div">{q.reason}</Text>
                      </Box>
                    ))}
                  </Flex>
                  {app.aiInterviewQuestions!.recruiterGeneratedAt && (
                    <Text size="1" color="gray" mt="3" as="div">
                      Generated {new Date(app.aiInterviewQuestions!.recruiterGeneratedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </Text>
                  )}
                </Box>
              ) : !generatingRecruiter ? (
                <Text size="2" color="gray">No questions yet. Generate smart questions to ask the recruiter about this company and role.</Text>
              ) : null}
            </Box>
          </Tabs.Content>

          <Tabs.Content value="technical">
            <Box pt="3">
              {isAdmin && (
                <Flex gap="2" align="center" mb="3">
                  <Button
                    variant="soft"
                    size="2"
                    color="blue"
                    disabled={generatingTechnical || !app.jobDescription}
                    title={!app.jobDescription ? "No job description available" : undefined}
                    onClick={async () => {
                      setGeneratingTechnical(true);
                      setTechnicalError(null);
                      try {
                        await generateInterviewQuestions({
                          variables: { applicationId: app.id, type: "technical" },
                          refetchQueries: ["GetApplication"],
                        });
                      } catch (e) {
                        setTechnicalError(e instanceof Error ? e.message : "Generation failed");
                      } finally {
                        setGeneratingTechnical(false);
                      }
                    }}
                  >
                    <PlusIcon />
                    {generatingTechnical
                      ? "Generating..."
                      : (app.aiInterviewQuestions?.technicalQuestions?.length ?? 0) > 0
                        ? "Regenerate"
                        : "Generate Technical Questions"}
                  </Button>
                  {technicalError && <Text size="1" color="red">{technicalError}</Text>}
                </Flex>
              )}

              {generatingTechnical && (
                <Flex direction="column" gap="3" py="6" align="center">
                  <Text size="2" color="gray">Generating technical interview questions with DeepSeek Reasoner...</Text>
                  <Flex gap="2">
                    {[0, 1, 2].map((i) => (
                      <Box key={i} style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "var(--blue-9)", animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite` }} />
                    ))}
                  </Flex>
                </Flex>
              )}

              {(app.aiInterviewQuestions?.technicalQuestions?.length ?? 0) > 0 ? (
                <Box>
                  <Flex direction="column" gap="3">
                    {app.aiInterviewQuestions!.technicalQuestions.map((q, i) => (
                      <Box key={i} p="3" style={{ backgroundColor: "var(--gray-2)", borderRadius: "var(--radius-2)", borderLeft: `3px solid ${
                        q.category === "System Design" ? "var(--violet-9)" :
                        q.category === "Coding" ? "var(--blue-9)" :
                        q.category === "Architecture" ? "var(--indigo-9)" :
                        q.category === "Performance" ? "var(--orange-9)" :
                        q.category === "Testing" ? "var(--green-9)" :
                        q.category === "DevOps" ? "var(--amber-9)" :
                        q.category === "Domain Knowledge" ? "var(--cyan-9)" :
                        q.category === "Technical Leadership" ? "var(--crimson-9)" :
                        "var(--blue-9)"
                      }` }}>
                        <Flex justify="between" align="start" gap="2" mb="2">
                          <Text size="2" weight="bold" as="div">{i + 1}. {q.question}</Text>
                          <Badge size="1" variant="soft" color={
                            q.category === "System Design" ? "violet" :
                            q.category === "Coding" ? "blue" :
                            q.category === "Architecture" ? "indigo" :
                            q.category === "Performance" ? "orange" :
                            q.category === "Testing" ? "green" :
                            q.category === "DevOps" ? "amber" :
                            q.category === "Domain Knowledge" ? "cyan" :
                            q.category === "Technical Leadership" ? "crimson" :
                            "blue"
                          } style={{ flexShrink: 0 }}>{q.category}</Badge>
                        </Flex>
                        <Text size="2" color="gray" as="div">{q.reason}</Text>
                      </Box>
                    ))}
                  </Flex>
                  {app.aiInterviewQuestions!.technicalGeneratedAt && (
                    <Text size="1" color="gray" mt="3" as="div">
                      Generated {new Date(app.aiInterviewQuestions!.technicalGeneratedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </Text>
                  )}
                </Box>
              ) : !generatingTechnical ? (
                <Text size="2" color="gray">No technical questions yet. Generate deep technical interview questions.</Text>
              ) : null}
            </Box>
          </Tabs.Content>
        </Tabs.Root>
      </Card>

      {/* Interview Prep */}
      <Card mb="5">
        <Flex justify="between" align="center" mb="3">
          <Flex align="center" gap="2">
            <Heading size="4">Interview Prep</Heading>
            {app.aiInterviewPrep && (app.companyKey || app.companyName) && (
              <Button variant="soft" size="1" asChild>
                <Link href={`/prep/${app.companyKey || app.companyName?.toLowerCase().replace(/\s+/g, "")}`} target="_blank">
                  <ExternalLinkIcon /> Full Page
                </Link>
              </Button>
            )}
          </Flex>
          {isAdmin && (
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
          )}
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
                  {isAdmin && (
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
                  )}
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
            <Flex justify="between" align="center" mb="3">
              <Text size="1" color="gray" weight="medium" as="div">
                AI-GENERATED PREP
              </Text>
              <Flex gap="1">
                <Button
                  variant={prepView === "list" ? "solid" : "soft"}
                  color="gray"
                  size="1"
                  onClick={() => setPrepView("list")}
                >
                  List
                </Button>
                <Button
                  variant={prepView === "graph" ? "solid" : "soft"}
                  color="gray"
                  size="1"
                  onClick={() => setPrepView("graph")}
                >
                  Graph
                </Button>
              </Flex>
            </Flex>
            <Text size="2" color="gray" mb="4" as="div">
              {app.aiInterviewPrep.summary}
            </Text>
            {prepView === "graph" ? (
              <Suspense fallback={<Skeleton height="500px" />}>
                <InterviewPrepFlow
                  jobTitle={displayTitle}
                  aiInterviewPrep={app.aiInterviewPrep}
                  onRequirementClick={(req) => handleOpenTopic(req)}
                  onStudyTopicClick={(req, topic) =>
                    handleOpenStudyTopic(
                      { stopPropagation: () => {} } as React.MouseEvent,
                      req,
                      topic,
                    )
                  }
                />
              </Suspense>
            ) : (
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
                    {req.studyTopics.map((t: string) => {
                      const hasDeepDive = req.studyTopicDeepDives?.some((d) => d.topic === t && d.deepDive);
                      return (
                        <Text
                          key={t}
                          size="1"
                          role="button"
                          tabIndex={0}
                          onClick={(e) => handleOpenStudyTopic(e, req, t)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") handleOpenStudyTopic(e as any, req, t);
                          }}
                          style={{
                            padding: "2px 8px",
                            backgroundColor: hasDeepDive ? "var(--violet-5)" : "var(--violet-3)",
                            borderRadius: "4px",
                            cursor: "pointer",
                          }}
                        >
                          {t}
                        </Text>
                      );
                    })}
                  </Flex>
                </Box>
              ))}
            </Flex>
            )}
          </Box>
        )}
      </Card>

      {/* Notes */}
      <Card>
        <Flex justify="between" align="center" mb="3">
          <Heading size="4">Notes</Heading>
          {isAdmin && !editingNotes && (
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
                {selectedReq.studyTopics.map((t) => {
                  const hasDeepDive = selectedReq.studyTopicDeepDives?.some((d) => d.topic === t && d.deepDive);
                  return (
                    <Text
                      key={t}
                      size="1"
                      role="button"
                      tabIndex={0}
                      onClick={(e) => handleOpenStudyTopic(e, selectedReq, t)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") handleOpenStudyTopic(e as any, selectedReq, t);
                      }}
                      style={{
                        padding: "2px 8px",
                        backgroundColor: hasDeepDive ? "var(--violet-5)" : "var(--violet-3)",
                        borderRadius: "4px",
                        cursor: "pointer",
                      }}
                    >
                      {t}
                    </Text>
                  );
                })}
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
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{selectedReq.deepDive}</ReactMarkdown>
                  </Box>
                ) : null}
              </Box>

              <Flex justify="between" mt="4" align="center">
                <Flex gap="2" align="center">
                  {app?.companyKey && (
                    <Button variant="ghost" size="2" asChild>
                      <Link href={`/prep/${app.companyKey}`}>View full prep →</Link>
                    </Button>
                  )}
                  <Dialog.Close asChild>
                    <Button
                      variant="ghost"
                      size="2"
                      color="amber"
                      onClick={() => {
                        const reqName = selectedReq?.requirement ?? null;
                        setTimeout(() => {
                          setActiveLinkTarget(reqName);
                          scrollToJobDescription();
                        }, 50);
                      }}
                    >
                      <Link2Icon />
                      {selectedReq?.sourceQuote ? "Change link" : "Link source"}
                    </Button>
                  </Dialog.Close>
                </Flex>
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

      <TextSelectionToolbar
        selectedText={selectedText}
        selectionRect={selectionRect}
        isGenerating={generatingFromSelection}
        onGenerate={handleGenerateFromSelection}
        onLinkToExisting={handleOpenLinkPanel}
        bestMatch={bestMatch}
        onAutoLink={handleAutoLink}
        onDiveDeep={handleDiveDeep}
        isDiving={isDiving}
        willDiveAfterGenerate={true}
        activeLinkTarget={activeLinkTarget}
        onCancelLinkTarget={() => setActiveLinkTarget(null)}
      />

      <PrepLinkPanel
        open={linkPanelOpen}
        selectedText={pendingLinkText}
        requirements={app.aiInterviewPrep?.requirements ?? []}
        onLink={handleLinkRequirement}
        onClose={() => { setLinkPanelOpen(false); setPendingLinkText(""); }}
        isLinking={!!linkingRequirement}
        linkingRequirement={linkingRequirement}
      />

      {selectionError && (
        <Box style={{ position: "fixed", bottom: 16, left: "50%", transform: "translateX(-50%)", zIndex: 9999 }}>
          <Text size="1" color="red" style={{ background: "var(--gray-2)", border: "1px solid var(--red-6)", padding: "6px 12px" }}>
            {selectionError}
          </Text>
        </Box>
      )}

      <Dialog.Root
        open={!!selectedStudyTopic}
        onOpenChange={(o) => {
          if (!o) {
            setSelectedStudyTopic(null);
            setStudyTopicError(null);
          }
        }}
      >
        <Dialog.Content maxWidth="680px" style={{ maxHeight: "85vh", overflowY: "auto" }}>
          {selectedStudyTopic && (
            <>
              <Dialog.Title>{selectedStudyTopic.topic}</Dialog.Title>
              <Text size="1" color="gray" mb="4" as="div">
                Part of: {selectedStudyTopic.req.requirement}
              </Text>
              <Box pt="2">
                {studyTopicLoading ? (
                  <Flex direction="column" gap="3" py="4" align="center">
                    <Text size="2" color="gray">
                      Generating focused deep-dive with DeepSeek Reasoner…
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
                ) : studyTopicError ? (
                  <Text size="2" color="red">
                    {studyTopicError}
                  </Text>
                ) : (() => {
                  const d = selectedStudyTopic.req.studyTopicDeepDives?.find(
                    (d) => d.topic === selectedStudyTopic.topic,
                  );
                  return d?.deepDive ? (
                    <Box className="deep-dive-content">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{d.deepDive}</ReactMarkdown>
                    </Box>
                  ) : null;
                })()}
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

      {/* Agentic Coding */}
      <Card mb="5">
        <Flex justify="between" align="center" mb="3">
          <Flex align="center" gap="2">
            <Heading size="4">Agentic Coding</Heading>
            <Badge size="1" variant="soft" color="violet">DeepSeek Reasoner</Badge>
          </Flex>
          {isAdmin && (
            <Flex align="center" gap="2">
              <Button
                variant="soft"
                size="2"
                disabled={generatingAgentic || !app.jobDescription}
                title={!app.jobDescription ? "Add a job description first" : undefined}
                onClick={async () => {
                  setGeneratingAgentic(true);
                  setAgenticError(null);
                  try {
                    await generateAgenticCoding({
                      variables: { applicationId: app.id },
                      refetchQueries: ["GetApplication"],
                    });
                  } catch (e) {
                    setAgenticError(e instanceof Error ? e.message : "Generation failed");
                  } finally {
                    setGeneratingAgentic(false);
                  }
                }}
              >
                <PlusIcon />
                {generatingAgentic ? "Generating…" : app.agenticCoding ? "Regenerate" : "Generate with AI"}
              </Button>
              {agenticError && <Text size="1" color="red">{agenticError}</Text>}
            </Flex>
          )}
        </Flex>

        {generatingAgentic && (
          <Flex direction="column" gap="3" py="6" align="center">
            <Text size="2" color="gray">DeepSeek Reasoner is analysing the job description and crafting an agentic coding guide…</Text>
            <Flex gap="2">
              {[0, 1, 2].map((i) => (
                <Box key={i} style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "var(--violet-9)", animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite` }} />
              ))}
            </Flex>
          </Flex>
        )}

        {!generatingAgentic && !app.agenticCoding && (
          <Text size="2" color="gray">
            No agentic coding analysis yet. Add a job description and click Generate to get a deep analysis of how AI coding agents apply to this role — with exercises and ready-to-use agent prompts.
          </Text>
        )}

        {app.agenticCoding && !generatingAgentic && (
          <Box>
            {/* Overview */}
            <Box mb="5">
              <Text size="1" color="gray" weight="medium" mb="3" as="div" style={{ textTransform: "uppercase", letterSpacing: "0.05em" }}>
                How Agentic Coding Applies to This Role
              </Text>
              <Box p="4" style={{ backgroundColor: "var(--violet-2)", borderRadius: "var(--radius-3)", borderLeft: "3px solid var(--violet-9)" }}>
                <Box className="deep-dive-content" style={{ fontSize: "var(--font-size-2)", lineHeight: 1.7 }}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{app.agenticCoding.overview}</ReactMarkdown>
                </Box>
              </Box>
            </Box>

            {/* Workflow Pattern */}
            {app.agenticCoding.workflowPattern && (
              <Box mb="5">
                <Text size="1" color="gray" weight="medium" mb="3" as="div" style={{ textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  30-Minute Development Loop
                </Text>
                <Box p="4" style={{ backgroundColor: "var(--blue-2)", borderRadius: "var(--radius-3)", borderLeft: "3px solid var(--blue-9)" }}>
                  <Box className="deep-dive-content" style={{ fontSize: "var(--font-size-2)", lineHeight: 1.7 }}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{app.agenticCoding.workflowPattern}</ReactMarkdown>
                  </Box>
                </Box>
              </Box>
            )}

            {/* Exercises */}
            {app.agenticCoding.exercises.length > 0 && (
              <Box mb="5">
                <Text size="1" color="gray" weight="medium" mb="3" as="div" style={{ textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Coding Exercises ({app.agenticCoding.exercises.length})
                </Text>
                <Flex direction="column" gap="3">
                  {app.agenticCoding.exercises.map((ex, i) => (
                    <Box
                      key={i}
                      p="3"
                      style={{
                        backgroundColor: "var(--gray-2)",
                        borderRadius: "var(--radius-2)",
                        borderLeft: `3px solid ${ex.difficulty === "easy" ? "var(--green-9)" : ex.difficulty === "medium" ? "var(--amber-9)" : "var(--red-9)"}`,
                      }}
                    >
                      <Flex justify="between" align="start" gap="2" mb="2">
                        <Text size="2" weight="bold">{i + 1}. {ex.title}</Text>
                        <Badge size="1" variant="soft" color={ex.difficulty === "easy" ? "green" : ex.difficulty === "medium" ? "amber" : "red"} style={{ flexShrink: 0 }}>
                          {ex.difficulty}
                        </Badge>
                      </Flex>
                      <Text size="2" color="gray" as="div" mb="2">{ex.description}</Text>
                      <Flex gap="1" wrap="wrap" mb="2">
                        {ex.skills.map((s) => (
                          <Badge key={s} size="1" variant="outline" color="violet">{s}</Badge>
                        ))}
                      </Flex>
                      {ex.hints.length > 0 && (
                        <Box mb="2">
                          <Text size="1" color="gray" weight="medium" mb="1" as="div">Hints</Text>
                          {ex.hints.map((h, hi) => (
                            <Text key={hi} size="1" color="gray" as="div">· {h}</Text>
                          ))}
                        </Box>
                      )}
                      <Box>
                        <Button size="1" variant="soft" color="violet" onClick={() => setAgenticExerciseOpen(agenticExerciseOpen === i ? null : i)}>
                          {agenticExerciseOpen === i ? "Hide agent prompt" : "Show agent prompt"}
                        </Button>
                        {agenticExerciseOpen === i && (
                          <Box mt="2" p="3" style={{ backgroundColor: "var(--gray-3)", borderRadius: "var(--radius-2)" }}>
                            <Flex justify="between" align="center" mb="2">
                              <Text size="1" color="gray" weight="medium">Claude Code / Cursor prompt</Text>
                              <Button size="1" variant="ghost" color={copiedPrompt === i ? "green" : "gray"} onClick={() => { navigator.clipboard.writeText(ex.agentPrompt); setCopiedPrompt(i); setTimeout(() => setCopiedPrompt(null), 2000); }}>
                                {copiedPrompt === i ? "Copied!" : "Copy"}
                              </Button>
                            </Flex>
                            <Text size="1" as="div" style={{ fontFamily: "monospace", whiteSpace: "pre-wrap", color: "var(--gray-11)", lineHeight: 1.6 }}>
                              {ex.agentPrompt}
                            </Text>
                          </Box>
                        )}
                      </Box>
                    </Box>
                  ))}
                </Flex>
              </Box>
            )}

            {/* Prompt Templates */}
            {app.agenticCoding.promptTemplates && app.agenticCoding.promptTemplates.length > 0 && (
              <Box mb="5">
                <Text size="1" color="gray" weight="medium" mb="3" as="div" style={{ textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Prompt Templates for This Stack ({app.agenticCoding.promptTemplates.length})
                </Text>
                <Flex direction="column" gap="3">
                  {app.agenticCoding.promptTemplates.map((tpl, i) => {
                    const tplKey = 1000 + i;
                    return (
                      <Box key={i} p="3" style={{ backgroundColor: "var(--gray-2)", borderRadius: "var(--radius-2)", borderLeft: "3px solid var(--cyan-9)" }}>
                        <Text size="2" weight="bold" mb="1" as="div">{tpl.title}</Text>
                        <Text size="1" color="gray" as="div" mb="1">{tpl.purpose}</Text>
                        <Badge size="1" variant="soft" color="cyan" mb="2" style={{ display: "inline-flex" }}>{tpl.stackContext}</Badge>
                        <Box>
                          <Button size="1" variant="soft" color="cyan" onClick={() => setAgenticExerciseOpen(agenticExerciseOpen === tplKey ? null : tplKey)}>
                            {agenticExerciseOpen === tplKey ? "Hide prompt" : "Show prompt"}
                          </Button>
                          {agenticExerciseOpen === tplKey && (
                            <Box mt="2" p="3" style={{ backgroundColor: "var(--gray-3)", borderRadius: "var(--radius-2)" }}>
                              <Flex justify="between" align="center" mb="2">
                                <Text size="1" color="gray" weight="medium">Ready-to-use prompt</Text>
                                <Button size="1" variant="ghost" color={copiedPrompt === tplKey ? "green" : "gray"} onClick={() => { navigator.clipboard.writeText(tpl.prompt); setCopiedPrompt(tplKey); setTimeout(() => setCopiedPrompt(null), 2000); }}>
                                  {copiedPrompt === tplKey ? "Copied!" : "Copy"}
                                </Button>
                              </Flex>
                              <Text size="1" as="div" style={{ fontFamily: "monospace", whiteSpace: "pre-wrap", color: "var(--gray-11)", lineHeight: 1.6 }}>
                                {tpl.prompt}
                              </Text>
                            </Box>
                          )}
                        </Box>
                      </Box>
                    );
                  })}
                </Flex>
              </Box>
            )}

            {/* QA Approach */}
            {app.agenticCoding.qaApproach && (
              <Box mb="5">
                <Text size="1" color="gray" weight="medium" mb="3" as="div" style={{ textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Validating AI-Generated Code
                </Text>
                <Box p="4" style={{ backgroundColor: "var(--green-2)", borderRadius: "var(--radius-3)", borderLeft: "3px solid var(--green-9)" }}>
                  <Box className="deep-dive-content" style={{ fontSize: "var(--font-size-2)", lineHeight: 1.7 }}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{app.agenticCoding.qaApproach}</ReactMarkdown>
                  </Box>
                </Box>
              </Box>
            )}

            {/* Failure Modes */}
            {app.agenticCoding.failureModes && app.agenticCoding.failureModes.length > 0 && (
              <Box mb="5">
                <Text size="1" color="gray" weight="medium" mb="3" as="div" style={{ textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  When Not to Use Agents ({app.agenticCoding.failureModes.length} scenarios)
                </Text>
                <Flex direction="column" gap="2">
                  {app.agenticCoding.failureModes.map((fm, i) => (
                    <Box key={i} p="3" style={{ backgroundColor: "var(--gray-2)", borderRadius: "var(--radius-2)", borderLeft: "3px solid var(--orange-9)" }}>
                      <Text size="2" weight="bold" mb="1" as="div">{fm.scenario}</Text>
                      <Text size="1" color="gray" as="div" mb="1"><strong>Why agents fail:</strong> {fm.why}</Text>
                      <Text size="1" as="div" style={{ color: "var(--green-11)" }}><strong>Instead:</strong> {fm.alternative}</Text>
                    </Box>
                  ))}
                </Flex>
              </Box>
            )}

            {/* Team Practices */}
            {app.agenticCoding.teamPractices && (
              <Box mb="5">
                <Text size="1" color="gray" weight="medium" mb="3" as="div" style={{ textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Team-Level Agentic Practices
                </Text>
                <Box p="4" style={{ backgroundColor: "var(--amber-2)", borderRadius: "var(--radius-3)", borderLeft: "3px solid var(--amber-9)" }}>
                  <Box className="deep-dive-content" style={{ fontSize: "var(--font-size-2)", lineHeight: 1.7 }}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{app.agenticCoding.teamPractices}</ReactMarkdown>
                  </Box>
                </Box>
              </Box>
            )}

            {/* Measurable Outcomes */}
            {app.agenticCoding.measurableOutcomes && app.agenticCoding.measurableOutcomes.length > 0 && (
              <Box mb="5">
                <Text size="1" color="gray" weight="medium" mb="3" as="div" style={{ textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Measurable Outcomes
                </Text>
                <Flex direction="column" gap="2">
                  {app.agenticCoding.measurableOutcomes.map((mo, i) => (
                    <Box key={i} p="3" style={{ backgroundColor: "var(--gray-2)", borderRadius: "var(--radius-2)" }}>
                      <Text size="2" weight="bold" mb="2" as="div">{mo.task}</Text>
                      <Flex gap="3" wrap="wrap">
                        <Box>
                          <Text size="1" color="gray" as="div">Before</Text>
                          <Text size="2" color="red" as="div">{mo.beforeTime}</Text>
                        </Box>
                        <Text size="2" color="gray" style={{ alignSelf: "flex-end", paddingBottom: 2 }}>→</Text>
                        <Box>
                          <Text size="1" color="gray" as="div">With agents</Text>
                          <Text size="2" color="green" as="div">{mo.afterTime}</Text>
                        </Box>
                      </Flex>
                      <Text size="1" color="gray" mt="1" as="div">{mo.improvement}</Text>
                    </Box>
                  ))}
                </Flex>
              </Box>
            )}

            {/* Resources */}
            {app.agenticCoding.resources && app.agenticCoding.resources.length > 0 && (
              <Box>
                <Text size="1" color="gray" weight="medium" mb="3" as="div" style={{ textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Resources
                </Text>
                <Flex direction="column" gap="2">
                  {app.agenticCoding.resources.map((r, i) => (
                    <Flex key={i} align="start" gap="2" p="3" style={{ backgroundColor: "var(--gray-2)", borderRadius: "var(--radius-2)" }}>
                      <Box style={{ flex: 1 }}>
                        <a href={r.url} target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent-11)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }}>
                          <Text size="2" weight="medium">{r.title}</Text>
                          <ExternalLinkIcon />
                        </a>
                        <Text size="1" color="gray" as="div" mt="1">{r.description}</Text>
                      </Box>
                    </Flex>
                  ))}
                </Flex>
              </Box>
            )}

            <Text size="1" color="gray" mt="4" as="div">
              Generated {new Date(app.agenticCoding.generatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
            </Text>
          </Box>
        )}
      </Card>

    </Container>
  );
}
