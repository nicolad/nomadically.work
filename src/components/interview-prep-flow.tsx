"use client";

import { useCallback, useMemo, useState } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Node,
  type Edge,
  type NodeProps,
  type NodeMouseHandler,
  Handle,
  Position,
  MiniMap,
  Panel,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { AiInterviewPrepRequirement } from "@/__generated__/hooks";

// --- Status helpers ---

type RequirementStatus = "not-started" | "in-progress" | "completed";

function deriveRequirementStatus(req: AiInterviewPrepRequirement): RequirementStatus {
  const hasDeepDive = !!req.deepDive;
  const topicsCovered = req.studyTopicDeepDives?.filter((d) => d.deepDive).length ?? 0;
  const totalTopics = req.studyTopics.length;

  if (!hasDeepDive && topicsCovered === 0) return "not-started";
  if (hasDeepDive && topicsCovered === totalTopics) return "completed";
  return "in-progress";
}

const STATUS_COLORS: Record<RequirementStatus, { bg: string; border: string; accent: string }> = {
  "not-started": { bg: "var(--gray-2)", border: "var(--gray-6)", accent: "var(--gray-11)" },
  "in-progress": { bg: "var(--amber-2)", border: "var(--amber-7)", accent: "var(--amber-11)" },
  completed: { bg: "var(--green-2)", border: "var(--green-7)", accent: "var(--green-11)" },
};

// --- Progress Ring SVG ---

function ProgressRing({
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
    progress === 1 ? "var(--green-9)" : progress > 0 ? "var(--amber-9)" : "var(--gray-6)";

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

// --- Custom Node Components ---

type CenterNodeData = {
  label: string;
  summary: string;
  reqCompleted: number;
  reqTotal: number;
  overallPercent: number;
};

function CenterNode({ data }: NodeProps<Node<CenterNodeData>>) {
  return (
    <div
      style={{
        padding: "16px 20px",
        borderRadius: 14,
        background: "var(--accent-9)",
        color: "white",
        fontWeight: 700,
        fontSize: 13,
        textAlign: "center",
        maxWidth: 160,
        boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
      }}
    >
      <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Left} style={{ opacity: 0 }} id="left" />
      <Handle type="source" position={Position.Top} style={{ opacity: 0 }} id="top" />
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} id="bottom" />
      <div style={{ marginBottom: 6 }}>{data.label}</div>
      <div
        style={{
          fontSize: 20,
          fontWeight: 800,
          opacity: 0.95,
        }}
      >
        {data.overallPercent}%
      </div>
      <div style={{ fontSize: 10, opacity: 0.8, marginTop: 2 }}>
        {data.reqCompleted}/{data.reqTotal} ready
      </div>
    </div>
  );
}

type RequirementNodeData = {
  label: string;
  hasDeepDive: boolean;
  sourceQuote?: string | null;
  questionCount: number;
  topicsCompleted: number;
  topicsTotal: number;
  status: RequirementStatus;
};

