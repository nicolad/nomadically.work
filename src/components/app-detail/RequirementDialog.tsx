"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Flex,
  Button,
  Box,
  Text,
  Dialog,
} from "@radix-ui/themes";
import { Link2Icon } from "@radix-ui/react-icons";
import type { AiInterviewPrepRequirement } from "@/__generated__/hooks";
import Link from "next/link";

interface RequirementDialogProps {
  selectedReq: AiInterviewPrepRequirement | null;
  onClose: () => void;
  deepDiveLoading: boolean;
  deepDiveError: string | null;
  onOpenStudyTopic: (e: React.MouseEvent, req: AiInterviewPrepRequirement, topic: string) => void;
  onLinkSource: (requirement: string) => void;
  companyKey: string | null;
}

export function RequirementDialog({
  selectedReq,
  onClose,
  deepDiveLoading,
  deepDiveError,
  onOpenStudyTopic,
  onLinkSource,
  companyKey,
}: RequirementDialogProps) {
  return (
    <Dialog.Root
      open={!!selectedReq}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <Dialog.Content maxWidth="680px" style={{ maxHeight: "85vh", overflowY: "auto", width: "calc(100vw - 48px)" }}>
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
                onClick={() => onClose()}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") onClose();
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
                    onClick={(e) => onOpenStudyTopic(e, selectedReq, t)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") onOpenStudyTopic(e as any, selectedReq, t);
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
                {companyKey && (
                  <Button variant="ghost" size="2" asChild>
                    <Link href={`/prep/${companyKey}`}>View full prep →</Link>
                  </Button>
                )}
                <Dialog.Close asChild>
                  <Button
                    variant="ghost"
                    size="2"
                    color="amber"
                    onClick={() => onLinkSource(selectedReq.requirement)}
                  >
                    <Link2Icon />
                    {selectedReq.sourceQuote ? "Change link" : "Link source"}
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
  );
}
