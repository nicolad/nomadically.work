import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";

export type CenterNodeData = {
  label: string;
  summary: string;
  reqCompleted: number;
  reqTotal: number;
  overallPercent: number;
};

function CenterProgressRing({
  percent,
  size = 48,
  stroke = 4,
}: {
  percent: number;
  size?: number;
  stroke?: number;
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(Math.max(percent / 100, 0), 1);
  const dashOffset = circumference * (1 - progress);

  return (
    <svg
      width={size}
      height={size}
      style={{ flexShrink: 0, display: "block" }}
      aria-hidden="true"
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="rgba(255,255,255,0.2)"
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="rgba(255,255,255,0.92)"
        strokeWidth={stroke}
        strokeDasharray={circumference}
        strokeDashoffset={dashOffset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dashoffset 0.5s ease" }}
      />
      <text
        x={size / 2}
        y={size / 2}
        textAnchor="middle"
        dominantBaseline="central"
        style={{
          fontSize: 13,
          fill: "white",
          fontWeight: 800,
          fontFamily: "sans-serif",
        }}
      >
        {percent}%
      </text>
    </svg>
  );
}

function readinessLabel(completed: number, total: number): string {
  if (total === 0 || completed === 0) return "Getting started";
  if (completed === total) return "All ready!";
  return `${completed} of ${total} ready`;
}

export function CenterNode({ data }: NodeProps<Node<CenterNodeData>>) {
  const { label, reqCompleted, reqTotal, overallPercent } = data;

  return (
    <div
      style={{
        padding: "18px 22px",
        borderRadius: 16,
        background: "linear-gradient(135deg, var(--accent-9) 0%, var(--accent-10) 100%)",
        color: "white",
        fontWeight: 700,
        fontSize: 13,
        textAlign: "center",
        maxWidth: 180,
        boxShadow: "0 0 30px rgba(99, 102, 241, 0.4), 0 4px 20px rgba(0,0,0,0.4)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
      }}
    >
      <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Left} style={{ opacity: 0 }} id="left" />
      <Handle type="source" position={Position.Top} style={{ opacity: 0 }} id="top" />
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} id="bottom" />

      <div
        style={{
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          opacity: 0.65,
          lineHeight: 1,
        }}
      >
        Interview Prep
      </div>

      <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.3, opacity: 0.97 }}>
        {label}
      </div>

      <CenterProgressRing percent={overallPercent} size={48} stroke={4} />

      <div style={{ fontSize: 11, fontWeight: 500, opacity: 0.75, lineHeight: 1 }}>
        {readinessLabel(reqCompleted, reqTotal)}
      </div>
    </div>
  );
}
