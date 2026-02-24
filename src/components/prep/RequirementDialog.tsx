"use client";

import ReactMarkdown from "react-markdown";
import {
  Box,
  Button,
  Dialog,
  Flex,
  Text,
} from "@radix-ui/themes";
import {
  CheckCircledIcon,
  PlusCircledIcon,
  ReloadIcon,
} from "@radix-ui/react-icons";
import type { AiInterviewPrepRequirement } from "@/__generated__/hooks";

interface RequirementDialogProps {
  selectedReq: AiInterviewPrepRequirement | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onRegenerate: () => void;
  onStudyTopicClick: (topic: string) => void;
}

function PulsingSkeleton() {
  return (
    <Flex direction="column" gap="3" py="4">
      <style>{`
        @keyframes skeleton-pulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.8; }
        }
        .skeleton-line {
          background-color: var(--gray-5);
          animation: skeleton-pulse 1.5s ease-in-out infinite;
        }
      `}</style>
      <Text size="1" color="gray" as="div" mb="1">
        Generating deep-dive with DeepSeek Reasoner…
      </Text>
      {[100, 85, 92, 70, 88].map((width, i) => (
        <Box
          key={i}
          className="skeleton-line"
          style={{
            height: 14,
            width: `${width}%`,
            animationDelay: `${i * 0.15}s`,
          }}
        />
      ))}
      <Box
        className="skeleton-line"
        style={{ height: 14, width: "60%", animationDelay: "0.75s" }}
      />
      <Box mt="2" />
      {[95, 80].map((width, i) => (
        <Box
          key={`b${i}`}
          className="skeleton-line"
          style={{
            height: 14,
            width: `${width}%`,
            animationDelay: `${(i + 5) * 0.15}s`,
          }}
        />
      ))}
    </Flex>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <Flex align="center" gap="3" mb="3">
      <Text
        size="1"
        weight="bold"
        as="span"
        style={{
          color: "var(--gray-11)",
          letterSpacing: "0.08em",
          whiteSpace: "nowrap",
          textTransform: "uppercase",
        }}
      >
        {children}
      </Text>
      <Box
        style={{
          flex: 1,
          height: 1,
          backgroundColor: "var(--gray-4)",
        }}
      />
    </Flex>
  );
}

