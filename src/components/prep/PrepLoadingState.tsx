"use client";

import { Container, Flex, Box, Skeleton } from "@radix-ui/themes";

interface PrepLoadingStateProps {
  companyName?: string;
}

export function PrepLoadingState({ companyName: _companyName }: PrepLoadingStateProps) {
  return (
    <Container size="4" p={{ initial: "4", md: "6" }}>
      {/* Header row */}
      <Flex justify="between" align="center" mb="4">
        <Flex direction="column" gap="2">
          <Flex align="center" gap="2">
            <Skeleton height="20px" style={{ width: 48 }} />
            <Skeleton height="16px" style={{ width: 8 }} />
            <Skeleton height="20px" style={{ width: 96 }} />
          </Flex>
          <Skeleton height="36px" style={{ width: 320 }} />
          <Skeleton height="20px" style={{ width: 240 }} />
        </Flex>
        <Skeleton height="32px" style={{ width: 120 }} />
      </Flex>

      {/* Summary card */}
      <Box
        mb="4"
        p="4"
        style={{
          border: "1px solid var(--gray-4)",
          backgroundColor: "var(--gray-2)",
        }}
      >
        <Flex direction="column" gap="2">
          <Skeleton height="16px" style={{ width: "90%" }} />
          <Skeleton height="16px" style={{ width: "75%" }} />
          <Skeleton height="16px" style={{ width: "60%" }} />
        </Flex>
      </Box>

      {/* Graph area */}
      <Box
        style={{
          height: "calc(100vh - 260px)",
          minHeight: 460,
          border: "1px solid var(--gray-4)",
          backgroundColor: "var(--gray-2)",
          position: "relative",
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <RadialGraphPlaceholder />
      </Box>
    </Container>
  );
}

function RadialGraphPlaceholder() {
  const cx = 200;
  const cy = 200;
  const innerR = 44;
  const outerR = 120;
  const nodeCount = 7;

  const outerNodes = Array.from({ length: nodeCount }, (_, i) => {
    const angle = (2 * Math.PI * i) / nodeCount - Math.PI / 2;
    return {
      x: cx + outerR * Math.cos(angle),
      y: cy + outerR * Math.sin(angle),
    };
  });

  return (
    <svg
      width="400"
      height="400"
      viewBox="0 0 400 400"
      style={{ opacity: 0.35 }}
      aria-hidden="true"
    >
      <style>{`
        @keyframes prep-pulse {
          0%, 100% { opacity: 0.25; }
          50%       { opacity: 0.65; }
        }
        .prep-pulse         { animation: prep-pulse 2s ease-in-out infinite; }
        .prep-pulse-delay-1 { animation: prep-pulse 2s ease-in-out 0.3s infinite; }
        .prep-pulse-delay-2 { animation: prep-pulse 2s ease-in-out 0.6s infinite; }
        .prep-pulse-delay-3 { animation: prep-pulse 2s ease-in-out 0.9s infinite; }
      `}</style>

      {outerNodes.map((n, i) => (
        <line
          key={`spoke-${i}`}
          x1={cx}
          y1={cy}
          x2={n.x}
          y2={n.y}
          stroke="var(--gray-6)"
          strokeWidth="1"
          className="prep-pulse"
        />
      ))}

      {outerNodes.map((n, i) => (
        <circle
          key={`outer-${i}`}
          cx={n.x}
          cy={n.y}
          r={i % 3 === 0 ? 22 : 16}
          fill="var(--gray-3)"
          stroke="var(--gray-5)"
          strokeWidth="1"
          className={
            i % 3 === 0 ? "prep-pulse-delay-1" : i % 3 === 1 ? "prep-pulse-delay-2" : "prep-pulse-delay-3"
          }
        />
      ))}

      <circle cx={cx} cy={cy} r={innerR} fill="var(--gray-3)" stroke="var(--accent-9)" strokeWidth="1.5" className="prep-pulse" />
      <circle cx={cx} cy={cy} r={innerR - 10} fill="none" stroke="var(--accent-9)" strokeWidth="1" strokeDasharray="4 4" className="prep-pulse-delay-1" />
    </svg>
  );
}
