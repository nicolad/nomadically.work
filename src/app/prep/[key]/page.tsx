"use client";

import { lazy, Suspense, useState, useCallback } from "react";
import { Box, Button, Container, Skeleton, Text } from "@radix-ui/themes";
import { ArrowLeftIcon, EnterFullScreenIcon, ExitFullScreenIcon } from "@radix-ui/react-icons";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  useGetApplicationsQuery,
  useGenerateTopicDeepDiveMutation,
  useGenerateStudyTopicDeepDiveMutation,
} from "@/__generated__/hooks";
import type { AiInterviewPrepRequirement } from "@/__generated__/hooks";

import { PrepHeader } from "@/components/prep/PrepHeader";
import { PrepSummaryCard } from "@/components/prep/PrepSummaryCard";
import { PrepLoadingState } from "@/components/prep/PrepLoadingState";
import { PrepEmptyState } from "@/components/prep/PrepEmptyState";
import { RequirementDialog } from "@/components/prep/RequirementDialog";
import { StudyTopicDialog } from "@/components/prep/StudyTopicDialog";

const InterviewPrepFlow = lazy(() => import("@/components/interview-prep-flow"));

export default function PrepByCompanyPage() {
  const params = useParams();
  const key = params.key as string;

  const { data, loading } = useGetApplicationsQuery();

  const [generateTopicDeepDive] = useGenerateTopicDeepDiveMutation();
  const [generateStudyTopicDeepDive] = useGenerateStudyTopicDeepDiveMutation();

  const [fullscreen, setFullscreen] = useState(false);

  // Requirement deep-dive dialog state
  const [selectedReq, setSelectedReq] = useState<AiInterviewPrepRequirement | null>(null);
  const [deepDiveLoading, setDeepDiveLoading] = useState(false);
  const [deepDiveError, setDeepDiveError] = useState<string | null>(null);

  // Study topic deep-dive dialog state
  const [selectedStudyTopic, setSelectedStudyTopic] = useState<{
    req: AiInterviewPrepRequirement;
    topic: string;
  } | null>(null);
  const [studyTopicLoading, setStudyTopicLoading] = useState(false);
  const [studyTopicError, setStudyTopicError] = useState<string | null>(null);

  const app = data?.applications?.find(
    (a) => a.companyKey === key || a.companyName?.toLowerCase().replace(/\s+/g, "") === key,
  );

  const handleRequirementClick = useCallback(
    async (req: AiInterviewPrepRequirement) => {
      if (!app) return;
      setSelectedReq(req);
      setDeepDiveError(null);

      if (!req.deepDive) {
        setDeepDiveLoading(true);
        try {
          const result = await generateTopicDeepDive({
            variables: { applicationId: app.id, requirement: req.requirement },
            refetchQueries: ["GetApplications"],
          });
          const updatedReqs =
            result.data?.generateTopicDeepDive?.aiInterviewPrep?.requirements;
          const updatedReq = updatedReqs?.find((r) => r.requirement === req.requirement);
          if (updatedReq) setSelectedReq(updatedReq as AiInterviewPrepRequirement);
        } catch (e) {
          setDeepDiveError(e instanceof Error ? e.message : "Generation failed");
        } finally {
          setDeepDiveLoading(false);
        }
      }
    },
    [app, generateTopicDeepDive],
  );

  const handleRegenerateDeepDive = useCallback(async () => {
    if (!app || !selectedReq) return;
    setDeepDiveLoading(true);
    setDeepDiveError(null);
    try {
      const result = await generateTopicDeepDive({
        variables: { applicationId: app.id, requirement: selectedReq.requirement, force: true },
        refetchQueries: ["GetApplications"],
      });
      const updatedReqs =
        result.data?.generateTopicDeepDive?.aiInterviewPrep?.requirements;
      const updatedReq = updatedReqs?.find((r) => r.requirement === selectedReq.requirement);
      if (updatedReq) setSelectedReq(updatedReq as AiInterviewPrepRequirement);
    } catch (e) {
      setDeepDiveError(e instanceof Error ? e.message : "Regeneration failed");
    } finally {
      setDeepDiveLoading(false);
    }
  }, [app, selectedReq, generateTopicDeepDive]);

  const handleStudyTopicClick = useCallback(
    async (req: AiInterviewPrepRequirement, topic: string) => {
      if (!app) return;
      const existing = req.studyTopicDeepDives?.find((d) => d.topic === topic);
      setSelectedStudyTopic({ req, topic });
      setStudyTopicError(null);

      if (!existing?.deepDive) {
        setStudyTopicLoading(true);
        try {
          const result = await generateStudyTopicDeepDive({
            variables: {
              applicationId: app.id,
              requirement: req.requirement,
              studyTopic: topic,
            },
            refetchQueries: ["GetApplications"],
          });
          const updatedReqs =
            result.data?.generateStudyTopicDeepDive?.aiInterviewPrep?.requirements;
          const updatedReq = updatedReqs?.find((r) => r.requirement === req.requirement);
          if (updatedReq)
            setSelectedStudyTopic({ req: updatedReq as AiInterviewPrepRequirement, topic });
        } catch (e) {
          setStudyTopicError(e instanceof Error ? e.message : "Generation failed");
        } finally {
          setStudyTopicLoading(false);
        }
      }
    },
    [app, generateStudyTopicDeepDive],
  );

  const handleRegenerateStudyTopic = useCallback(async () => {
    if (!app || !selectedStudyTopic) return;
    setStudyTopicLoading(true);
    setStudyTopicError(null);
    try {
      const result = await generateStudyTopicDeepDive({
        variables: {
          applicationId: app.id,
          requirement: selectedStudyTopic.req.requirement,
          studyTopic: selectedStudyTopic.topic,
          force: true,
        },
        refetchQueries: ["GetApplications"],
      });
      const updatedReqs =
        result.data?.generateStudyTopicDeepDive?.aiInterviewPrep?.requirements;
      const updatedReq = updatedReqs?.find(
        (r) => r.requirement === selectedStudyTopic.req.requirement,
      );
      if (updatedReq)
        setSelectedStudyTopic({
          req: updatedReq as AiInterviewPrepRequirement,
          topic: selectedStudyTopic.topic,
        });
    } catch (e) {
      setStudyTopicError(e instanceof Error ? e.message : "Regeneration failed");
    } finally {
      setStudyTopicLoading(false);
    }
  }, [app, selectedStudyTopic, generateStudyTopicDeepDive]);

  // Open a study topic directly from inside the requirement dialog
  const handleStudyTopicFromReqDialog = useCallback(
    (req: AiInterviewPrepRequirement, topic: string) => {
      setSelectedReq(null);
      // Small delay to let the requirement dialog close
      setTimeout(() => handleStudyTopicClick(req, topic), 150);
    },
    [handleStudyTopicClick],
  );

  if (loading) {
    return <PrepLoadingState />;
  }

  if (!app || !app.aiInterviewPrep) {
    return (
      <PrepEmptyState
        type={!app ? "not-found" : "no-prep"}
        companyKey={key}
        appId={app?.id}
      />
    );
  }

  const displayTitle = app.jobTitle ?? "Job application";
  const displayCompany = app.companyName ?? key;
  const requirements = app.aiInterviewPrep.requirements;
  const requirementCount = requirements.length;
  const topicCount = requirements.reduce((s, r) => s + r.studyTopics.length, 0);
  const completedTopics = requirements.reduce(
    (s, r) => s + (r.studyTopicDeepDives?.filter((d) => d.deepDive).length ?? 0),
    0,
  );
  const completedRequirements = requirements.filter((r) => r.deepDive).length;
  const overallPercent = topicCount > 0 ? Math.round((completedTopics / topicCount) * 100) : 0;

  const currentDeepDive = selectedStudyTopic?.req.studyTopicDeepDives?.find(
    (d) => d.topic === selectedStudyTopic.topic,
  );

  const dialogs = (
    <>
      <RequirementDialog
        selectedReq={selectedReq}
        loading={deepDiveLoading}
        error={deepDiveError}
        onClose={() => { setSelectedReq(null); setDeepDiveError(null); }}
        onRegenerate={handleRegenerateDeepDive}
        onStudyTopicClick={(topic) => selectedReq && handleStudyTopicFromReqDialog(selectedReq, topic)}
      />
      <StudyTopicDialog
        selectedStudyTopic={selectedStudyTopic}
        loading={studyTopicLoading}
        error={studyTopicError}
        deepDiveContent={currentDeepDive?.deepDive}
        onClose={() => { setSelectedStudyTopic(null); setStudyTopicError(null); }}
        onRegenerate={handleRegenerateStudyTopic}
      />
    </>
  );

  if (fullscreen) {
    return (
      <div style={{ position: "fixed", inset: 0, background: "var(--gray-1)", zIndex: 50 }}>
        {/* Floating overlay */}
        <div
          style={{
            position: "absolute",
            top: 16,
            left: 16,
            zIndex: 10,
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: "var(--gray-2)",
            border: "1px solid var(--gray-5)",
            borderRadius: 8,
            padding: "7px 12px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
            maxWidth: "calc(100vw - 32px)",
          }}
        >
          <Button variant="ghost" size="1" asChild style={{ padding: "0 4px", flexShrink: 0 }}>
            <Link href={`/applications/${app.id}`}>
              <ArrowLeftIcon />
              <Text size="1">App</Text>
            </Link>
          </Button>
          <div style={{ width: 1, height: 16, background: "var(--gray-5)", flexShrink: 0 }} />
          <Text size="2" weight="medium" style={{ color: "var(--gray-12)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 260 }}>
            {displayCompany} — {displayTitle}
          </Text>
          <Box style={{ display: "inline-flex", alignItems: "center", background: "var(--accent-9)", color: "white", fontSize: "11px", fontWeight: 600, padding: "2px 7px", borderRadius: 4, flexShrink: 0 }}>
            {overallPercent}%
          </Box>
          <Text size="1" color="gray" style={{ whiteSpace: "nowrap", flexShrink: 0 }}>
            {requirementCount} req · {topicCount} topics
          </Text>
          <div style={{ width: 1, height: 16, background: "var(--gray-5)", flexShrink: 0 }} />
          <Button variant="ghost" size="1" onClick={() => setFullscreen(false)} title="Exit full screen">
            <ExitFullScreenIcon />
          </Button>
        </div>

        <Suspense fallback={<Skeleton height="100vh" />}>
          <InterviewPrepFlow
            jobTitle={displayTitle}
            aiInterviewPrep={app.aiInterviewPrep}
            height="100%"
            onRequirementClick={handleRequirementClick}
            onStudyTopicClick={handleStudyTopicClick}
          />
        </Suspense>

        {dialogs}
      </div>
    );
  }

  return (
    <Container size="4" p={{ initial: "4", md: "6" }}>
      <PrepHeader
        displayTitle={displayTitle}
        displayCompany={displayCompany}
        appId={app.id}
        requirementCount={requirementCount}
        topicCount={topicCount}
        overallPercent={overallPercent}
      />

      <PrepSummaryCard
        summary={app.aiInterviewPrep.summary}
        completedTopics={completedTopics}
        totalTopics={topicCount}
        completedRequirements={completedRequirements}
        totalRequirements={requirementCount}
      />

      <Suspense fallback={<Skeleton height="80vh" />}>
        <Box style={{ height: "calc(100vh - 220px)", minHeight: 500, position: "relative" }}>
          <Button
            variant="soft"
            size="1"
            onClick={() => setFullscreen(true)}
            style={{ position: "absolute", top: 8, right: 8, zIndex: 10 }}
            title="Full screen"
          >
            <EnterFullScreenIcon />
            Full screen
          </Button>
          <InterviewPrepFlow
            jobTitle={displayTitle}
            aiInterviewPrep={app.aiInterviewPrep}
            height="100%"
            onRequirementClick={handleRequirementClick}
            onStudyTopicClick={handleStudyTopicClick}
          />
        </Box>
      </Suspense>

      {dialogs}
    </Container>
  );
}
