"use client";

import { Container, Flex, Box, Heading, Text, Button, Card } from "@radix-ui/themes";
import { MagnifyingGlassIcon, ArrowLeftIcon } from "@radix-ui/react-icons";
import Link from "next/link";

interface PrepEmptyStateProps {
  type: "not-found" | "no-prep";
  companyKey: string;
  appId?: string;
  onGeneratePrep?: () => void;
}

export function PrepEmptyState({ type, companyKey, appId, onGeneratePrep }: PrepEmptyStateProps) {
  if (type === "not-found") {
    return (
      <Container size="2" p={{ initial: "4", md: "8" }}>
        <Card style={{ border: "1px solid var(--gray-4)", backgroundColor: "var(--gray-2)" }}>
          <Flex direction="column" align="center" gap="5" p="8">
            <Box
              style={{
                width: 56,
                height: 56,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "var(--gray-3)",
                border: "1px solid var(--gray-5)",
              }}
            >
              <MagnifyingGlassIcon width="26" height="26" style={{ color: "var(--gray-11)" }} />
            </Box>

            <Flex direction="column" align="center" gap="2">
              <Heading size="5" style={{ color: "var(--gray-12)" }}>
                Application not found
              </Heading>
              <Text size="2" color="gray" align="center" style={{ maxWidth: 360, lineHeight: "1.6" }}>
                No application matched{" "}
                <Text size="2" style={{ color: "var(--gray-11)", fontFamily: "monospace" }}>
                  {companyKey}
                </Text>
                . The application may have been removed, or the link may be incorrect.
              </Text>
            </Flex>

            <Flex gap="3">
              <Button variant="soft" color="gray" asChild>
                <Link href="/prep">
                  <ArrowLeftIcon /> All Prep Tracks
                </Link>
              </Button>
              <Button variant="soft" asChild>
                <Link href="/applications">View Applications</Link>
              </Button>
            </Flex>
          </Flex>
        </Card>
      </Container>
    );
  }

  return (
    <Container size="2" p={{ initial: "4", md: "8" }}>
      <Card style={{ border: "1px solid var(--gray-4)", backgroundColor: "var(--gray-2)" }}>
        <Flex direction="column" align="center" gap="5" p="8">
          <Box
            style={{
              width: 56,
              height: 56,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "var(--gray-3)",
              border: "1px solid var(--accent-9)",
            }}
          >
            <SparkleIcon />
          </Box>

          <Flex direction="column" align="center" gap="2">
            <Heading size="5" style={{ color: "var(--gray-12)" }}>
              No interview prep yet
            </Heading>
            <Text size="2" color="gray" align="center" style={{ maxWidth: 380, lineHeight: "1.6" }}>
              AI interview prep analyzes the job description to surface key requirements,
              generate tailored interview questions, and build a study plan mapped to your skills.
            </Text>
          </Flex>

          <Box
            p="4"
            style={{
              border: "1px solid var(--gray-4)",
              backgroundColor: "var(--gray-3)",
              width: "100%",
              maxWidth: 360,
            }}
          >
            <Flex direction="column" gap="2">
              {[
                "Requirements extracted from job description",
                "Tailored interview questions per topic",
                "Study topics with AI deep-dives on demand",
              ].map((item) => (
                <Flex key={item} align="center" gap="2">
                  <Box
                    style={{ width: 6, height: 6, backgroundColor: "var(--accent-9)", flexShrink: 0 }}
                  />
                  <Text size="2" color="gray">{item}</Text>
                </Flex>
              ))}
            </Flex>
          </Box>

          <Flex gap="3" align="center">
            <Button variant="ghost" color="gray" asChild>
              <Link href="/prep"><ArrowLeftIcon /> All Tracks</Link>
            </Button>
            {appId && (
              <Button variant="soft" color="gray" asChild>
                <Link href={`/applications/${appId}`}>View Application</Link>
              </Button>
            )}
            <Button
              onClick={onGeneratePrep}
              disabled={!onGeneratePrep}
              style={{
                backgroundColor: "var(--accent-9)",
                color: "white",
                cursor: onGeneratePrep ? "pointer" : "not-allowed",
              }}
            >
              Generate Interview Prep
            </Button>
          </Flex>
        </Flex>
      </Card>
    </Container>
  );
}

function SparkleIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ color: "var(--accent-9)" }}>
      <path d="M12 2L13.5 8.5L20 10L13.5 11.5L12 18L10.5 11.5L4 10L10.5 8.5L12 2Z" fill="currentColor" opacity="0.9" />
      <path d="M19 14L19.75 17.25L23 18L19.75 18.75L19 22L18.25 18.75L15 18L18.25 17.25L19 14Z" fill="currentColor" opacity="0.5" />
      <path d="M5 2L5.5 4.5L8 5L5.5 5.5L5 8L4.5 5.5L2 5L4.5 4.5L5 2Z" fill="currentColor" opacity="0.4" />
    </svg>
  );
}
