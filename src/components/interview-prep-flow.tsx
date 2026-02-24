"use client";

import { useCallback, useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type NodeProps,
  Handle,
  Position,
  MiniMap,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { AiInterviewPrepRequirement } from "@/__generated__/hooks";

// --- Custom Node Components ---

type CenterNodeData = { label: string; summary: string };

function CenterNode({ data }: NodeProps<Node<CenterNodeData>>) {
  return (
    <div
      style={{
        padding: "16px 24px",
        borderRadius: 12,
        background: "var(--accent-9)",
        color: "white",
        fontWeight: 700,
        fontSize: 14,
        textAlign: "center",
        maxWidth: 180,
        boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
      }}
    >
      <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Left} style={{ opacity: 0 }} id="left" />
      <Handle type="source" position={Position.Top} style={{ opacity: 0 }} id="top" />
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} id="bottom" />
      {data.label}
    </div>
  );
}

type RequirementNodeData = {
  label: string;
  hasDeepDive: boolean;
  sourceQuote?: string | null;
  questionCount: number;
};

function RequirementNode({ data }: NodeProps<Node<RequirementNodeData>>) {
  return (
    <div
      style={{
        padding: "12px 16px",
        borderRadius: 8,
        background: data.hasDeepDive ? "var(--green-3)" : "var(--gray-3)",
        border: `2px solid ${data.hasDeepDive ? "var(--green-7)" : "var(--gray-6)"}`,
        maxWidth: 200,
        cursor: "pointer",
        transition: "border-color 0.15s, box-shadow 0.15s",
      }}
    >
      <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Right} style={{ opacity: 0 }} id="right" />
      <Handle type="source" position={Position.Right} style={{ opacity: 0 }} id="source-right" />
      <Handle type="source" position={Position.Left} style={{ opacity: 0 }} id="source-left" />
      <div
        style={{
          fontWeight: 600,
          fontSize: 12,
          color: "var(--gray-12)",
          marginBottom: data.hasDeepDive ? 4 : 0,
          lineHeight: 1.3,
        }}
      >
        {data.label}
      </div>
      {data.hasDeepDive && (
        <div
          style={{
            fontSize: 10,
            color: "var(--green-11)",
            fontWeight: 500,
          }}
        >
          Deep dive ready
        </div>
      )}
      <div style={{ fontSize: 10, color: "var(--gray-9)", marginTop: 2 }}>
        {data.questionCount} questions
      </div>
    </div>
  );
}

type TopicNodeData = { label: string; hasDeepDive: boolean };

function TopicNode({ data }: NodeProps<Node<TopicNodeData>>) {
  return (
    <div
      style={{
        padding: "6px 12px",
        borderRadius: 6,
        background: data.hasDeepDive ? "var(--violet-5)" : "var(--violet-3)",
        fontSize: 11,
        color: "var(--gray-12)",
        cursor: "pointer",
        maxWidth: 160,
        lineHeight: 1.3,
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
      }}
    >
      <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Right} style={{ opacity: 0 }} id="right" />
      {data.label}
    </div>
  );
}

const nodeTypes = {
  center: CenterNode,
  requirement: RequirementNode,
  topic: TopicNode,
};

// --- Layout helpers ---

function buildGraph(
  jobTitle: string,
  summary: string,
  requirements: AiInterviewPrepRequirement[],
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  const centerX = 0;
  const centerY = 0;

  // Center node
  nodes.push({
    id: "center",
    type: "center",
    position: { x: centerX, y: centerY },
    data: { label: jobTitle, summary },
    draggable: true,
  });

  const reqCount = requirements.length;
  const reqRadius = 280;
  // Spread requirements in a fan from -60deg to +60deg on the right side
  const startAngle = -((reqCount - 1) * 30) / 2;

  requirements.forEach((req, i) => {
    const reqId = `req-${i}`;
    const angleDeg = startAngle + i * 30;
    const angleRad = (angleDeg * Math.PI) / 180;
    const reqX = centerX + reqRadius * Math.cos(angleRad);
    const reqY = centerY + reqRadius * Math.sin(angleRad);

    nodes.push({
      id: reqId,
      type: "requirement",
      position: { x: reqX, y: reqY },
      data: {
        label: req.requirement,
        hasDeepDive: !!req.deepDive,
        sourceQuote: req.sourceQuote,
        questionCount: req.questions.length,
      },
    });

    edges.push({
      id: `e-center-${reqId}`,
      source: "center",
      target: reqId,
      type: "smoothstep",
      style: { stroke: "var(--gray-7)", strokeWidth: 2 },
      animated: !req.deepDive,
    });

    // Study topics fan out from each requirement
    const topicCount = req.studyTopics.length;
    const topicSpacing = 34;
    const topicOffsetY = -((topicCount - 1) * topicSpacing) / 2;
    const topicOffsetX = 220;

    req.studyTopics.forEach((topic, j) => {
      const topicId = `topic-${i}-${j}`;
      const hasTopicDeepDive = req.studyTopicDeepDives?.some(
        (d) => d.topic === topic && d.deepDive,
      );

      nodes.push({
        id: topicId,
        type: "topic",
        position: {
          x: reqX + topicOffsetX,
          y: reqY + topicOffsetY + j * topicSpacing,
        },
        data: { label: topic, hasDeepDive: !!hasTopicDeepDive },
      });

      edges.push({
        id: `e-${reqId}-${topicId}`,
        source: reqId,
        sourceHandle: "source-right",
        target: topicId,
        type: "smoothstep",
        style: { stroke: "var(--violet-6)", strokeWidth: 1.5 },
      });
    });
  });

  return { nodes, edges };
}

// --- Main Component ---

interface InterviewPrepFlowProps {
  jobTitle: string;
  aiInterviewPrep: {
    summary: string;
    requirements: AiInterviewPrepRequirement[];
  };
  onRequirementClick?: (req: AiInterviewPrepRequirement) => void;
  onStudyTopicClick?: (req: AiInterviewPrepRequirement, topic: string) => void;
}

export default function InterviewPrepFlow({
  jobTitle,
  aiInterviewPrep,
  onRequirementClick,
  onStudyTopicClick,
}: InterviewPrepFlowProps) {
  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () =>
      buildGraph(
        jobTitle,
        aiInterviewPrep.summary,
        aiInterviewPrep.requirements,
      ),
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

  return (
    <div style={{ width: "100%", height: 500, borderRadius: 8, overflow: "hidden" }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.3}
        maxZoom={1.5}
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
            if (node.type === "requirement")
              return node.data?.hasDeepDive ? "var(--green-7)" : "var(--gray-7)";
            return "var(--violet-7)";
          }}
          style={{ background: "var(--gray-2)", borderColor: "var(--gray-5)" }}
          maskColor="rgba(0,0,0,0.15)"
        />
      </ReactFlow>
    </div>
  );
}
