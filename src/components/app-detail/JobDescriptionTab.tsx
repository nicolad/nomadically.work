"use client";

import {
  Heading,
  Button,
  Flex,
  Text,
  Box,
  Card,
  Badge,
  TextArea,
  DropdownMenu,
} from "@radix-ui/themes";
import { ExternalLinkIcon, ChevronDownIcon } from "@radix-ui/react-icons";
import { useState, useRef, useCallback, useMemo } from "react";
import {
  useUpdateApplicationMutation,
  useGenerateRequirementFromSelectionMutation,
  useLinkSelectionToRequirementMutation,
} from "@/__generated__/hooks";
import type { AiInterviewPrepRequirement, ApplicationStatus } from "@/__generated__/hooks";
import { useTextSelection } from "@/hooks/useTextSelection";
import { TextSelectionToolbar } from "@/components/app-detail/TextSelectionToolbar";
import { PrepLinkPanel } from "@/components/app-detail/PrepLinkPanel";
import { JobDescriptionWithHighlights } from "@/components/app-detail/JobDescriptionWithHighlights";
import { findBestMatch } from "@/lib/match-requirement";
import type { TabBaseProps } from "./types";
import { COLUMNS } from "./constants";

interface JobDescriptionTabProps extends TabBaseProps {
  activeLinkTarget: string | null;
  onSetActiveLinkTarget: (target: string | null) => void;
  onOpenTopic: (req: AiInterviewPrepRequirement) => void;
  flashRequirement: string | null;
  refetch: () => Promise<any>;
}

