"use client";

import { useState } from "react";
import { Box, Button, Flex, Heading, Text, TextField } from "@radix-ui/themes";
import { CheckIcon, Cross1Icon, Link2Icon } from "@radix-ui/react-icons";
import type { AiInterviewPrepRequirement } from "@/__generated__/hooks";

interface PrepLinkPanelProps {
  open: boolean;
  selectedText: string;
  requirements: AiInterviewPrepRequirement[];
  onLink: (requirement: string) => void;
  onClose: () => void;
  isLinking: boolean;
  linkingRequirement: string | null;
}

export function PrepLinkPanel({
  open,
  selectedText,
  requirements,
  onLink,
  onClose,
  isLinking,
  linkingRequirement,
}: PrepLinkPanelProps) {
  const [search, setSearch] = useState("");

  const filtered = requirements.filter((r) =>
    r.requirement.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <>
      {open && (
        <Box
          onClick={onClose}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 99,
            background: "rgba(0,0,0,0.3)",
          }}
        />
      )}

      <Box
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          height: "100vh",
          width: 380,
          zIndex: 100,
          background: "var(--gray-1)",
          borderLeft: "1px solid var(--gray-5)",
          padding: "var(--space-5)",
          overflowY: "auto",
          transform: open ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        {/* Header */}
        <Flex align="center" justify="between" mb="4">
          <Heading size="4" style={{ color: "var(--gray-12)" }}>
            Link to requirement
          </Heading>
          <Button
            variant="ghost"
            size="1"
            onClick={onClose}
            style={{ cursor: "pointer", color: "var(--gray-11)" }}
          >
            <Cross1Icon />
          </Button>
        </Flex>

        {/* Selected text blockquote */}
        {selectedText && (
          <Box
            mb="4"
            style={{
              background: "var(--gray-3)",
              borderLeft: "3px solid var(--amber-7)",
              padding: "var(--space-3)",
            }}
          >
            <Text size="2" style={{ color: "var(--gray-11)", fontStyle: "italic" }}>
              &ldquo;{selectedText}&rdquo;
            </Text>
          </Box>
        )}

        {/* Search */}
        <Box mb="4">
          <TextField.Root
            placeholder="Filter requirements..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            size="2"
          />
        </Box>

        {/* Requirements list */}
        <Flex direction="column" gap="3">
          {filtered.length === 0 && (
            <Text size="2" style={{ color: "var(--gray-11)" }}>
              No requirements found.
            </Text>
          )}

          {filtered.map((req) => {
            const isAlreadyLinked =
              req.sourceQuote != null && req.sourceQuote === selectedText;
            const isCurrentlyLinking =
              isLinking && linkingRequirement === req.requirement;

            return (
              <Box
                key={req.requirement}
                p="3"
                style={{
                  background: "var(--gray-2)",
                  border: "1px solid var(--gray-4)",
                }}
              >
                <Text
                  size="2"
                  weight="bold"
                  style={{
                    color: "var(--gray-12)",
                    display: "block",
                    marginBottom: "var(--space-1)",
                  }}
                >
                  {req.requirement}
                </Text>

                {req.sourceQuote && !isAlreadyLinked && (
                  <Text
                    size="1"
                    style={{
                      color: "var(--gray-11)",
                      fontStyle: "italic",
                      display: "block",
                      marginBottom: "var(--space-2)",
                    }}
                  >
                    &ldquo;
                    {req.sourceQuote.length > 60
                      ? `${req.sourceQuote.slice(0, 60)}…`
                      : req.sourceQuote}
                    &rdquo;
                  </Text>
                )}

                {req.studyTopics.length > 0 && (
                  <Flex gap="1" wrap="wrap" style={{ marginBottom: "var(--space-2)" }}>
                    {req.studyTopics.map((topic) => (
                      <Box
                        key={topic}
                        px="2"
                        py="1"
                        style={{
                          background: "var(--gray-4)",
                          fontSize: "10px",
                          color: "var(--gray-11)",
                          lineHeight: 1.4,
                        }}
                      >
                        {topic}
                      </Box>
                    ))}
                  </Flex>
                )}

                {isAlreadyLinked ? (
                  <Flex align="center" gap="1">
                    <CheckIcon width={12} height={12} style={{ color: "var(--green-9)" }} />
                    <Text size="1" weight="medium" style={{ color: "var(--green-9)" }}>
                      Linked
                    </Text>
                  </Flex>
                ) : (
                  <Button
                    size="1"
                    variant="soft"
                    onClick={() => onLink(req.requirement)}
                    disabled={isCurrentlyLinking}
                    style={{ cursor: isCurrentlyLinking ? "wait" : "pointer" }}
                  >
                    <Link2Icon width={12} height={12} />
                    {isCurrentlyLinking ? "Linking…" : "Link"}
                  </Button>
                )}
              </Box>
            );
          })}
        </Flex>
      </Box>
    </>
  );
}
