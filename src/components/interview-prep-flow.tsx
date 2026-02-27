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
  type NodeMouseHandler,
  MiniMap,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { AiInterviewPrepRequirement } from "@/__generated__/hooks";

import { CenterNode, type CenterNodeData } from "@/components/prep/nodes/CenterNode";
import { RequirementNode, type RequirementNodeData, type RequirementStatus } from "@/components/prep/nodes/RequirementNode";
import { TopicNode, type TopicNodeData } from "@/components/prep/nodes/TopicNode";
import { ProgressPanel } from "@/components/prep/nodes/ProgressPanel";
import { GraphTooltip, type TooltipData } from "@/components/prep/GraphTooltip";

// Map known study topics to their prep pages: key is lowercase label, value is the path
const TOPIC_PREP_URLS: Record<string, string> = {
  acid: "/study/db/acid",
};

// --- Status helpers ---

function deriveRequirementStatus(req: AiInterviewPrepRequirement): RequirementStatus {
  const hasDeepDive = !!req.deepDive;
  const topicsCovered = req.studyTopicDeepDives?.filter((d) => d.deepDive).length ?? 0;
  const totalTopics = req.studyTopics.length;

  if (!hasDeepDive && topicsCovered === 0) return "not-started";
  if (hasDeepDive && topicsCovered === totalTopics) return "completed";
  return "in-progress";
}

const nodeTypes = {
  center: CenterNode,
  requirement: RequirementNode,
  topic: TopicNode,
};

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

  const reqTotal = requirements.length;
  const reqCompleted = requirements.filter((r) => r.deepDive).length;
  const totalTopics = requirements.reduce((s, r) => s + r.studyTopics.length, 0);
  const completedTopics = requirements.reduce(
    (s, r) => s + (r.studyTopicDeepDives?.filter((d) => d.deepDive).length ?? 0),
    0,
  );
  const overallPercent = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

  const centerData: CenterNodeData = { label: jobTitle, summary, reqCompleted, reqTotal, overallPercent };
  nodes.push({
    id: "center",
    type: "center",
    position: { x: centerX, y: centerY },
    data: centerData,
    draggable: true,
  });

  const sorted = requirements
    .map((req, origIdx) => ({ req, origIdx }))
    .sort((a, b) => a.req.requirement.localeCompare(b.req.requirement));

  const reqCount = sorted.length;
  const reqRadius = 300;

  sorted.forEach(({ req, origIdx }, layoutIdx) => {
    const reqId = `req-${origIdx}`;
    const angleDeg = -90 + (layoutIdx * 360) / reqCount;
    const angleRad = (angleDeg * Math.PI) / 180;
    const reqX = centerX + reqRadius * Math.cos(angleRad);
    const reqY = centerY + reqRadius * Math.sin(angleRad);

    const status = deriveRequirementStatus(req);
    const topicsCovered = req.studyTopicDeepDives?.filter((d) => d.deepDive).length ?? 0;

    const reqData: RequirementNodeData = {
      label: req.requirement,
      hasDeepDive: !!req.deepDive,
      sourceQuote: req.sourceQuote,
      questionCount: req.questions.length,
      topicsCompleted: topicsCovered,
      topicsTotal: req.studyTopics.length,
      status,
    };

    nodes.push({
      id: reqId,
      type: "requirement",
      position: { x: reqX, y: reqY },
      data: reqData,
    });

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

    const topicCount = req.studyTopics.length;
    const topicSpacing = 36;
    const topicOffsetY = -((topicCount - 1) * topicSpacing) / 2;
    const outwardX = Math.cos(angleRad) * 230;
    const outwardY = Math.sin(angleRad) * 80;
    const isLeftSide = reqX < centerX;
    const sourceHandle = isLeftSide ? "source-left" : "source-right";

    req.studyTopics.forEach((topic, j) => {
      const topicId = `topic-${origIdx}-${j}`;
      const hasTopicDeepDive = req.studyTopicDeepDives?.some(
        (d) => d.topic === topic && d.deepDive,
      );

      const topicData: TopicNodeData = {
        label: topic,
        hasDeepDive: !!hasTopicDeepDive,
        href: TOPIC_PREP_URLS[topic.toLowerCase().trim()],
      };
      nodes.push({
        id: topicId,
        type: "topic",
        position: {
          x: reqX + outwardX,
          y: reqY + outwardY + topicOffsetY + j * topicSpacing,
        },
        data: topicData,
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

// --- Main Component ---

interface InterviewPrepFlowProps {
  jobTitle: string;
  aiInterviewPrep: {
    summary: string;
    requirements: AiInterviewPrepRequirement[];
  };
  onRequirementClick?: (req: AiInterviewPrepRequirement) => void;
  onStudyTopicClick?: (req: AiInterviewPrepRequirement, topic: string) => void;
  height?: string;
}

function InterviewPrepFlowInner({
  jobTitle,
  aiInterviewPrep,
  onRequirementClick,
  onStudyTopicClick,
  height,
}: InterviewPrepFlowProps) {
  const { flowToScreenPosition } = useReactFlow();
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);

  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () => buildGraph(jobTitle, aiInterviewPrep.summary, aiInterviewPrep.requirements),
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
        height: height ?? "clamp(400px, 60vh, 700px)",
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
        <ProgressPanel requirements={aiInterviewPrep.requirements} />
      </ReactFlow>
      {tooltip && <GraphTooltip tooltip={tooltip} />}
    </div>
  );
}

export default function InterviewPrepFlow(props: InterviewPrepFlowProps) {
  return (
    <ReactFlowProvider>
      <InterviewPrepFlowInner {...props} />
    </ReactFlowProvider>
  );
}