export function JobDescriptionTab({
  app,
  isAdmin,
  activeLinkTarget,
  onSetActiveLinkTarget,
  onOpenTopic,
  flashRequirement,
  refetch,
}: JobDescriptionTabProps) {
  const [updateApplication] = useUpdateApplicationMutation();
  const [generateRequirementFromSelection] = useGenerateRequirementFromSelectionMutation();
  const [linkSelectionToRequirement] = useLinkSelectionToRequirementMutation();

  const [editingJobDescription, setEditingJobDescription] = useState(false);
  const [jobDescriptionValue, setJobDescriptionValue] = useState("");
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState("");

  // Text selection state
  const jobDescriptionRef = useRef<HTMLDivElement | null>(null);
  const { selectedText, selectionRect, clearSelection } = useTextSelection(jobDescriptionRef);
  const [linkPanelOpen, setLinkPanelOpen] = useState(false);
  const [pendingLinkText, setPendingLinkText] = useState("");
  const [generatingFromSelection, setGeneratingFromSelection] = useState(false);
  const [linkingRequirement, setLinkingRequirement] = useState<string | null>(null);
  const [selectionError, setSelectionError] = useState<string | null>(null);
  const [isDiving, setIsDiving] = useState(false);

  const requirements = app?.aiInterviewPrep?.requirements ?? [];
  const bestMatch = useMemo(() => {
    if (!selectedText || requirements.length === 0) return null;
    const match = findBestMatch(selectedText, requirements);
    if (!match) return null;
    return { requirement: match.requirement.requirement, score: match.score };
  }, [selectedText, requirements]);

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
      if (activeLinkTarget === requirement) onSetActiveLinkTarget(null);
    } catch (e) {
      setSelectionError(e instanceof Error ? e.message : "Link failed");
    } finally {
      setLinkingRequirement(null);
    }
  }, [app, selectedText, clearSelection, linkSelectionToRequirement, activeLinkTarget, onSetActiveLinkTarget]);

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
        setGeneratingFromSelection(false);
        await onOpenTopic(newReq);
        return;
      }
    } catch (e) {
      setSelectionError(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setGeneratingFromSelection(false);
    }
  }, [app, clearSelection, generateRequirementFromSelection, onOpenTopic]);

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
        (r: any) => r.requirement === reqName,
      );
      if (freshReq) {
        await onOpenTopic(freshReq as AiInterviewPrepRequirement);
      }
    } catch (e) {
      setSelectionError(e instanceof Error ? e.message : "Dive failed");
    } finally {
      setIsDiving(false);
    }
  }, [app, bestMatch, linkSelectionToRequirement, clearSelection, refetch, onOpenTopic]);

  const handleSaveJobDescription = async () => {
    if (!app) return;
    await updateApplication({
      variables: { id: app.id, input: { jobDescription: jobDescriptionValue } },
      refetchQueries: ["GetApplication"],
    });
    setEditingJobDescription(false);
  };

  const statusCol = COLUMNS.find((c) => c.status === app.status);

  const handleStatusChange = async (status: ApplicationStatus) => {
    await updateApplication({
      variables: { id: app.id, input: { status } },
      refetchQueries: ["GetApplication"],
    });
  };

  const handleSaveNotes = async () => {
    await updateApplication({
      variables: { id: app.id, input: { notes: notesValue } },
      refetchQueries: ["GetApplication"],
    });
    setEditingNotes(false);
  };

  return (
    <>
      {/* Status card */}
      <Card mb="5">
        <Flex justify="between" align="center">
          <Flex align="center" gap="3">
            <Text size="2" weight="medium">Status</Text>
            <Badge color={statusCol?.color ?? "gray"} variant="soft" size="2">
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
                    <Badge color={col.color} variant="soft" size="1">{col.label}</Badge>
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
            <Text size="2" weight="medium">Job Posting</Text>
            <a
              href={app.jobId}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "var(--accent-11)", textDecoration: "none" }}
            >
              <Text size="2" style={{ wordBreak: "break-all" }}>{app.jobId}</Text>
              <ExternalLinkIcon />
            </a>
          </Flex>
        </Card>
      )}

      {/* Resume */}
      {app.resume && (
        <Card mb="5">
          <Flex align="center" gap="2">
            <Text size="2" weight="medium">Resume</Text>
            <a href={app.resume as unknown as string} target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent-11)" }}>
              <Text size="2">View Resume</Text>
            </a>
          </Flex>
        </Card>
      )}

      {/* Active link target banner */}
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
            Select text to link to &ldquo;{activeLinkTarget.length > 40 ? activeLinkTarget.slice(0, 40) + "\u2026" : activeLinkTarget}&rdquo;
          </Text>
          <Button size="1" variant="ghost" color="gray" onClick={() => onSetActiveLinkTarget(null)}>
            Cancel
          </Button>
        </Flex>
      )}

      {/* Job description card */}
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
              onHighlightClick={(req) => onOpenTopic(req)}
              containerRef={jobDescriptionRef}
              flashRequirement={flashRequirement}
            />
          </Box>
        ) : (
          <Text size="2" color="gray">No job description yet.</Text>
        )}
      </Card>

      {/* Text selection toolbar */}
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
        onCancelLinkTarget={() => onSetActiveLinkTarget(null)}
      />

      {/* Prep link panel */}
      <PrepLinkPanel
        open={linkPanelOpen}
        selectedText={pendingLinkText}
        requirements={app.aiInterviewPrep?.requirements ?? []}
        onLink={handleLinkRequirement}
        onClose={() => { setLinkPanelOpen(false); setPendingLinkText(""); }}
        isLinking={!!linkingRequirement}
        linkingRequirement={linkingRequirement}
      />

      {/* Selection error toast */}
      {selectionError && (
        <Box style={{ position: "fixed", bottom: 16, left: "50%", transform: "translateX(-50%)", zIndex: 9999 }}>
          <Text size="1" color="red" style={{ background: "var(--gray-2)", border: "1px solid var(--red-6)", padding: "6px 12px" }}>
            {selectionError}
          </Text>
        </Box>
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
                style={{ backgroundColor: "var(--gray-3)", borderRadius: "var(--radius-2)" }}
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

      {/* Notes */}
      <Card>
        <Flex justify="between" align="center" mb="3">
          <Heading size="4">Notes</Heading>
          {isAdmin && !editingNotes && (
            <Button
              variant="soft"
              size="1"
              onClick={() => { setNotesValue(app.notes ?? ""); setEditingNotes(true); }}
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
              <Button variant="soft" color="gray" size="1" onClick={() => setEditingNotes(false)}>
                Cancel
              </Button>
              <Button size="1" onClick={handleSaveNotes}>Save</Button>
            </Flex>
          </Flex>
        ) : (
          <Text size="2" color={app.notes ? undefined : "gray"}>
            {app.notes || "No notes yet."}
          </Text>
        )}
      </Card>
    </>
  );
}
