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
import { PlusIcon, ExternalLinkIcon } from "@radix-ui/react-icons";
import { useState } from "react";
import { useGenerateAgenticCodingMutation } from "@/__generated__/hooks";
import type { TabBaseProps } from "./types";

export function CodingTab({ app, isAdmin }: TabBaseProps) {
  const [generateAgenticCoding] = useGenerateAgenticCodingMutation();
  const [generatingAgentic, setGeneratingAgentic] = useState(false);
  const [agenticError, setAgenticError] = useState<string | null>(null);
  const [agenticExerciseOpen, setAgenticExerciseOpen] = useState<number | null>(null);
  const [copiedPrompt, setCopiedPrompt] = useState<number | null>(null);

  return (
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
  );
}
