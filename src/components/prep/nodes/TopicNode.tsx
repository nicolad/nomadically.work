import { useState } from "react";
import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";

export type TopicNodeData = {
  label: string;
  hasDeepDive: boolean;
  href?: string;
};

export function TopicNode({ data }: NodeProps<Node<TopicNodeData>>) {
  const [isHovered, setIsHovered] = useState(false);

  const baseBackground = data.hasDeepDive ? "var(--violet-3)" : "var(--gray-2)";
  const hoverBackground = data.hasDeepDive ? "var(--violet-4)" : "var(--gray-3)";
  const baseBorder = data.hasDeepDive ? "4px solid var(--violet-8)" : "3px dashed var(--gray-5)";
  const hoverBorder = data.hasDeepDive ? "4px solid var(--violet-9)" : "3px dashed var(--gray-7)";
  const baseBoxShadow = data.hasDeepDive ? "0 0 8px rgba(139, 92, 246, 0.2)" : "none";
  const hoverBoxShadow = data.hasDeepDive
    ? "0 0 14px rgba(139, 92, 246, 0.35), 0 0 0 1px var(--violet-7)"
    : "0 0 0 1px var(--gray-6)";

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        padding: "6px 10px",
        borderRadius: 6,
        background: isHovered ? hoverBackground : baseBackground,
        borderLeft: isHovered ? hoverBorder : baseBorder,
        fontSize: 11,
        color: "var(--gray-12)",
        cursor: "pointer",
        maxWidth: 180,
        lineHeight: 1.3,
        display: "flex",
        flexDirection: "column",
        gap: 3,
        transition: "background 0.15s, border-color 0.15s, box-shadow 0.2s",
        boxShadow: isHovered ? hoverBoxShadow : baseBoxShadow,
      }}
    >
      <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Right} style={{ opacity: 0 }} id="right" />
      <Handle type="source" position={Position.Right} style={{ opacity: 0 }} id="source-right" />
      <Handle type="source" position={Position.Left} style={{ opacity: 0 }} id="source-left" />

      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <svg width={12} height={12} viewBox="0 0 12 12" style={{ flexShrink: 0 }}>
          {data.hasDeepDive ? (
            <>
              <circle cx={6} cy={6} r={6} fill="var(--violet-9)" />
              <path
                d="M3.5 6.2L5.2 7.8L8.5 4.2"
                stroke="white"
                strokeWidth={1.6}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </>
          ) : (
            <>
              <circle
                cx={6}
                cy={6}
                r={5.5}
                fill="none"
                stroke={isHovered ? "var(--gray-9)" : "var(--gray-6)"}
                strokeWidth={1.2}
              />
              <line x1={3.5} y1={6} x2={8.5} y2={6} stroke={isHovered ? "var(--gray-9)" : "var(--gray-7)"} strokeWidth={1.4} strokeLinecap="round" />
              <line x1={6} y1={3.5} x2={6} y2={8.5} stroke={isHovered ? "var(--gray-9)" : "var(--gray-7)"} strokeWidth={1.4} strokeLinecap="round" />
            </>
          )}
        </svg>

        <span
          style={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical" as const,
            color: data.hasDeepDive ? "var(--violet-11)" : "var(--gray-12)",
            fontWeight: data.hasDeepDive ? 500 : 400,
          }}
        >
          {data.label}
        </span>
      </div>

      {data.href && (
        <a
          href={data.href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 3,
            paddingLeft: 18,
            fontSize: 9,
            color: "var(--blue-10)",
            textDecoration: "none",
            lineHeight: 1.2,
            letterSpacing: "0.01em",
          }}
        >
          <svg width={9} height={9} viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0 }}>
            <path d="M7 1h4v4M11 1L5 7M2 3H1v8h8v-1" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          open prep
        </a>
      )}

      {isHovered && !data.hasDeepDive && !data.href && (
        <div
          style={{
            fontSize: 9,
            color: "var(--gray-9)",
            fontStyle: "italic",
            paddingLeft: 18,
            lineHeight: 1.2,
            letterSpacing: "0.01em",
          }}
        >
          generate →
        </div>
      )}
    </div>
  );
}
