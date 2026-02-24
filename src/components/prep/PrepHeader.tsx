import Link from "next/link";
import { Flex, Box, Text, Heading, Button, Badge } from "@radix-ui/themes";
import { ArrowLeftIcon, ChevronRightIcon } from "@radix-ui/react-icons";

interface PrepHeaderProps {
  displayTitle: string;
  displayCompany: string;
  appId: string;
  requirementCount: number;
  topicCount: number;
  overallPercent: number;
}

function getReadinessStatus(percent: number): {
  label: string;
  color: "gray" | "amber" | "green";
} {
  if (percent === 0) return { label: "not started", color: "gray" };
  if (percent < 80) return { label: "in progress", color: "amber" };
  return { label: "interview ready", color: "green" };
}

export function PrepHeader({
  displayTitle,
  displayCompany,
  appId,
  requirementCount,
  topicCount,
  overallPercent,
}: PrepHeaderProps) {
  const readiness = getReadinessStatus(overallPercent);

  return (
    <Flex
      justify="between"
      align="start"
      mb="4"
      style={{
        borderLeft: "3px solid var(--accent-9)",
        paddingLeft: "16px",
      }}
    >
      <Flex direction="column" gap="2">
        {/* Breadcrumb */}
        <Flex align="center" gap="1">
          <Button variant="ghost" size="1" asChild style={{ padding: "0 4px" }}>
            <Link href="/prep">
              <ArrowLeftIcon />
              <Text size="1">Prep</Text>
            </Link>
          </Button>
          <ChevronRightIcon
            style={{ color: "var(--gray-6)", width: 12, height: 12 }}
          />
          <Text size="1" color="gray">
            {displayCompany}
          </Text>
        </Flex>

        {/* Title row with progress badge */}
        <Flex align="center" gap="3">
          <Heading size="7">{displayTitle}</Heading>
          <Box
            style={{
              display: "inline-flex",
              alignItems: "center",
              background: "var(--accent-9)",
              color: "white",
              fontSize: "11px",
              fontWeight: 600,
              letterSpacing: "0.02em",
              padding: "2px 8px",
              lineHeight: "18px",
            }}
          >
            {overallPercent}%
          </Box>
        </Flex>

        {/* Stats + readiness row */}
        <Flex align="center" gap="2" wrap="wrap">
          <Text size="2" color="gray">
            {displayCompany}
          </Text>
          <Text size="2" style={{ color: "var(--gray-5)" }}>·</Text>

          {/* Requirements chip */}
          <Box
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              background: "var(--gray-3)",
              padding: "2px 8px",
              fontSize: "12px",
              color: "var(--gray-11)",
            }}
          >
            <Box
              style={{
                width: 6,
                height: 6,
                background: "var(--accent-9)",
                borderRadius: "50%",
              }}
            />
            {requirementCount} requirements
          </Box>

          {/* Topics chip */}
          <Box
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              background: "var(--gray-3)",
              padding: "2px 8px",
              fontSize: "12px",
              color: "var(--gray-11)",
            }}
          >
            <Box
              style={{
                width: 6,
                height: 6,
                background: "var(--green-9)",
                borderRadius: "50%",
              }}
            />
            {topicCount} topics
          </Box>

          <Text size="2" style={{ color: "var(--gray-5)" }}>·</Text>

          {/* Readiness badge */}
          <Badge color={readiness.color} variant="soft" size="1">
            {readiness.label}
          </Badge>
        </Flex>
      </Flex>

      {/* View Application CTA */}
      <Button variant="soft" asChild style={{ flexShrink: 0 }}>
        <Link href={`/applications/${appId}`}>view application</Link>
      </Button>
    </Flex>
  );
}
