"use client";

import { lazy, Suspense } from "react";
import {
  Container,
  Heading,
  Text,
  Flex,
  Box,
  Button,
  Card,
  Skeleton,
} from "@radix-ui/themes";
import { ArrowLeftIcon } from "@radix-ui/react-icons";
import { useParams } from "next/navigation";
import { useGetApplicationsQuery } from "@/__generated__/hooks";
import type { AiInterviewPrepRequirement } from "@/__generated__/hooks";
import Link from "next/link";

const InterviewPrepFlow = lazy(() => import("@/components/interview-prep-flow"));

export default function PrepByCompanyPage() {
  const params = useParams();
  const key = params.key as string;

  const { data, loading } = useGetApplicationsQuery();

  const app = data?.applications?.find(
    (a) => a.companyKey === key || a.companyName?.toLowerCase().replace(/\s+/g, "") === key,
  );

  if (loading) {
    return (
      <Container size="4" p="8">
        <Skeleton height="32px" mb="6" style={{ maxWidth: 200 }} />
        <Skeleton height="80vh" />
      </Container>
    );
  }

  if (!app || !app.aiInterviewPrep) {
    return (
      <Container size="3" p="8">
        <Card>
          <Flex direction="column" align="center" gap="4" p="6">
            <Heading size="5">
              {!app ? "Application Not Found" : "No Interview Prep"}
            </Heading>
            <Text color="gray">
              {!app
                ? `No application found for "${key}".`
                : "This application has no AI-generated interview prep yet."}
            </Text>
            <Flex gap="3">
              <Button variant="soft" asChild>
                <Link href="/prep">All Tracks</Link>
              </Button>
              {app && (
                <Button asChild>
                  <Link href={`/applications/${app.id}`}>Go to Application</Link>
                </Button>
              )}
            </Flex>
          </Flex>
        </Card>
      </Container>
    );
  }

  const displayTitle = app.jobTitle ?? "Job application";
  const displayCompany = app.companyName ?? key;

  return (
    <Container size="4" p={{ initial: "4", md: "6" }}>
      {/* Header */}
      <Flex justify="between" align="center" mb="4">
        <Flex direction="column" gap="1">
          <Flex align="center" gap="2">
            <Button variant="ghost" size="1" asChild>
              <Link href="/prep">
                <ArrowLeftIcon /> Prep
              </Link>
            </Button>
            <Text size="1" color="gray">/</Text>
            <Text size="1" color="gray">{displayCompany}</Text>
          </Flex>
          <Heading size="7">{displayTitle}</Heading>
          <Text size="3" color="gray">
            {displayCompany} &middot; {app.aiInterviewPrep.requirements.length} requirements &middot;{" "}
            {app.aiInterviewPrep.requirements.reduce((s, r) => s + r.studyTopics.length, 0)} topics
          </Text>
        </Flex>
        <Button variant="soft" asChild>
          <Link href={`/applications/${app.id}`}>View Application</Link>
        </Button>
      </Flex>

      {/* Summary */}
      <Box mb="4">
        <Text size="2" color="gray">
          {app.aiInterviewPrep.summary}
        </Text>
      </Box>

      {/* Full-page graph */}
      <Suspense fallback={<Skeleton height="80vh" />}>
        <Box style={{ height: "calc(100vh - 220px)", minHeight: 500 }}>
          <InterviewPrepFlow
            jobTitle={displayTitle}
            aiInterviewPrep={app.aiInterviewPrep}
            height="100%"
            onRequirementClick={(req: AiInterviewPrepRequirement) => {
              // Navigate to the application detail page with the requirement dialog
              window.open(`/applications/${app.id}`, "_blank");
            }}
            onStudyTopicClick={(req: AiInterviewPrepRequirement, topic: string) => {
              window.open(`/applications/${app.id}`, "_blank");
            }}
          />
        </Box>
      </Suspense>
    </Container>
  );
}