function RequirementNode({ data }: NodeProps<Node<RequirementNodeData>>) {
  const colors = STATUS_COLORS[data.status];

  return (
    <div
      style={{
        padding: "10px 14px",
        borderRadius: 8,
        background: colors.bg,
        border: `2px solid ${colors.border}`,
        maxWidth: 220,
        cursor: "pointer",
        transition: "border-color 0.15s, box-shadow 0.15s, transform 0.15s",
      }}
    >
      <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Right} style={{ opacity: 0 }} id="right" />
      <Handle type="source" position={Position.Right} style={{ opacity: 0 }} id="source-right" />
      <Handle type="source" position={Position.Left} style={{ opacity: 0 }} id="source-left" />

      {/* Row: progress ring + label */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <ProgressRing completed={data.topicsCompleted} total={data.topicsTotal} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontWeight: 600,
              fontSize: 12,
              color: "var(--gray-12)",
              lineHeight: 1.3,
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

      {/* Meta row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          marginTop: 6,
          fontSize: 10,
          color: "var(--gray-9)",
        }}
      >
        {data.hasDeepDive && (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 2,
              color: colors.accent,
              fontWeight: 500,
            }}
          >
            <svg width={10} height={10} viewBox="0 0 10 10">
              <circle cx={5} cy={5} r={5} fill={colors.accent} />
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
        <span>{data.questionCount}q</span>
      </div>
    </div>
  );
}

type TopicNodeData = { label: string; hasDeepDive: boolean };

function TopicNode({ data }: NodeProps<Node<TopicNodeData>>) {
  return (
    <div
      style={{
        padding: "6px 10px",
        borderRadius: 6,
        background: data.hasDeepDive ? "var(--violet-3)" : "var(--gray-2)",
        borderLeft: `3px solid ${data.hasDeepDive ? "var(--violet-7)" : "var(--gray-5)"}`,
        fontSize: 11,
        color: "var(--gray-12)",
        cursor: "pointer",
        maxWidth: 200,
        lineHeight: 1.3,
        display: "flex",
        alignItems: "center",
        gap: 6,
        transition: "background 0.15s, border-color 0.15s",
      }}
    >
      <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Right} style={{ opacity: 0 }} id="right" />

      {/* Status icon */}
      <svg width={10} height={10} style={{ flexShrink: 0 }}>
        {data.hasDeepDive ? (
          <>
            <circle cx={5} cy={5} r={5} fill="var(--violet-9)" />
            <path
              d="M3 5.2L4.5 6.5L7 3.8"
              stroke="white"
              strokeWidth={1.5}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </>
        ) : (
          <circle cx={5} cy={5} r={4} fill="none" stroke="var(--gray-7)" strokeWidth={1} />
        )}
      </svg>

      <span
        style={{
          overflow: "hidden",
          textOverflow: "ellipsis",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical" as const,
        }}
      >
        {data.label}
      </span>
    </div>
  );
}

const nodeTypes = {
  center: CenterNode,
  requirement: RequirementNode,
  topic: TopicNode,
};

// --- Progress Summary Panel ---

function ProgressSummaryPanel({
  requirements,
}: {
  requirements: AiInterviewPrepRequirement[];
}) {
  const total = requirements.length;
  const withDeepDive = requirements.filter((r) => r.deepDive).length;
  const totalTopics = requirements.reduce((sum, r) => sum + r.studyTopics.length, 0);
  const completedTopics = requirements.reduce(
    (sum, r) => sum + (r.studyTopicDeepDives?.filter((d) => d.deepDive).length ?? 0),
    0,
  );
  const overallPercent = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

  return (
    <Panel position="top-left">
      <div
        style={{
          background: "var(--gray-1)",
          border: "1px solid var(--gray-5)",
          borderRadius: 8,
          padding: "10px 14px",
          minWidth: 150,
          fontSize: 12,
          boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
        }}
      >
        <div
          style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, color: "var(--gray-12)" }}
        >
          Prep Progress
        </div>

        {/* Overall progress bar */}
        <div
          style={{
            height: 6,
            borderRadius: 3,
            background: "var(--gray-4)",
            marginBottom: 8,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              borderRadius: 3,
              width: `${overallPercent}%`,
              background: overallPercent === 100 ? "var(--green-9)" : "var(--amber-9)",
              transition: "width 0.4s ease",
            }}
          />
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", color: "var(--gray-11)" }}>
          <span>Requirements</span>
          <span style={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
            {withDeepDive}/{total}
          </span>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            color: "var(--gray-11)",
            marginTop: 4,
          }}
        >
          <span>Topics</span>
          <span style={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
            {completedTopics}/{totalTopics}
          </span>
        </div>
      </div>
    </Panel>
  );
}

// --- Tooltip ---

function truncate(str: string, max: number) {
  return str.length > max ? str.slice(0, max) + "..." : str;
}

type TooltipData = {
  x: number;
  y: number;
  type: string;
  data: Record<string, unknown>;
};

