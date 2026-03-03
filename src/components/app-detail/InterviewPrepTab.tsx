"use client";

import { useState, lazy, Suspense } from "react";
import {
  Heading,
  Button,
  Flex,
  Text,
  Box,
  Card,
  Badge,
  Skeleton,
  Select,
  IconButton,
} from "@radix-ui/themes";
import {
  ExternalLinkIcon,
  Cross1Icon,
  PlusIcon,
} from "@radix-ui/react-icons";
import {
  useGetTracksQuery,
  useLinkTrackToApplicationMutation,
  useUnlinkTrackFromApplicationMutation,
  useGenerateInterviewPrepMutation,
  useGenerateInterviewQuestionsMutation,
} from "@/__generated__/hooks";
import type { AiInterviewPrepRequirement } from "@/__generated__/hooks";
import Link from "next/link";
import type { AppData, TabBaseProps } from "./types";

const InterviewPrepFlow = lazy(() => import("@/components/interview-prep-flow"));

export interface InterviewPrepTabProps extends TabBaseProps {
  onOpenTopic: (req: AiInterviewPrepRequirement) => void;
  onOpenStudyTopic: (e: React.MouseEvent, req: AiInterviewPrepRequirement, topic: string) => void;
}

const TECHNICAL_CATEGORY_COLOR: Record<string, string> = {
  "System Design": "violet",
  "Agentic Coding": "blue",
  Architecture: "indigo",
  Performance: "orange",
  Testing: "green",
  DevOps: "amber",
  "Domain Knowledge": "cyan",
  "Technical Leadership": "crimson",
};

function technicalColor(category: string): string {
  return TECHNICAL_CATEGORY_COLOR[category] ?? "blue";
}

export function InterviewPrepTab({ app, isAdmin, onOpenTopic, onOpenStudyTopic }: InterviewPrepTabProps) {
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [generatingTechnical, setGeneratingTechnical] = useState(false);
  const [technicalError, setTechnicalError] = useState<string | null>(null);
  const [prepView, setPrepView] = useState<"list" | "graph">("list");

  const [generateInterviewPrep] = useGenerateInterviewPrepMutation();
  const [generateInterviewQuestions] = useGenerateInterviewQuestionsMutation();
  const [linkTrack] = useLinkTrackToApplicationMutation();
  const [unlinkTrack] = useUnlinkTrackFromApplicationMutation();
  const { data: tracksData } = useGetTracksQuery();

  const displayTitle = app.jobTitle ?? "Job application";

  return (
    <>
      {/* Interview Questions */}
      <Card mb="5">
        <Heading size="4" mb="3">Interview Questions</Heading>

        {app.aiInterviewQuestions?.companyContext && (
          <Box mb="4" p="3" style={{ backgroundColor: "var(--blue-2)", borderRadius: "var(--radius-2)" }}>
            <Text size="1" color="gray" weight="medium" mb="1" as="div">COMPANY CONTEXT</Text>
            <Text size="2" as="div">{app.aiInterviewQuestions.companyContext}</Text>
          </Box>
        )}

        <Box>
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
                      <Box key={i} p="3" style={{ backgroundColor: "var(--gray-2)", borderRadius: "var(--radius-2)", borderLeft: `3px solid var(--${technicalColor(q.category)}-9)` }}>
                        <Flex justify="between" align="start" gap="2" mb="2">
                          <Text size="2" weight="bold" as="div">{i + 1}. {q.question}</Text>
                          <Badge size="1" variant="soft" color={technicalColor(q.category) as any} style={{ flexShrink: 0 }}>{q.category}</Badge>
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
          </Box>
      </Card>

      {/* Interview Prep */}
      <Card mb="5">
        <Flex justify="between" align="center" mb="3">
          <Flex align="center" gap="2">
            <Heading size="4">Prep</Heading>
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
                  onRequirementClick={(req) => onOpenTopic(req)}
                  onStudyTopicClick={(req, topic) =>
                    onOpenStudyTopic(
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
                  onClick={() => onOpenTopic(req)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") onOpenTopic(req);
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
                          onClick={(e) => onOpenStudyTopic(e, req, t)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") onOpenStudyTopic(e as any, req, t);
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
    </>
  );
}
