"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Heading,
  Button,
  Flex,
  Text,
  Box,
  Card,
  Badge,
} from "@radix-ui/themes";
import { PlusIcon } from "@radix-ui/react-icons";
import { useState } from "react";
import { useGenerateBackendPrepMutation } from "@/__generated__/hooks";
import type { TabBaseProps } from "./types";

export function BackendPrepTab({ app, isAdmin }: TabBaseProps) {
  const [generateBackendPrep] = useGenerateBackendPrepMutation();
  const [backendTopicOpen, setBackendTopicOpen] = useState<string | null>(null);
  const [backendQuestionOpen, setBackendQuestionOpen] = useState<string | null>(null);

  return (
    <Card mb="5">
      <Flex justify="between" align="center" mb="3">
        <Flex align="center" gap="2">
          <Heading size="4">Backend Interview Prep</Heading>
          <Badge size="1" variant="soft" color="teal">20 Topics</Badge>
        </Flex>
        {isAdmin && !app.aiBackendPrep && (
          <Button
            variant="soft"
            size="2"
            onClick={() => {
              generateBackendPrep({
                variables: { applicationId: app.id },
                refetchQueries: ["GetApplication"],
              });
            }}
          >
            <PlusIcon />
            Refresh from D1
          </Button>
        )}
      </Flex>

      {!app.aiBackendPrep && (
        <Text size="2" color="gray">
          No backend prep yet. Run <code style={{ fontSize: "var(--font-size-1)", backgroundColor: "var(--gray-3)", padding: "2px 6px", borderRadius: 4 }}>cargo run -- backend --app-id {app.id}</code> to generate 20-topic deep-dive content with the Rust research agent, then refresh.
        </Text>
      )}

      {app.aiBackendPrep && (() => {
        const bp = app.aiBackendPrep;
        const sections: { key: string; label: string; color: "teal" | "blue" | "violet" | "cyan" | "green" | "orange" | "red" | "amber" | "indigo" | "plum"; data: typeof bp.systemDesign }[] = [
          { key: "systemDesign", label: "System Design", color: "teal", data: bp.systemDesign },
          { key: "distributedSystems", label: "Distributed Systems", color: "blue", data: bp.distributedSystems },
          { key: "databaseDesign", label: "Database Design", color: "violet", data: bp.databaseDesign },
          { key: "sqlOptimization", label: "SQL Optimization", color: "cyan", data: bp.sqlOptimization },
          { key: "nosqlPatterns", label: "NoSQL Patterns", color: "green", data: bp.nosqlPatterns },
          { key: "apiDesign", label: "API Design", color: "orange", data: bp.apiDesign },
          { key: "authSecurity", label: "Auth & Security", color: "red", data: bp.authSecurity },
          { key: "caching", label: "Caching", color: "amber", data: bp.caching },
          { key: "messageQueues", label: "Message Queues", color: "indigo", data: bp.messageQueues },
          { key: "microservices", label: "Microservices", color: "plum", data: bp.microservices },
          { key: "testing", label: "Testing", color: "teal", data: bp.testing },
          { key: "devops", label: "DevOps & CI/CD", color: "blue", data: bp.devops },
          { key: "securityOwasp", label: "Security & OWASP", color: "red", data: bp.securityOwasp },
          { key: "performance", label: "Performance", color: "green", data: bp.performance },
          { key: "concurrencyAsync", label: "Concurrency & Async", color: "violet", data: bp.concurrencyAsync },
          { key: "observability", label: "Observability", color: "cyan", data: bp.observability },
          { key: "eventDriven", label: "Event-Driven", color: "orange", data: bp.eventDriven },
          { key: "serverlessEdge", label: "Serverless & Edge", color: "amber", data: bp.serverlessEdge },
          { key: "typescriptNode", label: "TypeScript & Node.js", color: "indigo", data: bp.typescriptNode },
          { key: "aiMlIntegration", label: "AI/ML Integration", color: "plum", data: bp.aiMlIntegration },
        ];

        const activeSections = sections.filter((s) => s.data?.title || s.data?.overview);

        return (
          <Box>
            <Flex gap="2" wrap="wrap" mb="4">
              {activeSections.map((s) => (
                <Badge
                  key={s.key}
                  size="2"
                  variant={backendTopicOpen === s.key ? "solid" : "soft"}
                  color={s.color}
                  style={{ cursor: "pointer", padding: "6px 12px" }}
                  onClick={() => setBackendTopicOpen(backendTopicOpen === s.key ? null : s.key)}
                >
                  {s.label}
                </Badge>
              ))}
            </Flex>

            {activeSections.map((s) => {
              if (backendTopicOpen !== s.key || !s.data) return null;
              const sec = s.data;
              return (
                <Box key={s.key}>
                  {/* Overview */}
                  {sec.overview && (
                    <Box mb="4">
                      <Text size="1" color="gray" weight="medium" mb="2" as="div" style={{ textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        Overview
                      </Text>
                      <Box p="4" style={{ backgroundColor: `var(--${s.color}-2)`, borderRadius: "var(--radius-3)", borderLeft: `3px solid var(--${s.color}-9)` }}>
                        <Box className="deep-dive-content" style={{ fontSize: "var(--font-size-2)", lineHeight: 1.7 }}>
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{sec.overview}</ReactMarkdown>
                        </Box>
                      </Box>
                    </Box>
                  )}

                  {/* Key Concepts */}
                  {sec.keyConcepts && sec.keyConcepts.length > 0 && (
                    <Box mb="4">
                      <Text size="1" color="gray" weight="medium" mb="2" as="div" style={{ textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        Key Concepts
                      </Text>
                      <Flex gap="1" wrap="wrap">
                        {sec.keyConcepts.map((c, i) => (
                          <Badge key={i} size="1" variant="outline" color={s.color}>{c}</Badge>
                        ))}
                      </Flex>
                    </Box>
                  )}

                  {/* Deep Dive */}
                  {sec.deepDive && (
                    <Box mb="4">
                      <Text size="1" color="gray" weight="medium" mb="2" as="div" style={{ textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        Deep Dive
                      </Text>
                      <Box p="4" style={{ backgroundColor: "var(--gray-2)", borderRadius: "var(--radius-3)" }}>
                        <Box className="deep-dive-content" style={{ fontSize: "var(--font-size-2)", lineHeight: 1.7 }}>
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{sec.deepDive}</ReactMarkdown>
                        </Box>
                      </Box>
                    </Box>
                  )}

                  {/* Interview Questions */}
                  {sec.interviewQuestions && sec.interviewQuestions.length > 0 && (
                    <Box mb="4">
                      <Text size="1" color="gray" weight="medium" mb="2" as="div" style={{ textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        Interview Questions ({sec.interviewQuestions.length})
                      </Text>
                      <Flex direction="column" gap="3">
                        {sec.interviewQuestions.map((q, qi) => {
                          const qKey = `${s.key}-q${qi}`;
                          return (
                            <Box
                              key={qi}
                              p="3"
                              style={{
                                backgroundColor: "var(--gray-2)",
                                borderRadius: "var(--radius-2)",
                                borderLeft: `3px solid ${q.difficulty === "easy" ? "var(--green-9)" : q.difficulty === "medium" ? "var(--amber-9)" : q.difficulty === "hard" ? "var(--red-9)" : "var(--violet-9)"}`,
                              }}
                            >
                              <Flex justify="between" align="start" gap="2" mb="2">
                                <Text size="2" weight="bold">{q.question}</Text>
                                <Badge size="1" variant="soft" color={q.difficulty === "easy" ? "green" : q.difficulty === "medium" ? "amber" : q.difficulty === "hard" ? "red" : "violet"} style={{ flexShrink: 0 }}>
                                  {q.difficulty}
                                </Badge>
                              </Flex>
                              <Button size="2" variant="soft" color={s.color} onClick={() => setBackendQuestionOpen(backendQuestionOpen === qKey ? null : qKey)}>
                                {backendQuestionOpen === qKey ? "Hide answer" : "Show ideal answer"}
                              </Button>
                              {backendQuestionOpen === qKey && (
                                <Box mt="2">
                                  <Box p="3" style={{ backgroundColor: "var(--gray-3)", borderRadius: "var(--radius-2)" }}>
                                    <Box className="deep-dive-content" style={{ fontSize: "var(--font-size-2)", lineHeight: 1.7 }}>
                                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{q.idealAnswer}</ReactMarkdown>
                                    </Box>
                                  </Box>
                                  {q.followUps && q.followUps.length > 0 && (
                                    <Box mt="2">
                                      <Text size="1" color="gray" weight="medium" mb="1" as="div">Follow-up questions</Text>
                                      {q.followUps.map((f, fi) => (
                                        <Text key={fi} size="1" color="gray" as="div">· {f}</Text>
                                      ))}
                                    </Box>
                                  )}
                                </Box>
                              )}
                            </Box>
                          );
                        })}
                      </Flex>
                    </Box>
                  )}

                  {/* Code Examples */}
                  {sec.codeExamples && sec.codeExamples.length > 0 && (
                    <Box mb="4">
                      <Text size="1" color="gray" weight="medium" mb="2" as="div" style={{ textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        Code Examples ({sec.codeExamples.length})
                      </Text>
                      <Flex direction="column" gap="3">
                        {sec.codeExamples.map((ce, cei) => (
                          <Box key={cei} p="3" style={{ backgroundColor: "var(--gray-2)", borderRadius: "var(--radius-2)" }}>
                            <Flex justify="between" align="center" mb="2">
                              <Text size="2" weight="bold">{ce.title}</Text>
                              <Badge size="1" variant="soft" color="gray">{ce.language}</Badge>
                            </Flex>
                            <Box p="3" mb="2" style={{ backgroundColor: "var(--gray-3)", borderRadius: "var(--radius-2)", overflowX: "auto", WebkitOverflowScrolling: "touch", maxWidth: "100%" }}>
                              <Text size="1" as="div" style={{ fontFamily: "monospace", whiteSpace: "pre", lineHeight: 1.6, minWidth: "min-content" }}>
                                {ce.code}
                              </Text>
                            </Box>
                            <Text size="1" color="gray" as="div">{ce.explanation}</Text>
                          </Box>
                        ))}
                      </Flex>
                    </Box>
                  )}

                  {/* Common Pitfalls */}
                  {sec.commonPitfalls && sec.commonPitfalls.length > 0 && (
                    <Box mb="4">
                      <Text size="1" color="gray" weight="medium" mb="2" as="div" style={{ textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        Common Pitfalls
                      </Text>
                      <Flex direction="column" gap="1">
                        {sec.commonPitfalls.map((p, pi) => (
                          <Flex key={pi} align="start" gap="2" p="2" style={{ backgroundColor: "var(--red-2)", borderRadius: "var(--radius-2)" }}>
                            <Text size="2" color="red" style={{ flexShrink: 0 }}>!</Text>
                            <Text size="2">{p}</Text>
                          </Flex>
                        ))}
                      </Flex>
                    </Box>
                  )}

                  {/* Talking Points */}
                  {sec.talkingPoints && sec.talkingPoints.length > 0 && (
                    <Box mb="4">
                      <Text size="1" color="gray" weight="medium" mb="2" as="div" style={{ textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        Talking Points
                      </Text>
                      <Flex direction="column" gap="1">
                        {sec.talkingPoints.map((tp, tpi) => (
                          <Flex key={tpi} align="start" gap="2" p="2" style={{ backgroundColor: "var(--green-2)", borderRadius: "var(--radius-2)" }}>
                            <Text size="2" color="green" style={{ flexShrink: 0 }}>+</Text>
                            <Text size="2">{tp}</Text>
                          </Flex>
                        ))}
                      </Flex>
                    </Box>
                  )}

                  {/* Research Insights */}
                  {sec.researchInsights && (
                    <Box mb="4">
                      <Text size="1" color="gray" weight="medium" mb="2" as="div" style={{ textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        Research Insights
                      </Text>
                      <Box p="4" style={{ backgroundColor: "var(--blue-2)", borderRadius: "var(--radius-3)", borderLeft: "3px solid var(--blue-9)" }}>
                        <Box className="deep-dive-content" style={{ fontSize: "var(--font-size-2)", lineHeight: 1.7 }}>
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{sec.researchInsights}</ReactMarkdown>
                        </Box>
                      </Box>
                    </Box>
                  )}
                </Box>
              );
            })}

            <Text size="1" color="gray" mt="4" as="div">
              Generated {new Date(bp.generatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
            </Text>
          </Box>
        );
      })()}
    </Card>
  );
}
