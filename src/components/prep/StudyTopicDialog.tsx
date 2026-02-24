"use client";

import ReactMarkdown from "react-markdown";
import {
  Dialog,
  Box,
  Flex,
  Text,
  Button,
} from "@radix-ui/themes";
import {
  BookmarkIcon,
  ReloadIcon,
  ExclamationTriangleIcon,
} from "@radix-ui/react-icons";
import type { AiInterviewPrepRequirement } from "@/__generated__/hooks";

function LoadingDots() {
  return (
    <Flex gap="1" align="center" aria-label="Loading">
      {[0, 1, 2].map((i) => (
        <Box
          key={i}
          style={{
            width: 6,
            height: 6,
            backgroundColor: "var(--violet-9)",
            animation: "loadingDot 1.2s ease-in-out infinite",
            animationDelay: `${i * 0.2}s`,
          }}
        />
      ))}
      <style>{`
        @keyframes loadingDot {
          0%, 80%, 100% { opacity: 0.2; transform: scale(0.8); }
          40%            { opacity: 1;   transform: scale(1); }
        }
      `}</style>
    </Flex>
  );
}

function SkeletonLine({ width = "100%", height = 12 }: { width?: string; height?: number }) {
  return (
    <Box
      style={{
        width,
        height,
        backgroundColor: "var(--gray-4)",
        animation: "skeletonPulse 1.6s ease-in-out infinite",
      }}
    />
  );
}

function ContentSkeleton() {
  return (
    <Box style={{ paddingTop: 4 }}>
      <style>{`
        @keyframes skeletonPulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.4; }
        }
      `}</style>
      <SkeletonLine width="55%" height={16} />
      <Box style={{ marginTop: 12 }} />
      {["100%", "92%", "97%", "78%"].map((w, i) => (
        <Box key={i} style={{ marginTop: 8 }}>
          <SkeletonLine width={w} />
        </Box>
      ))}
      <Box style={{ marginTop: 20 }} />
      <SkeletonLine width="40%" height={14} />
      <Box style={{ marginTop: 12 }} />
      {["88%", "70%", "82%", "65%"].map((w, i) => (
        <Flex key={i} gap="2" align="center" style={{ marginTop: 8 }}>
          <Box style={{ width: 6, height: 6, backgroundColor: "var(--gray-5)", flexShrink: 0 }} />
          <SkeletonLine width={w} />
        </Flex>
      ))}
      <Box style={{ marginTop: 20 }} />
      {["100%", "94%", "60%"].map((w, i) => (
        <Box key={i} style={{ marginTop: 8 }}>
          <SkeletonLine width={w} />
        </Box>
      ))}
    </Box>
  );
}

function estimateReadingMinutes(text: string): number {
  const wordCount = text.trim().split(/\s+/).length;
  return Math.max(1, Math.round(wordCount / 200));
}

interface StudyTopicDialogProps {
  selectedStudyTopic: { req: AiInterviewPrepRequirement; topic: string } | null;
  loading: boolean;
  error: string | null;
  deepDiveContent: string | null | undefined;
  onClose: () => void;
  onRegenerate: () => void;
}