export function RequirementDialog({
  selectedReq,
  loading,
  error,
  onClose,
  onRegenerate,
  onStudyTopicClick,
}: RequirementDialogProps) {
  const totalTopics = selectedReq?.studyTopics.length ?? 0;
  const completedTopics =
    selectedReq?.studyTopicDeepDives?.filter((d) => d.deepDive).length ?? 0;
  const progressPct = totalTopics > 0 ? (completedTopics / totalTopics) * 100 : 0;

  return (
    <Dialog.Root
      open={!!selectedReq}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Dialog.Content
        maxWidth="720px"
        style={{ maxHeight: "85vh", overflowY: "auto", padding: 0 }}
      >
        {selectedReq && (
          <>
            {/* Progress bar */}
            <Box
              style={{
                height: 3,
                backgroundColor: "var(--gray-3)",
                width: "100%",
              }}
            >
              <Box
                style={{
                  height: "100%",
                  width: `${progressPct}%`,
                  backgroundColor: "var(--accent-9)",
                  transition: "width 0.4s ease",
                }}
              />
            </Box>

            <Box p="5">
              {/* Title + progress label */}
              <Flex justify="between" align="start" mb="1">
                <Dialog.Title style={{ margin: 0 }}>
                  {selectedReq.requirement}
                </Dialog.Title>
                {totalTopics > 0 && (
                  <Text
                    size="1"
                    color="gray"
                    style={{ whiteSpace: "nowrap", paddingLeft: 16, paddingTop: 4 }}
                  >
                    {completedTopics}/{totalTopics} topics
                  </Text>
                )}
              </Flex>

              {/* Source quote */}
              {selectedReq.sourceQuote && (
                <Box
                  mb="5"
                  mt="3"
                  pl="4"
                  py="2"
                  style={{
                    borderLeft: "3px solid var(--accent-6)",
                    backgroundColor: "var(--gray-2)",
                  }}
                >
                  <Text
                    size="2"
                    color="gray"
                    as="div"
                    style={{ fontStyle: "italic", lineHeight: 1.6 }}
                  >
                    <span
                      style={{
                        fontSize: "1.6em",
                        lineHeight: 0,
                        verticalAlign: "-0.3em",
                        marginRight: 4,
                        color: "var(--accent-9)",
                        fontStyle: "normal",
                      }}
                    >
                      &ldquo;
                    </span>
                    {selectedReq.sourceQuote}
                    <span
                      style={{
                        fontSize: "1.6em",
                        lineHeight: 0,
                        verticalAlign: "-0.3em",
                        marginLeft: 4,
                        color: "var(--accent-9)",
                        fontStyle: "normal",
                      }}
                    >
                      &rdquo;
                    </span>
                  </Text>
                </Box>
              )}

              {/* Interview questions */}
              <Box mb="5">
                <SectionLabel>Interview Questions</SectionLabel>
                <Flex direction="column" gap="3">
                  {selectedReq.questions.map((q, i) => (
                    <Flex key={q} align="start" gap="3">
                      <Flex
                        align="center"
                        justify="center"
                        flexShrink="0"
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: "50%",
                          backgroundColor: "var(--accent-9)",
                          color: "white",
                          fontSize: 11,
                          fontWeight: 700,
                          marginTop: 1,
                        }}
                      >
                        {i + 1}
                      </Flex>
                      <Text size="2" as="div" style={{ lineHeight: 1.6, flex: 1 }}>
                        {q}
                      </Text>
                    </Flex>
                  ))}
                </Flex>
              </Box>

              {/* Study topics */}
              <Box mb="5">
                <SectionLabel>Study Topics</SectionLabel>
                <Flex gap="2" wrap="wrap">
                  {selectedReq.studyTopics.map((t) => {
                    const hasDeepDive = selectedReq.studyTopicDeepDives?.some(
                      (d) => d.topic === t && d.deepDive
                    );
                    return (
                      <Flex
                        key={t}
                        align="center"
                        gap="1"
                        role="button"
                        tabIndex={0}
                        onClick={() => onStudyTopicClick(t)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            onStudyTopicClick(t);
                          }
                        }}
                        style={{
                          padding: "3px 10px",
                          backgroundColor: hasDeepDive
                            ? "var(--violet-5)"
                            : "var(--violet-3)",
                          cursor: "pointer",
                          border: hasDeepDive
                            ? "1px solid var(--violet-7)"
                            : "1px solid var(--violet-4)",
                          outline: "none",
                        }}
                      >
                        {hasDeepDive ? (
                          <CheckCircledIcon
                            style={{ color: "var(--green-9)", flexShrink: 0 }}
                          />
                        ) : (
                          <PlusCircledIcon
                            style={{ color: "var(--violet-9)", flexShrink: 0 }}
                          />
                        )}
                        <Text size="1" style={{ color: "var(--gray-12)" }}>
                          {t}
                        </Text>
                      </Flex>
                    );
                  })}
                </Flex>
              </Box>

              {/* Deep dive */}
              <Box pt="4" style={{ borderTop: "1px solid var(--gray-4)" }}>
                <Flex justify="between" align="center" mb="3">
                  <SectionLabel>Deep Dive</SectionLabel>
                  {selectedReq.deepDive && !loading && (
                    <Button
                      variant="ghost"
                      size="1"
                      color="gray"
                      onClick={onRegenerate}
                      style={{ marginLeft: 8, flexShrink: 0 }}
                    >
                      <ReloadIcon />
                      Regenerate
                    </Button>
                  )}
                </Flex>

                {loading ? (
                  <PulsingSkeleton />
                ) : error ? (
                  <Flex direction="column" gap="2">
                    <Text size="2" color="red">
                      {error}
                    </Text>
                    <Button variant="soft" size="1" onClick={onRegenerate}>
                      Retry
                    </Button>
                  </Flex>
                ) : selectedReq.deepDive ? (
                  <Box className="deep-dive-content">
                    <ReactMarkdown>{selectedReq.deepDive}</ReactMarkdown>
                  </Box>
                ) : (
                  <Text size="2" color="gray">
                    No deep dive generated yet. Click Regenerate to generate one.
                  </Text>
                )}
              </Box>

              <Flex justify="end" mt="5">
                <Dialog.Close>
                  <Button variant="soft" color="gray" size="2" onClick={onClose}>
                    Close
                  </Button>
                </Dialog.Close>
              </Flex>
            </Box>
          </>
        )}
      </Dialog.Content>
    </Dialog.Root>
  );
}

export default RequirementDialog;
