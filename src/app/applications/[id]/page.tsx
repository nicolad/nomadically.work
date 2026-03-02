"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { Container, Heading, Button, Flex, Text, Box, Card, Skeleton, Badge, Tabs } from "@radix-ui/themes";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useGetApplicationQuery, useGenerateTopicDeepDiveMutation, useGenerateStudyTopicDeepDiveMutation } from "@/__generated__/hooks";
import type { AiInterviewPrepRequirement } from "@/__generated__/hooks";
import Link from "next/link";
import { useAuth } from "@/lib/auth-hooks";
import { ADMIN_EMAIL } from "@/lib/constants";
import { ApplicationHeader } from "@/components/app-detail/ApplicationHeader";
import { RequirementDialog } from "@/components/app-detail/RequirementDialog";
import { StudyTopicDialog } from "@/components/app-detail/StudyTopicDialog";
import { JobDescriptionTab } from "@/components/app-detail/JobDescriptionTab";
import { InterviewPrepTab } from "@/components/app-detail/InterviewPrepTab";
import { CodingTab } from "@/components/app-detail/CodingTab";
import { BackendPrepTab } from "@/components/app-detail/BackendPrepTab";
import { StudyTab } from "@/components/app-detail/StudyTab";

const TAB_VALUES = ["description", "interview", "coding", "backend", "study"] as const;
type TabValue = (typeof TAB_VALUES)[number];