export function StudyTopicDialog({
  selectedStudyTopic,
  loading,
  error,
  deepDiveContent,
  onClose,
  onRegenerate,
}: StudyTopicDialogProps) {
  const isOpen = !!selectedStudyTopic;
  const readingMinutes =
    deepDiveContent && !loading ? estimateReadingMinutes(deepDiveContent) : null;

  return (
    <Dialog.Root
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Dialog.Content
        maxWidth="740px"
        style={{
          maxHeight: "88vh",
          overflowY: "auto",
          borderLeft: "3px solid var(--violet-9)",
          padding: "var(--space-5)",
        }}
      >
        {selectedStudyTopic && (
          <>
            {/* Context breadcrumb */}
            <Box
              mb="4"
              px="3"
              py="2"
              style={{
                backgroundColor: "var(--gray-3)",
                borderLeft: "2px solid var(--violet-9)",
              }}
            >
              <Text size="1" color="gray" style={{ textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Requirement context
              </Text>
              <Text size="2" color="gray" as="div" mt="1" style={{ lineHeight: 1.4 }}>
                {selectedStudyTopic.req.requirement}
              </Text>
            </Box>

            {/* Dialog title */}
            <Flex align="center" gap="2" mb="1">
              <BookmarkIcon
                width={18}
                height={18}
                style={{ color: "var(--violet-9)", flexShrink: 0 }}
              />
              <Dialog.Title style={{ margin: 0, color: "var(--gray-12)" }}>
                {selectedStudyTopic.topic}
              </Dialog.Title>
            </Flex>

            {readingMinutes !== null && (
              <Text size="1" mb="4" as="div" style={{ color: "var(--violet-9)" }}>
                ~{readingMinutes} min read
              </Text>
            )}

            {/* Section header */}
            <Flex
              justify="between"
              align="center"
              mb="3"
              pt="3"
              style={{ borderTop: "1px solid var(--gray-4)" }}
            >
              <Flex align="center" gap="2">
                <Box style={{ width: 3, height: 14, backgroundColor: "var(--violet-9)" }} />
                <Text
                  size="1"
                  weight="medium"
                  style={{ color: "var(--violet-9)", textTransform: "uppercase", letterSpacing: "0.08em" }}
                >
                  Focused Deep Dive
                </Text>
              </Flex>
              {deepDiveContent && !loading && (
                <Button variant="ghost" size="1" color="gray" onClick={onRegenerate}>
                  <ReloadIcon />
                  Regenerate
                </Button>
              )}
            </Flex>

            {/* Content */}
            {loading ? (
              <Box>
                <Flex align="center" gap="3" mb="4">
                  <LoadingDots />
                  <Text size="2" color="gray">Generating deep dive…</Text>
                </Flex>
                <ContentSkeleton />
              </Box>
            ) : error ? (
              <Box
                p="3"
                style={{
                  backgroundColor: "var(--gray-3)",
                  borderLeft: "2px solid var(--amber-9)",
                }}
              >
                <Flex align="center" gap="2" mb="1">
                  <ExclamationTriangleIcon style={{ color: "var(--amber-9)" }} />
                  <Text size="2" weight="medium" style={{ color: "var(--amber-9)" }}>
                    Generation failed
                  </Text>
                </Flex>
                <Text size="2" color="gray" as="div" mb="3">{error}</Text>
                <Button size="2" variant="soft" color="gray" onClick={onRegenerate}>
                  <ReloadIcon /> Try again
                </Button>
              </Box>
            ) : deepDiveContent ? (
              <Box className="deep-dive-content">
                <ReactMarkdown>{deepDiveContent}</ReactMarkdown>
              </Box>
            ) : (
              <Box
                p="5"
                style={{
                  backgroundColor: "var(--gray-2)",
                  border: "1px dashed var(--gray-5)",
                  textAlign: "center",
                }}
              >
                <Box mb="3" style={{ color: "var(--gray-6)" }}>
                  <BookmarkIcon width={28} height={28} />
                </Box>
                <Text size="3" weight="medium" color="gray" as="div" mb="2">
                  No deep dive generated yet
                </Text>
                <Text size="2" color="gray" as="div" mb="4">
                  Click below to generate a focused deep dive for this topic.
                </Text>
                <Button size="2" variant="soft" color="violet" onClick={onRegenerate}>
                  <ReloadIcon /> Generate deep dive
                </Button>
              </Box>
            )}

            {/* Footer */}
            <Flex justify="end" mt="5" pt="4" style={{ borderTop: "1px solid var(--gray-4)" }}>
              <Dialog.Close>
                <Button variant="soft" color="gray" size="2" onClick={onClose}>
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

export default StudyTopicDialog;