function GraphTooltip({ tooltip }: { tooltip: TooltipData }) {
  return (
    <div
      style={{
        position: "absolute",
        left: tooltip.x,
        top: tooltip.y - 8,
        transform: "translateX(-50%) translateY(-100%)",
        background: "var(--gray-1)",
        border: "1px solid var(--gray-6)",
        borderRadius: 6,
        padding: "8px 12px",
        maxWidth: 260,
        fontSize: 11,
        color: "var(--gray-12)",
        boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
        pointerEvents: "none" as const,
        zIndex: 50,
        lineHeight: 1.4,
      }}
    >
      {tooltip.type === "requirement" && (
        <>
          {tooltip.data.sourceQuote && (
            <div style={{ fontStyle: "italic", color: "var(--gray-9)", marginBottom: 4 }}>
              &ldquo;{truncate(tooltip.data.sourceQuote as string, 120)}&rdquo;
            </div>
          )}
          <div>{tooltip.data.questionCount as number} interview questions</div>
          <div>
            {tooltip.data.topicsCompleted as number}/{tooltip.data.topicsTotal as number} topics
            completed
          </div>
        </>
      )}
      {tooltip.type === "topic" && (
        <>
          <div style={{ fontWeight: 600, marginBottom: 2 }}>
            {tooltip.data.label as string}
          </div>
          <div style={{ color: "var(--gray-9)" }}>
            {tooltip.data.hasDeepDive
              ? "Deep dive available \u2014 click to view"
              : "Click to generate deep dive"}
          </div>
        </>
      )}
      {tooltip.type === "center" && (
        <div style={{ color: "var(--gray-9)" }}>
          {truncate(tooltip.data.summary as string, 200)}
        </div>
      )}
    </div>
  );
}

// --- Layout: 360-degree radial ---

function buildGraph(
  jobTitle: string,
  summary: string,
  requirements: AiInterviewPrepRequirement[],
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  const centerX = 0;
  const centerY = 0;

  // Compute overall stats for center node
  const reqTotal = requirements.length;
  const reqCompleted = requirements.filter((r) => r.deepDive).length;
  const totalTopics = requirements.reduce((s, r) => s + r.studyTopics.length, 0);
  const completedTopics = requirements.reduce(
    (s, r) => s + (r.studyTopicDeepDives?.filter((d) => d.deepDive).length ?? 0),
    0,
  );
  const overallPercent = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

  nodes.push({
    id: "center",
    type: "center",
    position: { x: centerX, y: centerY },
    data: { label: jobTitle, summary, reqCompleted, reqTotal, overallPercent },
    draggable: true,
  });

  // Sort requirements alphabetically for spatial stability
  const sorted = requirements
    .map((req, origIdx) => ({ req, origIdx }))
    .sort((a, b) => a.req.requirement.localeCompare(b.req.requirement));

  const reqCount = sorted.length;
  const reqRadius = 300;

  // Full 360-degree layout, starting from top (−90°)
  sorted.forEach(({ req, origIdx }, layoutIdx) => {
    const reqId = `req-${origIdx}`;
    const angleDeg = -90 + (layoutIdx * 360) / reqCount;
    const angleRad = (angleDeg * Math.PI) / 180;
    const reqX = centerX + reqRadius * Math.cos(angleRad);
    const reqY = centerY + reqRadius * Math.sin(angleRad);

    const status = deriveRequirementStatus(req);
    const topicsCovered = req.studyTopicDeepDives?.filter((d) => d.deepDive).length ?? 0;

    nodes.push({
      id: reqId,
      type: "requirement",
      position: { x: reqX, y: reqY },
      data: {
        label: req.requirement,
        hasDeepDive: !!req.deepDive,
        sourceQuote: req.sourceQuote,
        questionCount: req.questions.length,
        topicsCompleted: topicsCovered,
        topicsTotal: req.studyTopics.length,
        status,
      },
    });

    // Edge color by status
    const edgeColor =
      status === "completed"
        ? "var(--green-7)"
        : status === "in-progress"
          ? "var(--amber-7)"
          : "var(--gray-7)";

    edges.push({
      id: `e-center-${reqId}`,
      source: "center",
      target: reqId,
      type: "smoothstep",
      style: { stroke: edgeColor, strokeWidth: 2 },
      animated: status === "not-started",
    });

    // Topics extend outward from requirement, away from center
    const topicCount = req.studyTopics.length;
    const topicSpacing = 36;
    const topicOffsetY = -((topicCount - 1) * topicSpacing) / 2;
    // Push topics outward from center
    const outwardX = Math.cos(angleRad) * 230;
    const outwardY = Math.sin(angleRad) * 80;
    // Determine handle side based on position relative to center
    const isLeftSide = reqX < centerX;
    const sourceHandle = isLeftSide ? "source-left" : "source-right";

    req.studyTopics.forEach((topic, j) => {
      const topicId = `topic-${origIdx}-${j}`;
      const hasTopicDeepDive = req.studyTopicDeepDives?.some(
        (d) => d.topic === topic && d.deepDive,
      );

      nodes.push({
        id: topicId,
        type: "topic",
        position: {
          x: reqX + outwardX,
          y: reqY + outwardY + topicOffsetY + j * topicSpacing,
        },
        data: { label: topic, hasDeepDive: !!hasTopicDeepDive },
      });

      edges.push({
        id: `e-${reqId}-${topicId}`,
        source: reqId,
        sourceHandle,
        target: topicId,
        targetHandle: isLeftSide ? "right" : undefined,
        type: "smoothstep",
        style: {
          stroke: hasTopicDeepDive ? "var(--violet-7)" : "var(--gray-5)",
          strokeWidth: 1.5,
          strokeDasharray: hasTopicDeepDive ? undefined : "4 4",
        },
      });
    });
  });

  return { nodes, edges };
}

