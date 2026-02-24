import { Box, Flex, Text } from "@radix-ui/themes";

interface PrepSummaryCardProps {
  summary: string;
  completedTopics: number;
  totalTopics: number;
  completedRequirements: number;
  totalRequirements: number;
}

function RequirementsChip({ completed, total }: { completed: number; total: number }) {
  const dotColor =
    completed === total && total > 0
      ? "var(--green-9)"
      : completed > 0
        ? "var(--amber-9)"
        : "var(--gray-6)";

  return (
    <Flex
      align="center"
      gap="1"
      style={{
        background: "var(--gray-3)",
        border: "1px solid var(--gray-6)",
        padding: "4px 10px",
      }}
    >
      <Box style={{ width: 8, height: 8, borderRadius: "50%", background: dotColor, flexShrink: 0 }} />
      <Text size="1" color="gray">Requirements</Text>
      <Text size="1" style={{ color: "var(--gray-12)", fontVariantNumeric: "tabular-nums" }}>
        {completed}/{total}
      </Text>
    </Flex>
  );
}

function TopicsChip({ completed, total }: { completed: number; total: number }) {
  return (
    <Flex
      align="center"
      gap="1"
      style={{
        background: "var(--gray-3)",
        border: "1px solid var(--gray-6)",
        padding: "4px 10px",
      }}
    >
      <Text size="1" color="gray">Topics</Text>
      <Text size="1" style={{ color: "var(--gray-12)", fontVariantNumeric: "tabular-nums" }}>
        {completed}/{total}
      </Text>
    </Flex>
  );
}

function ReadinessChip({
  completedTopics,
  totalTopics,
  completedRequirements,
  totalRequirements,
}: {
  completedTopics: number;
  totalTopics: number;
  completedRequirements: number;
  totalRequirements: number;
}) {
  const totalItems = totalTopics + totalRequirements;
  const completedItems = completedTopics + completedRequirements;
  const pct = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
  const barColor = pct >= 80 ? "var(--green-9)" : pct >= 40 ? "var(--amber-9)" : "var(--gray-6)";

  return (
    <Flex
      align="center"
      gap="2"
      style={{
        background: "var(--gray-3)",
        border: "1px solid var(--gray-6)",
        padding: "4px 10px",
      }}
    >
      <Text size="1" color="gray">Readiness</Text>
      <Text size="1" style={{ color: "var(--gray-12)", fontVariantNumeric: "tabular-nums", minWidth: 28 }}>
        {pct}%
      </Text>
      <Box style={{ width: 48, height: 4, background: "var(--gray-5)", overflow: "hidden", flexShrink: 0 }}>
        <Box style={{ width: `${pct}%`, height: "100%", background: barColor, transition: "width 0.3s ease" }} />
      </Box>
    </Flex>
  );
}

export function PrepSummaryCard({
  summary,
  completedTopics,
  totalTopics,
  completedRequirements,
  totalRequirements,
}: PrepSummaryCardProps) {
  return (
    <Box
      style={{
        background: "var(--gray-2)",
        border: "1px solid var(--gray-6)",
        borderLeft: "3px solid var(--accent-9)",
        marginBottom: "var(--space-4)",
      }}
    >
      <Box style={{ padding: "16px 20px 12px 20px" }}>
        <Text size="2" style={{ color: "var(--gray-11)", lineHeight: 1.65, display: "block" }}>
          {summary}
        </Text>
      </Box>

      <Box style={{ borderTop: "1px solid var(--gray-4)", padding: "10px 20px" }}>
        <Flex gap="2" wrap="wrap">
          <RequirementsChip completed={completedRequirements} total={totalRequirements} />
          <TopicsChip completed={completedTopics} total={totalTopics} />
          <ReadinessChip
            completedTopics={completedTopics}
            totalTopics={totalTopics}
            completedRequirements={completedRequirements}
            totalRequirements={totalRequirements}
          />
        </Flex>
      </Box>
    </Box>
  );
}
