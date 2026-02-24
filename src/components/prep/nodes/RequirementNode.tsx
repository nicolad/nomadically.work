import { useState } from "react";
import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";

export type RequirementStatus = "not-started" | "in-progress" | "completed";

const STATUS_COLORS = {
  "not-started": {
    bg: "var(--gray-2)",
    border: "var(--gray-6)",
    accent: "var(--gray-11)",
    glow: null,
    indicator: "var(--gray-6)",
  },
  "in-progress": {
    bg: "var(--amber-2)",
    border: "var(--amber-7)",
    accent: "var(--amber-11)",
    glow: "0 0 12px rgba(245, 158, 11, 0.2)",
    indicator: "var(--amber-7)",
  },
  completed: {
    bg: "var(--green-2)",
    border: "var(--green-7)",
    accent: "var(--green-11)",
    glow: "0 0 12px rgba(34, 197, 94, 0.2)",
    indicator: "var(--green-7)",
  },
};

export type RequirementNodeData = {
  label: string;
  hasDeepDive: boolean;
  sourceQuote?: string | null;
  questionCount: number;
  topicsCompleted: number;
  topicsTotal: number;
  status: RequirementStatus;
};

export function ProgressRing({
  completed,
  total,
  size = 28,
  stroke = 3,
}: {
  completed: number;
  total: number;
  size?: number;
  stroke?: number;
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = total > 0 ? completed / total : 0;
  const dashOffset = circumference * (1 - progress);
  const color =
    progress === 1
      ? "var(--green-9)"
      : progress > 0
        ? "var(--amber-9)"
        : "var(--gray-6)";

  return (
    <svg width={size} height={size} style={{ flexShrink: 0 }}>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="var(--gray-4)"
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeDasharray={circumference}
        strokeDashoffset={dashOffset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dashoffset 0.4s ease" }}
      />
      <text
        x={size / 2}
        y={size / 2}
        textAnchor="middle"
        dominantBaseline="central"
        style={{ fontSize: 9, fill: "var(--gray-11)", fontWeight: 600 }}
      >
        {completed}/{total}
      </text>
    </svg>
  );
}

export function RequirementNode({ data }: NodeProps<Node<RequirementNodeData>>) {
  const [isHovered, setIsHovered] = useState(false);
  const colors = STATUS_COLORS[data.status];

  const hoverGlow = "0 0 0 1px var(--accent-9)";
  const baseBoxShadow = colors.glow ?? "none";
  const boxShadow = isHovered
    ? colors.glow
      ? `${colors.glow}, ${hoverGlow}`
      : hoverGlow
    : baseBoxShadow;

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        padding: "12px 16px",
        borderRadius: 10,
        background: colors.bg,
        border: `2px solid ${colors.border}`,
        maxWidth: 240,
        cursor: "pointer",
        transition: "border-color 0.15s, box-shadow 0.2s, transform 0.15s",
        boxShadow,
        transform: isHovered ? "translateY(-1px)" : "translateY(0)",
        position: "relative",
      }}
    >
      <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Right} style={{ opacity: 0 }} id="right" />
      <Handle type="source" position={Position.Right} style={{ opacity: 0 }} id="source-right" />
      <Handle type="source" position={Position.Left} style={{ opacity: 0 }} id="source-left" />

      {/* Top-right status indicator */}
      <div
        style={{
          position: "absolute",
          top: 8,
          right: 8,
          width: 8,
          height: 8,
          borderRadius: 2,
          background: colors.indicator,
          flexShrink: 0,
        }}
      />

      <div style={{ display: "flex", alignItems: "center", gap: 8, paddingRight: 14 }}>
        <ProgressRing completed={data.topicsCompleted} total={data.topicsTotal} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontWeight: 600,
              fontSize: 12,
              color: "var(--gray-12)",
              lineHeight: 1.35,
              overflow: "hidden",
              textOverflow: "ellipsis",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical" as const,
            }}
          >
            {data.label}
          </div>
        </div>
      </div>

      {/* Bottom row: deep dive pill + question count */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          marginTop: 8,
          flexWrap: "wrap",
        }}
      >
        {data.hasDeepDive && (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 3,
              background: "var(--accent-9)",
              color: "white",
              fontSize: 10,
              fontWeight: 600,
              borderRadius: 20,
              padding: "2px 7px",
              letterSpacing: "0.01em",
              lineHeight: 1.4,
            }}
          >
            <svg width={8} height={8} viewBox="0 0 10 10" style={{ flexShrink: 0 }}>
              <circle cx={5} cy={5} r={5} fill="rgba(255,255,255,0.3)" />
              <path
                d="M3 5.2L4.5 6.5L7 3.8"
                stroke="white"
                strokeWidth={1.5}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Deep dive
          </span>
        )}

        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 3,
            fontSize: 10,
            color: "var(--gray-11)",
            fontWeight: 500,
          }}
        >
          <svg width={12} height={12} viewBox="0 0 12 12" style={{ flexShrink: 0 }}>
            <circle cx={6} cy={6} r={5.5} fill="none" stroke="var(--gray-6)" strokeWidth={1} />
            <text
              x={6}
              y={6}
              textAnchor="middle"
              dominantBaseline="central"
              style={{ fontSize: 7, fill: "var(--gray-11)", fontWeight: 700, fontFamily: "sans-serif" }}
            >
              ?
            </text>
          </svg>
          {data.questionCount} {data.questionCount === 1 ? "question" : "questions"}
        </span>
      </div>
    </div>
  );
}