// --- Main Component (inner, needs ReactFlowProvider) ---

interface InterviewPrepFlowProps {
  jobTitle: string;
  aiInterviewPrep: {
    summary: string;
    requirements: AiInterviewPrepRequirement[];
  };
  onRequirementClick?: (req: AiInterviewPrepRequirement) => void;
  onStudyTopicClick?: (req: AiInterviewPrepRequirement, topic: string) => void;
}

function InterviewPrepFlowInner({
  jobTitle,
  aiInterviewPrep,
  onRequirementClick,
  onStudyTopicClick,
}: InterviewPrepFlowProps) {
  const { flowToScreenPosition } = useReactFlow();
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);

  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () =>
      buildGraph(jobTitle, aiInterviewPrep.summary, aiInterviewPrep.requirements),
    [jobTitle, aiInterviewPrep],
  );

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      if (node.type === "requirement" && onRequirementClick) {
        const idx = parseInt(node.id.replace("req-", ""), 10);
        const req = aiInterviewPrep.requirements[idx];
        if (req) onRequirementClick(req);
      } else if (node.type === "topic" && onStudyTopicClick) {
        const parts = node.id.replace("topic-", "").split("-");
        const reqIdx = parseInt(parts[0], 10);
        const topicIdx = parseInt(parts[1], 10);
        const req = aiInterviewPrep.requirements[reqIdx];
        const topic = req?.studyTopics[topicIdx];
        if (req && topic) onStudyTopicClick(req, topic);
      }
    },
    [aiInterviewPrep.requirements, onRequirementClick, onStudyTopicClick],
  );

  const onNodeMouseEnter: NodeMouseHandler = useCallback(
    (_event, node) => {
      if (!node.type) return;
      const screenPos = flowToScreenPosition({
        x: node.position.x + 60,
        y: node.position.y,
      });
      setTooltip({
        x: screenPos.x,
        y: screenPos.y,
        type: node.type,
        data: node.data as Record<string, unknown>,
      });
    },
    [flowToScreenPosition],
  );

  const onNodeMouseLeave = useCallback(() => setTooltip(null), []);

  return (
    <div
      style={{
        width: "100%",
        height: "clamp(400px, 60vh, 700px)",
        borderRadius: 8,
        overflow: "hidden",
        position: "relative",
      }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onNodeMouseEnter={onNodeMouseEnter}
        onNodeMouseLeave={onNodeMouseLeave}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        minZoom={0.2}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
        nodesDraggable
        nodesConnectable={false}
      >
        <Background gap={20} size={1} color="var(--gray-4)" />
        <Controls
          showInteractive={false}
          style={{ background: "var(--gray-3)", borderColor: "var(--gray-6)" }}
        />
        <MiniMap
          nodeColor={(node) => {
            if (node.type === "center") return "var(--accent-9)";
            if (node.type === "requirement") {
              const s = (node.data as RequirementNodeData)?.status;
              if (s === "completed") return "var(--green-7)";
              if (s === "in-progress") return "var(--amber-7)";
              return "var(--gray-7)";
            }
            return node.data?.hasDeepDive ? "var(--violet-7)" : "var(--gray-5)";
          }}
          style={{ background: "var(--gray-2)", borderColor: "var(--gray-5)" }}
          maskColor="rgba(0,0,0,0.15)"
        />
        <ProgressSummaryPanel requirements={aiInterviewPrep.requirements} />
      </ReactFlow>
      {tooltip && <GraphTooltip tooltip={tooltip} />}
    </div>
  );
}

// --- Exported wrapper with ReactFlowProvider ---

export default function InterviewPrepFlow(props: InterviewPrepFlowProps) {
  return (
    <ReactFlowProvider>
      <InterviewPrepFlowInner {...props} />
    </ReactFlowProvider>
  );
}