function ApplicationDetailInner() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = Number(params.id);

  const { data, loading, refetch } = useGetApplicationQuery({
    variables: { id },
    skip: isNaN(id),
  });

  const { user } = useAuth();
  const isAdmin = user?.email === ADMIN_EMAIL;
  const app = data?.application;

  // Tab state persisted to URL
  const rawTab = searchParams.get("tab") ?? "description";
  const activeTab: TabValue = TAB_VALUES.includes(rawTab as TabValue) ? (rawTab as TabValue) : "overview";
  const setActiveTab = useCallback(
    (tab: string) => {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", tab);
      router.replace(url.pathname + url.search, { scroll: false });
    },
    [router],
  );

  // Cross-tab dialog state
  const [selectedReq, setSelectedReq] = useState<AiInterviewPrepRequirement | null>(null);
  const [deepDiveLoading, setDeepDiveLoading] = useState(false);
  const [deepDiveError, setDeepDiveError] = useState<string | null>(null);
  const [selectedStudyTopic, setSelectedStudyTopic] = useState<{ req: AiInterviewPrepRequirement; topic: string } | null>(null);
  const [studyTopicLoading, setStudyTopicLoading] = useState(false);
  const [studyTopicError, setStudyTopicError] = useState<string | null>(null);
  const [generateTopicDeepDive] = useGenerateTopicDeepDiveMutation();
  const [generateStudyTopicDeepDive] = useGenerateStudyTopicDeepDiveMutation();

  // Cross-tab coordination: "Link source" from dialog → Job Description tab
  const [activeLinkTarget, setActiveLinkTarget] = useState<string | null>(null);
  const [flashRequirement, setFlashRequirement] = useState<string | null>(null);

  useEffect(() => {
    if (!flashRequirement) return;
    const t = setTimeout(() => setFlashRequirement(null), 2000);
    return () => clearTimeout(t);
  }, [flashRequirement]);

  const handleOpenTopic = useCallback(
    async (req: AiInterviewPrepRequirement) => {
      setSelectedReq(req);
      setDeepDiveError(null);
      if (!req.deepDive) {
        setDeepDiveLoading(true);
        try {
          const result = await generateTopicDeepDive({
            variables: { applicationId: app!.id, requirement: req.requirement },
            refetchQueries: ["GetApplication"],
          });
          const updatedReqs = result.data?.generateTopicDeepDive?.aiInterviewPrep?.requirements;
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

  const handleOpenStudyTopic = useCallback(
    async (e: React.MouseEvent, req: AiInterviewPrepRequirement, topic: string) => {
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
    },
    [app, generateStudyTopicDeepDive],
  );

  const handleLinkSource = useCallback(
    (requirement: string) => {
      setSelectedReq(null);
      setTimeout(() => {
        setActiveLinkTarget(requirement);
        setActiveTab("description");
      }, 50);
    },
    [setActiveTab],
  );

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
            <Text color="gray">This application doesn&apos;t exist or you don&apos;t have access.</Text>
            <Button asChild>
              <Link href="/applications">Back to Applications</Link>
            </Button>
          </Flex>
        </Card>
      </Container>
    );
  }

  const reqCount = app.aiInterviewPrep?.requirements?.length ?? 0;
  const exerciseCount = app.agenticCoding?.exercises?.length ?? 0;
  const backendSectionCount = app.aiBackendPrep
    ? [
        app.aiBackendPrep.systemDesign, app.aiBackendPrep.distributedSystems, app.aiBackendPrep.databaseDesign,
        app.aiBackendPrep.sqlOptimization, app.aiBackendPrep.nosqlPatterns, app.aiBackendPrep.apiDesign,
        app.aiBackendPrep.authSecurity, app.aiBackendPrep.caching, app.aiBackendPrep.messageQueues,
        app.aiBackendPrep.microservices, app.aiBackendPrep.testing, app.aiBackendPrep.devops,
        app.aiBackendPrep.securityOwasp, app.aiBackendPrep.performance, app.aiBackendPrep.concurrencyAsync,
        app.aiBackendPrep.observability, app.aiBackendPrep.eventDriven, app.aiBackendPrep.serverlessEdge,
        app.aiBackendPrep.typescriptNode, app.aiBackendPrep.aiMlIntegration,
      ].filter((s) => s?.title || s?.overview).length
    : 0;

  return (
    <Container size="3" p={{ initial: "4", md: "8" }}>
      <ApplicationHeader app={app} isAdmin={isAdmin} />

      <Tabs.Root value={activeTab} onValueChange={setActiveTab}>
        <Tabs.List>
          <Tabs.Trigger value="description">Job Description</Tabs.Trigger>
          <Tabs.Trigger value="interview">
            Interview Prep
            {reqCount > 0 && <Badge size="1" variant="soft" color="blue" ml="2">{reqCount}</Badge>}
          </Tabs.Trigger>
          <Tabs.Trigger value="coding">
            Coding
            {exerciseCount > 0 && <Badge size="1" variant="soft" color="violet" ml="2">{exerciseCount}</Badge>}
          </Tabs.Trigger>
          <Tabs.Trigger value="backend">
            Backend Prep
            {backendSectionCount > 0 && <Badge size="1" variant="soft" color="teal" ml="2">{backendSectionCount}</Badge>}
          </Tabs.Trigger>
          <Tabs.Trigger value="study">Study</Tabs.Trigger>
        </Tabs.List>

        <Box pt="4">
          <Tabs.Content value="description">
            <JobDescriptionTab
              app={app}
              isAdmin={isAdmin}
              activeLinkTarget={activeLinkTarget}
              onSetActiveLinkTarget={setActiveLinkTarget}
              onOpenTopic={handleOpenTopic}
              flashRequirement={flashRequirement}
              refetch={refetch}
            />
          </Tabs.Content>
          <Tabs.Content value="interview">
            <InterviewPrepTab
              app={app}
              isAdmin={isAdmin}
              onOpenTopic={handleOpenTopic}
              onOpenStudyTopic={handleOpenStudyTopic}
            />
          </Tabs.Content>
          <Tabs.Content value="coding">
            <CodingTab app={app} isAdmin={isAdmin} />
          </Tabs.Content>
          <Tabs.Content value="backend">
            <BackendPrepTab app={app} isAdmin={isAdmin} />
          </Tabs.Content>
          <Tabs.Content value="study">
            <StudyTab app={app} isAdmin={isAdmin} />
          </Tabs.Content>
        </Box>
      </Tabs.Root>

      <RequirementDialog
        selectedReq={selectedReq}
        onClose={() => { setSelectedReq(null); setDeepDiveError(null); }}
        deepDiveLoading={deepDiveLoading}
        deepDiveError={deepDiveError}
        onOpenStudyTopic={handleOpenStudyTopic}
        onLinkSource={handleLinkSource}
        companyKey={app.companyKey}
      />

      <StudyTopicDialog
        selectedStudyTopic={selectedStudyTopic}
        onClose={() => { setSelectedStudyTopic(null); setStudyTopicError(null); }}
        studyTopicLoading={studyTopicLoading}
        studyTopicError={studyTopicError}
      />
    </Container>
  );
}

export default function ApplicationDetailPage() {
  return (
    <Suspense fallback={
      <Container size="3" p="8">
        <Skeleton height="32px" mb="6" style={{ maxWidth: 200 }} />
        <Skeleton height="400px" />
      </Container>
    }>
      <ApplicationDetailInner />
    </Suspense>
  );
}
