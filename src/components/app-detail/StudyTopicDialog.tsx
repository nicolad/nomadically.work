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
import type { AiInterviewPrepRequirement } from "@/__generated__/hooks";

interface StudyTopicDialogProps {
  selectedStudyTopic: { req: AiInterviewPrepRequirement; topic: string } | null;
  onClose: () => void;
  studyTopicLoading: boolean;
  studyTopicError: string | null;
}

export function StudyTopicDialog({
  selectedStudyTopic,
  onClose,
  studyTopicLoading,
  studyTopicError,
}: StudyTopicDialogProps) {
  return (
    <Dialog.Root
      open={!!selectedStudyTopic}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <Dialog.Content maxWidth="680px" style={{ maxHeight: "85vh", overflowY: "auto", width: "calc(100vw - 48px)" }}>
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
  );
}
