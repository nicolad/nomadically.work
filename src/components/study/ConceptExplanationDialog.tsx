"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Box, Dialog, Flex, Skeleton, Text } from "@radix-ui/themes";
import { Cross2Icon } from "@radix-ui/react-icons";

interface ConceptExplanationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedText: string;
  explanation: string | null;
  loading: boolean;
  error: string | null;
}

export function ConceptExplanationDialog({
  open,
  onOpenChange,
  selectedText,
  explanation,
  loading,
  error,
}: ConceptExplanationDialogProps) {
  const truncatedTitle =
    selectedText.length > 80 ? selectedText.slice(0, 80) + "..." : selectedText;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content maxWidth="680px" style={{ maxHeight: "80vh", display: "flex", flexDirection: "column" }}>
        <Flex justify="between" align="start" mb="3" gap="4">
          <Dialog.Title size="4" mb="0" style={{ fontStyle: "italic", flex: 1, minWidth: 0 }}>
            &ldquo;{truncatedTitle}&rdquo;
          </Dialog.Title>
          <Dialog.Close>
            <Box style={{ cursor: "pointer", color: "var(--gray-9)", flexShrink: 0, marginTop: 2 }}>
              <Cross2Icon width={16} height={16} />
            </Box>
          </Dialog.Close>
        </Flex>

        <Box style={{ flex: 1, overflowY: "auto" }}>
          {loading ? (
            <Flex direction="column" gap="3">
              <Skeleton height="20px" width="80%" />
              <Skeleton height="20px" width="90%" />
              <Skeleton height="20px" width="70%" />
              <Skeleton height="20px" width="85%" />
            </Flex>
          ) : error ? (
            <Text color="red" size="2">
              Failed to generate explanation. Please try again.
            </Text>
          ) : explanation ? (
            <Box style={{ lineHeight: 1.7 }}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{explanation}</ReactMarkdown>
            </Box>
          ) : null}
        </Box>
      </Dialog.Content>
    </Dialog.Root>
  );
}
