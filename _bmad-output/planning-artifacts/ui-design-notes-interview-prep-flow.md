# UI Design Notes: Interview Prep Flow Graph

**Date:** 2026-02-24
**Author:** UI Designer (Agent Teams)
**Scope:** `src/components/interview-prep-flow.tsx`, graph view within `/applications/[id]`
**Stack constraint:** React Flow (`@xyflow/react` v12.10), Radix UI Themes 3.3, Radix Icons. No Tailwind. Inline styles for one-off overrides.

---

## Context: Current State Analysis

The interview prep flow (`interview-prep-flow.tsx`) renders a mind-map style graph with three custom node types:

- **CenterNode** (line 24-46): Job title in `var(--accent-9)` purple, white text, 4 directional handles.
- **RequirementNode** (line 55-98): Requirement name, "Deep dive ready" label, question count. Green background if deep dive exists, gray if not.
- **TopicNode** (line 103-124): Study topic name in violet. Darker violet if deep dive exists.

Layout (lines 135-221): Simple radial fan. Requirements spread in a 30-degree arc from the center on the right side. Study topics fan vertically from each requirement with fixed 220px horizontal offset and 34px vertical spacing.

**Problems with the current implementation:**

1. No progress tracking visible at a glance -- you cannot tell how far along you are in prep.
2. Binary state only (has deep dive / does not) -- no intermediate states like "in progress" or "studied".
3. No tooltips or hover states beyond cursor change.
4. Right-side-only layout wastes space and creates long horizontal scrolling with many requirements.
5. No keyboard navigation beyond what React Flow provides by default.
6. No responsive considerations -- fixed 500px height container.
7. No context menu for actions (generate deep dive, mark studied).
8. Edge styling is uniform -- animated dashes for incomplete, solid for complete, but no edge labels.
9. MiniMap node colors do not reflect granular completion states.

**Data model constraints** (from `schema/applications/schema.graphql`):

```graphql
type AIInterviewPrepRequirement {
  requirement: String!
  questions: [String!]!
  studyTopics: [String!]!
  studyTopicDeepDives: [AIStudyTopicDeepDive!]!
  sourceQuote: String
  deepDive: String
}
```

There is no explicit "status" field on requirements or topics. Status must be derived:
- **Not started**: no `deepDive` and no `studyTopicDeepDives` entries.
- **In progress**: `deepDive` exists OR some `studyTopicDeepDives` exist, but not all topics covered.
- **Completed**: `deepDive` exists AND all `studyTopics` have corresponding `studyTopicDeepDives` entries.

---

## 1. Enhanced Node Component Patterns

### 1.1 RequirementNode Redesign

Replace the current flat card with a richer component that shows completion progress, category, and expandable question preview.

**Status derivation logic:**

```ts
type RequirementStatus = "not-started" | "in-progress" | "completed";

function deriveRequirementStatus(req: AiInterviewPrepRequirement): RequirementStatus {
  const hasDeepDive = !!req.deepDive;
  const topicsCovered = req.studyTopicDeepDives?.filter(d => d.deepDive).length ?? 0;
  const totalTopics = req.studyTopics.length;

  if (!hasDeepDive && topicsCovered === 0) return "not-started";
  if (hasDeepDive && topicsCovered === totalTopics) return "completed";
  return "in-progress";
}
```

**Color mapping to Radix tokens:**

| Status | Background | Border | Text accent |
|---|---|---|---|
| not-started | `var(--gray-2)` | `var(--gray-6)` | `var(--gray-11)` |
| in-progress | `var(--amber-2)` | `var(--amber-7)` | `var(--amber-11)` |
| completed | `var(--green-2)` | `var(--green-7)` | `var(--green-11)` |

**Progress ring:** Use an SVG circle inside the node to show study topic completion as a fraction. This is lightweight, accessible (via `aria-label`), and maps well to the circular per-requirement nature of the data.

```tsx
function ProgressRing({ completed, total, size = 28, stroke = 3 }: {
  completed: number; total: number; size?: number; stroke?: number;
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = total > 0 ? completed / total : 0;
  const dashOffset = circumference * (1 - progress);

  const color = progress === 1
    ? "var(--green-9)"
    : progress > 0
      ? "var(--amber-9)"
      : "var(--gray-6)";

  return (
    <svg width={size} height={size} style={{ flexShrink: 0 }}>
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none" stroke="var(--gray-4)" strokeWidth={stroke}
      />
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={circumference} strokeDashoffset={dashOffset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dashoffset 0.4s ease" }}
      />
      <text
        x={size / 2} y={size / 2}
        textAnchor="middle" dominantBaseline="central"
        style={{ fontSize: 9, fill: "var(--gray-11)", fontWeight: 600 }}
      >
        {completed}/{total}
      </text>
    </svg>
  );
}
```

**Full RequirementNode pseudo-JSX:**

```tsx
function RequirementNode({ data }: NodeProps<Node<RequirementNodeData>>) {
  const status = data.status; // "not-started" | "in-progress" | "completed"
  const colors = STATUS_COLORS[status]; // { bg, border, accent }

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
        // Focus-visible ring for keyboard navigation
        outline: "none",
      }}
      tabIndex={0}
      role="treeitem"
      aria-label={`${data.label}. ${data.topicsCompleted} of ${data.topicsTotal} topics completed. ${data.questionCount} questions.`}
      aria-expanded={false}
    >
      <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Right} style={{ opacity: 0 }} id="source-right" />

      {/* Row: progress ring + label */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <ProgressRing completed={data.topicsCompleted} total={data.topicsTotal} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontWeight: 600, fontSize: 12, color: "var(--gray-12)",
            lineHeight: 1.3,
            overflow: "hidden", textOverflow: "ellipsis",
            display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
          }}>
            {data.label}
          </div>
        </div>
      </div>

      {/* Meta row */}
      <div style={{
        display: "flex", alignItems: "center", gap: 6, marginTop: 6,
        fontSize: 10, color: "var(--gray-9)",
      }}>
        {data.hasDeepDive && (
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 2,
            color: colors.accent, fontWeight: 500,
          }}>
            {/* CheckCircledIcon inline SVG at 10px */}
            Deep dive
          </span>
        )}
        <span>{data.questionCount}q</span>
      </div>
    </div>
  );
}
```

**Extended data type:**

```ts
type RequirementNodeData = {
  label: string;
  hasDeepDive: boolean;
  sourceQuote?: string | null;
  questionCount: number;
  topicsCompleted: number;
  topicsTotal: number;
  status: RequirementStatus;
  questions: string[]; // for hover/expand preview
};
```

### 1.2 TopicNode Redesign

Add a status indicator icon, estimated study time, and hover-preview capability.

**Status derivation for topics:**

```ts
type TopicStatus = "not-started" | "generated" | "studied";
// "not-started": no deep dive content
// "generated": deep dive exists but not marked as studied
// "studied": marked as studied (future: requires a new field on the schema)
```

Since the schema has no "studied" flag today, use two states: `not-started` and `generated`. The "studied" state is a future schema addition (noted below).

**Color mapping:**

| Status | Background | Border/Left accent | Icon |
|---|---|---|---|
| not-started | `var(--gray-2)` | `var(--gray-5)` | `CircleIcon` (empty) |
| generated | `var(--violet-3)` | `var(--violet-7)` | `CheckCircledIcon` (filled) |
| studied | `var(--green-3)` | `var(--green-7)` | `CheckboxIcon` (checked) |

**Pseudo-JSX:**

```tsx
function TopicNode({ data }: NodeProps<Node<TopicNodeData>>) {
  const hasDeepDive = data.hasDeepDive;

  return (
    <div
      style={{
        padding: "6px 10px",
        borderRadius: 6,
        background: hasDeepDive ? "var(--violet-3)" : "var(--gray-2)",
        borderLeft: `3px solid ${hasDeepDive ? "var(--violet-7)" : "var(--gray-5)"}`,
        fontSize: 11,
        color: "var(--gray-12)",
        cursor: "pointer",
        maxWidth: 170,
        lineHeight: 1.3,
        display: "flex",
        alignItems: "center",
        gap: 6,
        transition: "background 0.15s, border-color 0.15s",
      }}
      tabIndex={0}
      role="treeitem"
      aria-label={`Study topic: ${data.label}. ${hasDeepDive ? "Deep dive available" : "Not started"}.`}
    >
      <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />

      {/* Status icon: 10px circle or check */}
      <svg width={10} height={10} style={{ flexShrink: 0 }}>
        {hasDeepDive ? (
          // Filled check circle
          <>
            <circle cx={5} cy={5} r={5} fill="var(--violet-9)" />
            <path d="M3 5.2L4.5 6.5L7 3.8" stroke="white" strokeWidth={1.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </>
        ) : (
          // Empty circle
          <circle cx={5} cy={5} r={4} fill="none" stroke="var(--gray-7)" strokeWidth={1} />
        )}
      </svg>

      <span style={{
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
      }}>
        {data.label}
      </span>
    </div>
  );
}
```

### 1.3 Progress Summary Panel

Use React Flow's `<Panel>` component to overlay a completion summary in the top-left corner. This avoids adding another node to the graph and stays fixed during zoom/pan.

```tsx
import { Panel } from "@xyflow/react";

function ProgressSummaryPanel({ requirements }: { requirements: AiInterviewPrepRequirement[] }) {
  const total = requirements.length;
  const withDeepDive = requirements.filter(r => r.deepDive).length;
  const totalTopics = requirements.reduce((sum, r) => sum + r.studyTopics.length, 0);
  const completedTopics = requirements.reduce((sum, r) =>
    sum + (r.studyTopicDeepDives?.filter(d => d.deepDive).length ?? 0), 0);
  const overallPercent = totalTopics > 0
    ? Math.round((completedTopics / totalTopics) * 100)
    : 0;

  return (
    <Panel position="top-left">
      <div style={{
        background: "var(--gray-1)",
        border: "1px solid var(--gray-5)",
        borderRadius: 8,
        padding: "10px 14px",
        minWidth: 160,
        fontSize: 12,
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
      }}>
        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, color: "var(--gray-12)" }}>
          Prep Progress
        </div>

        {/* Overall progress bar */}
        <div style={{
          height: 6, borderRadius: 3,
          background: "var(--gray-4)",
          marginBottom: 8, overflow: "hidden",
        }}>
          <div style={{
            height: "100%", borderRadius: 3,
            width: `${overallPercent}%`,
            background: overallPercent === 100 ? "var(--green-9)" : "var(--amber-9)",
            transition: "width 0.4s ease",
          }} />
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", color: "var(--gray-11)" }}>
          <span>Requirements</span>
          <span style={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
            {withDeepDive}/{total}
          </span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", color: "var(--gray-11)", marginTop: 4 }}>
          <span>Topics</span>
          <span style={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
            {completedTopics}/{totalTopics}
          </span>
        </div>
        <div style={{
          marginTop: 8, paddingTop: 8,
          borderTop: "1px solid var(--gray-4)",
          fontWeight: 700, fontSize: 18,
          color: overallPercent === 100 ? "var(--green-11)" : "var(--gray-12)",
          textAlign: "center",
        }}>
          {overallPercent}%
        </div>
      </div>
    </Panel>
  );
}
```

### 1.4 Category Grouping with Background Regions

React Flow v12 supports group nodes via `type: "group"` and `parentId` on child nodes. However, the interview prep data does not have explicit categories on requirements. Two options:

**Option A (recommended): Visual grouping via edge color coding.** Derive implicit categories from the requirement text (e.g., "technical", "behavioral", "domain") using a simple heuristic or by extending the GraphQL schema with a `category` field. Color the edges from center to requirement nodes by category:

```ts
const CATEGORY_EDGE_COLORS: Record<string, string> = {
  technical: "var(--blue-7)",
  behavioral: "var(--orange-7)",
  domain: "var(--green-7)",
  default: "var(--gray-7)",
};
```

**Option B: Sub-flow groups.** Use React Flow's group nodes to create translucent background regions. This requires significant layout computation and is better suited for a future iteration when the schema includes explicit categories.

For now, recommend **Option A** as it requires no schema changes and adds visual differentiation with minimal complexity.

---

## 2. Interaction Patterns

### 2.1 Hover Tooltips

React Flow does not include a built-in tooltip system. Use a custom tooltip positioned via node coordinates. Since Radix UI does not export a standalone `Tooltip` usable outside React component trees inside React Flow nodes, implement a lightweight tooltip via a portal-rendered div.

**Approach: `onNodeMouseEnter` / `onNodeMouseLeave` handlers on `<ReactFlow>`.**

```tsx
const [hoveredNode, setHoveredNode] = useState<{
  id: string;
  type: string;
  x: number;
  y: number;
  data: any;
} | null>(null);

// In ReactFlow:
<ReactFlow
  onNodeMouseEnter={(_event, node) => {
    // Use the node's computed position from the viewport
    const { x, y } = node.position;
    setHoveredNode({ id: node.id, type: node.type!, x, y, data: node.data });
  }}
  onNodeMouseLeave={() => setHoveredNode(null)}
>
```

**Tooltip content by node type:**

| Node Type | Tooltip Content |
|---|---|
| requirement | Source quote (italic, truncated to 120 chars), `N questions`, `M/T topics completed (X%)` |
| topic | Parent requirement name, deep dive status, excerpt of deep dive (first 150 chars if available) |
| center | Summary text (first 200 chars) |

**Tooltip rendering (inside the flow container div, positioned absolutely):**

```tsx
{hoveredNode && (
  <div
    style={{
      position: "absolute",
      left: tooltipScreenX,
      top: tooltipScreenY - 8,
      transform: "translateX(-50%) translateY(-100%)",
      background: "var(--gray-1)",
      border: "1px solid var(--gray-6)",
      borderRadius: 6,
      padding: "8px 12px",
      maxWidth: 260,
      fontSize: 11,
      color: "var(--gray-12)",
      boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
      pointerEvents: "none",
      zIndex: 50,
      lineHeight: 1.4,
    }}
  >
    {hoveredNode.type === "requirement" && (
      <>
        {hoveredNode.data.sourceQuote && (
          <div style={{ fontStyle: "italic", color: "var(--gray-9)", marginBottom: 4 }}>
            "{truncate(hoveredNode.data.sourceQuote, 120)}"
          </div>
        )}
        <div>{hoveredNode.data.questionCount} interview questions</div>
        <div>{hoveredNode.data.topicsCompleted}/{hoveredNode.data.topicsTotal} topics completed</div>
      </>
    )}
    {hoveredNode.type === "topic" && (
      <>
        <div style={{ fontWeight: 600, marginBottom: 2 }}>{hoveredNode.data.label}</div>
        <div style={{ color: "var(--gray-9)" }}>
          {hoveredNode.data.hasDeepDive ? "Deep dive available -- click to view" : "Click to generate deep dive"}
        </div>
      </>
    )}
  </div>
)}
```

**Note on viewport-to-screen coordinate conversion:** React Flow v12 provides `useReactFlow().flowToScreenPosition({ x, y })` to convert node positions to screen coordinates. Use this inside the tooltip positioning logic.

### 2.2 Click Behavior

Already wired via `onNodeClick`. No changes needed to the callback structure. The parent page (`applications/[id]/page.tsx`) handles opening the deep dive dialog.

### 2.3 Context Menu (Right-Click)

React Flow v12 exposes `onNodeContextMenu` on the `<ReactFlow>` component. Use this to show a custom context menu with actions:

**Actions by node type:**

| Node Type | Menu Items |
|---|---|
| requirement | "Generate deep dive" (if none), "Regenerate deep dive" (if exists), "View questions", "Copy requirement text" |
| topic | "Generate deep dive" (if none), "Regenerate deep dive" (if exists), "Copy topic name" |

**Implementation pattern:**

```tsx
const [contextMenu, setContextMenu] = useState<{
  x: number; y: number; node: Node;
} | null>(null);

const onNodeContextMenu = useCallback((event: React.MouseEvent, node: Node) => {
  event.preventDefault();
  setContextMenu({ x: event.clientX, y: event.clientY, node });
}, []);

// Close on click outside
useEffect(() => {
  const close = () => setContextMenu(null);
  if (contextMenu) {
    window.addEventListener("click", close, { once: true });
    return () => window.removeEventListener("click", close);
  }
}, [contextMenu]);
```

Render the context menu as a simple div with items styled to match Radix DropdownMenu appearance:

```tsx
{contextMenu && (
  <div style={{
    position: "fixed",
    left: contextMenu.x,
    top: contextMenu.y,
    background: "var(--gray-1)",
    border: "1px solid var(--gray-6)",
    borderRadius: 6,
    padding: "4px 0",
    boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
    zIndex: 100,
    minWidth: 180,
    fontSize: 13,
  }}>
    {contextMenu.node.type === "requirement" && (
      <>
        <ContextMenuItem
          label={contextMenu.node.data.hasDeepDive ? "Regenerate deep dive" : "Generate deep dive"}
          onClick={() => { onRequirementClick?.(findReq(contextMenu.node)); setContextMenu(null); }}
        />
        <ContextMenuItem
          label="View questions"
          onClick={() => { onRequirementClick?.(findReq(contextMenu.node)); setContextMenu(null); }}
        />
        <ContextMenuSeparator />
        <ContextMenuItem
          label="Copy requirement"
          onClick={() => { navigator.clipboard.writeText(contextMenu.node.data.label); setContextMenu(null); }}
        />
      </>
    )}
  </div>
)}
```

`ContextMenuItem` is a simple styled div with hover state matching `var(--gray-3)` background on hover, `var(--gray-12)` text, `padding: "6px 12px"`.

### 2.4 Drag Behavior

Already enabled via `nodesDraggable`. No changes needed. The current implementation supports dragging nodes to reorganize the mind map.

### 2.5 Keyboard Navigation

React Flow v12 has limited built-in keyboard support. To add tree-style navigation:

**Strategy:** Use `onKeyDown` on the ReactFlow container wrapper div. Track a `focusedNodeId` in state. Arrow keys navigate the tree structure:

| Key | Behavior |
|---|---|
| Tab | Move focus into the flow, land on center node |
| ArrowRight | From center: focus first requirement. From requirement: focus first topic. |
| ArrowLeft | From topic: focus parent requirement. From requirement: focus center. |
| ArrowDown | Next sibling at same level (next requirement, or next topic under same requirement) |
| ArrowUp | Previous sibling at same level |
| Enter / Space | Trigger click action (open deep dive dialog) |
| Escape | Close context menu or tooltip |

Implementation requires maintaining a node adjacency map derived from the edges array:

```ts
function buildAdjacencyMap(nodes: Node[], edges: Edge[]) {
  const children: Record<string, string[]> = {};
  const parent: Record<string, string> = {};
  for (const edge of edges) {
    if (!children[edge.source]) children[edge.source] = [];
    children[edge.source].push(edge.target);
    parent[edge.target] = edge.source;
  }
  return { children, parent };
}
```

**Focus ring styling:** When a node is focused via keyboard, apply a box-shadow ring:

```ts
const focusRingStyle = focusedNodeId === nodeId
  ? { boxShadow: "0 0 0 2px var(--accent-9)" }
  : {};
```

Pass `focusedNodeId` through node data or a React context to avoid prop drilling into custom node components.

### 2.6 Animation

**Pulse on nodes needing attention:** Nodes in "not-started" state should have a subtle pulse to draw attention. Use CSS animation via inline `@keyframes` injected once, or a style tag.

```css
@keyframes node-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(var(--amber-9-rgb), 0.3); }
  50% { box-shadow: 0 0 0 4px rgba(var(--amber-9-rgb), 0.1); }
}
```

Since Radix does not expose RGB values for tokens, use a fallback:

```ts
// For not-started requirement nodes:
style={{
  animation: status === "not-started" ? "node-pulse 2.5s ease-in-out infinite" : "none",
}}
```

Inject the keyframes via a `<style>` tag in the component's render output (inside the flow container).

**Smooth transitions on state change:** Already covered by `transition` properties on background, border-color, and box-shadow in the node styles. When data changes (e.g., deep dive generated), React Flow re-renders the node component, and CSS transitions handle the visual update.

**Edge animation:** The current `animated: true` prop on edges creates a dashed moving animation. Keep this for incomplete edges. For completed edges, use `animated: false` with a solid stroke. Add a brief SVG path animation on completion using React Flow's custom edge component (see Section 6).

---

## 3. Visual Design within Radix UI

### 3.1 Token Mapping

The existing codebase uses `var(--accent-9)` for the center node (resolves to the app's accent color, which is purple/indigo based on the Radix Theme config). The design should use these Radix color steps consistently:

| Purpose | Token | Step rationale |
|---|---|---|
| Node background (surface) | `var(--{color}-2)` or `var(--{color}-3)` | Steps 2-3: subtle backgrounds per Radix color guide |
| Node border | `var(--{color}-6)` or `var(--{color}-7)` | Steps 6-7: borders and separators |
| Accent text inside nodes | `var(--{color}-11)` | Step 11: accessible low-contrast text |
| Primary text | `var(--gray-12)` | Step 12: high contrast text |
| Secondary text | `var(--gray-9)` | Step 9: muted text |
| Edge strokes | `var(--{color}-6)` | Step 6: subtle structural elements |
| Progress bar fill | `var(--{color}-9)` | Step 9: solid interactive/accent fills |
| Focus ring | `var(--accent-9)` | Consistent with app-wide accent |

**Color assignments by element:**

| Element | Color scale |
|---|---|
| Center node | `accent` (purple/indigo) -- matches existing |
| Requirement node (not started) | `gray` |
| Requirement node (in progress) | `amber` |
| Requirement node (completed) | `green` |
| Topic node (no deep dive) | `gray` |
| Topic node (deep dive available) | `violet` -- matches existing |
| Center-to-requirement edges | `gray-7` (default), category color if categorized |
| Requirement-to-topic edges | `violet-6` -- matches existing |
| Progress ring track | `gray-4` |
| Progress ring fill | `green-9` (complete), `amber-9` (partial), `gray-6` (empty) |

### 3.2 Using Radix Components Inside Custom Nodes

React Flow custom nodes receive their own React tree, so Radix components work inside them as long as the `<Theme>` provider is an ancestor. Since the flow is rendered inside the application page which is already wrapped in a Theme provider, Radix components will resolve tokens correctly.

**Where to use Radix components inside nodes:**

- `<Text>` for all text within nodes (ensures font-size tokens match the app).
- `<Badge>` for status indicators ("Ready", "3 questions") -- but only if the Badge sizing works at the node scale. At `size="1"`, a Radix Badge renders at 20px height, which may be too large inside a compact node. Test and fall back to styled spans if needed.
- `<Flex>` for layout within nodes.

**Where NOT to use Radix components:**

- `<Card>` as the node wrapper. React Flow custom nodes must be plain divs with `Handle` components. Wrapping in a Radix Card adds extra DOM and styling that conflicts with React Flow's node positioning.
- `<Tooltip>` wrapping the entire node. Radix Tooltip adds a portal and needs trigger/content composition that does not play well with React Flow's event system. Use the custom tooltip approach described in Section 2.1.

### 3.3 Edge Styles

**Current:** `type: "smoothstep"`, gray stroke, animated (dashed) for incomplete.

**Proposed:**

| Edge state | Type | Stroke | Dash | Animation |
|---|---|---|---|---|
| Requirement complete | smoothstep | `var(--green-7)`, 2px | none (solid) | none |
| Requirement in progress | smoothstep | `var(--amber-6)`, 2px | `5 5` | none |
| Requirement not started | smoothstep | `var(--gray-5)`, 1.5px | `4 4` | animated=true (marching ants) |
| Topic with deep dive | smoothstep | `var(--violet-7)`, 1.5px | none (solid) | none |
| Topic without deep dive | smoothstep | `var(--gray-5)`, 1px | `3 3` | none |

### 3.4 Background

The current `<Background gap={20} size={1} color="var(--gray-4)" />` renders a dot grid. This is appropriate. For dark mode support, the dots should remain at `var(--gray-4)` since Radix tokens are mode-aware -- `--gray-4` resolves to a darker gray in dark mode automatically.

Enhance with variant prop for visual interest:

```tsx
<Background variant="dots" gap={20} size={1} color="var(--gray-4)" />
```

No change needed since `"dots"` is the default. For an alternative look, `variant="cross"` at `gap={30} size={2}` gives a more technical/blueprint feel that may suit an interview prep context.

---

## 4. Layout Algorithm Improvements

### 4.1 Current Layout Problems

The radial fan layout (lines 155-218) has these issues:

1. **Right-only spread:** All requirements fan to the right of center. With 8+ requirements, the 30-degree spacing pushes nodes far up and down, while the left half of the viewport is empty.
2. **Fixed offsets:** Topic nodes are always 220px to the right of their requirement, regardless of how many topics there are. Long topic lists create vertical collisions.
3. **No dynamic spacing:** Requirements with 5 topics visually collide with neighbors that also have many topics.

### 4.2 Recommended: Balanced Radial Layout

Instead of right-only fan, spread requirements in a full 360-degree radial layout around the center. This uses viewport space more efficiently.

```ts
function buildRadialGraph(
  jobTitle: string,
  summary: string,
  requirements: AiInterviewPrepRequirement[],
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  nodes.push({
    id: "center",
    type: "center",
    position: { x: 0, y: 0 },
    data: { label: jobTitle, summary },
    draggable: true,
  });

  const reqCount = requirements.length;
  const reqRadius = 300;

  // Full circle, starting from top (-90 deg)
  const angleStep = (2 * Math.PI) / reqCount;
  const startAngle = -Math.PI / 2;

  requirements.forEach((req, i) => {
    const reqId = `req-${i}`;
    const angle = startAngle + i * angleStep;
    const reqX = reqRadius * Math.cos(angle);
    const reqY = reqRadius * Math.sin(angle);

    // Determine which handle to use based on angle
    const isLeftSide = Math.abs(angle) > Math.PI / 2;

    const status = deriveRequirementStatus(req);
    const topicsCompleted = req.studyTopicDeepDives?.filter(d => d.deepDive).length ?? 0;

    nodes.push({
      id: reqId,
      type: "requirement",
      position: { x: reqX, y: reqY },
      data: {
        label: req.requirement,
        hasDeepDive: !!req.deepDive,
        sourceQuote: req.sourceQuote,
        questionCount: req.questions.length,
        topicsCompleted,
        topicsTotal: req.studyTopics.length,
        status,
        questions: req.questions,
      },
    });

    // Edge from center to requirement
    edges.push({
      id: `e-center-${reqId}`,
      source: "center",
      target: reqId,
      targetHandle: isLeftSide ? "right" : undefined, // target left handle by default
      type: "smoothstep",
      style: {
        stroke: status === "completed"
          ? "var(--green-7)"
          : status === "in-progress"
            ? "var(--amber-6)"
            : "var(--gray-5)",
        strokeWidth: 2,
        strokeDasharray: status === "not-started" ? "4 4" : undefined,
      },
      animated: status === "not-started",
    });

    // Topic nodes: fan outward from requirement
    const topicCount = req.studyTopics.length;
    const topicSpacing = 36;
    const topicOffsetY = -((topicCount - 1) * topicSpacing) / 2;

    // Topics extend outward from center (away from the center node)
    const topicDirection = isLeftSide ? -1 : 1;
    const topicOffsetX = 200 * topicDirection;

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
        sourceHandle: isLeftSide ? "source-left" : "source-right",
        target: topicId,
        targetHandle: isLeftSide ? undefined : "right",
        type: "smoothstep",
        style: {
          stroke: hasTopicDeepDive ? "var(--violet-7)" : "var(--gray-5)",
          strokeWidth: 1.5,
          strokeDasharray: hasTopicDeepDive ? undefined : "3 3",
        },
      });
    });
  });

  return { nodes, edges };
}
```

### 4.3 Handling Variable Topic Counts

Requirements with many topics (5+) need more vertical space than those with 1-2. The current fixed 34px spacing does not account for this.

**Dynamic spacing approach:** Before placing requirement nodes, compute the angular space each requirement needs based on its topic count:

```ts
// Weight each requirement by its topic count
const weights = requirements.map(r => Math.max(r.studyTopics.length, 1));
const totalWeight = weights.reduce((a, b) => a + b, 0);

// Distribute angles proportionally
let currentAngle = startAngle;
requirements.forEach((req, i) => {
  const angleSpan = (weights[i] / totalWeight) * 2 * Math.PI;
  const angle = currentAngle + angleSpan / 2;
  currentAngle += angleSpan;
  // ... place requirement at this angle
});
```

This ensures requirements with more topics get more angular space, reducing visual overlap.

### 4.4 Alternative: Dagre/ELK Hierarchical Layout

For a more traditional tree layout, use `@dagrejs/dagre` (already commonly paired with React Flow). This would give a left-to-right hierarchy:

```
[Center] ---> [Req 1] ---> [Topic 1a]
                       ---> [Topic 1b]
          ---> [Req 2] ---> [Topic 2a]
```

**Pros:** Clean alignment, predictable spacing, handles varying topic counts automatically.
**Cons:** Less visually interesting than radial, uses more horizontal space, does not feel like a "mind map".

**Recommendation:** Start with the balanced radial layout (4.2 + 4.3). Offer dagre as an optional layout toggle in the Panel controls (see Section 6).

**If dagre is adopted, install `@dagrejs/dagre`:**

```ts
import dagre from "@dagrejs/dagre";

function getLayoutedElements(nodes: Node[], edges: Edge[], direction = "LR") {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: direction, nodesep: 40, ranksep: 200 });

  nodes.forEach((node) => {
    g.setNode(node.id, { width: node.type === "center" ? 180 : node.type === "requirement" ? 220 : 170, height: 60 });
  });
  edges.forEach((edge) => {
    g.setEdge(edge.source, edge.target);
  });

  dagre.layout(g);

  const layoutedNodes = nodes.map((node) => {
    const { x, y } = g.node(node.id);
    return { ...node, position: { x: x - 90, y: y - 30 } }; // center the node
  });

  return { nodes: layoutedNodes, edges };
}
```

---

## 5. Responsive and Accessibility

### 5.1 Mobile View

The current 500px fixed height container is too small for touch interaction on mobile and too large relative to the viewport on small screens.

**Proposed responsive container:**

```tsx
<div style={{
  width: "100%",
  height: "clamp(350px, 60vh, 700px)",
  borderRadius: 8,
  overflow: "hidden",
  touchAction: "none", // prevent browser scroll while interacting with flow
}}>
```

**Mobile simplifications:**

1. **Hide MiniMap on small screens.** The minimap is not useful on mobile where the viewport is already small. Detect via `matchMedia` or a custom hook:

```ts
const isMobile = useMediaQuery("(max-width: 639px)");

// In JSX:
{!isMobile && <MiniMap ... />}
```

2. **Increase touch targets.** Minimum 44x44px touch targets per WCAG 2.5.5. Current TopicNode is only ~24px tall. On mobile, increase padding:

```ts
const topicPadding = isMobile ? "10px 14px" : "6px 10px";
```

3. **Simplified view option.** On mobile, consider collapsing topic nodes by default and only showing requirement nodes. Tap a requirement to expand its topics. This reduces visual clutter on small screens.

```ts
// In buildGraph, skip topic nodes on mobile unless the requirement is "expanded"
if (!isMobile || expandedReqs.has(reqId)) {
  req.studyTopics.forEach((topic, j) => { /* add topic nodes */ });
}
```

### 5.2 Touch Interactions

React Flow v12 supports touch natively:
- **Pinch to zoom:** Built-in, no configuration needed.
- **Tap to select:** Maps to `onNodeClick`.
- **Pan:** Single-finger drag on canvas (not on nodes).
- **Drag nodes:** Touch-drag on nodes works by default.

Additional touch consideration: long-press to open context menu. React Flow does not expose `onNodeLongPress`. Implement with a custom touch handler:

```ts
const touchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

const onTouchStart = useCallback((event: React.TouchEvent) => {
  // Detect if touch is on a node (check event.target for node class)
  touchTimer.current = setTimeout(() => {
    // Open context menu at touch position
  }, 500);
}, []);

const onTouchEnd = useCallback(() => {
  if (touchTimer.current) clearTimeout(touchTimer.current);
}, []);
```

### 5.3 ARIA Tree Structure

The graph represents a hierarchical tree (center -> requirements -> topics). Add ARIA tree semantics:

```tsx
<div
  role="tree"
  aria-label={`Interview preparation mind map for ${jobTitle}`}
  style={{ width: "100%", height: "..." }}
>
  <ReactFlow ... />
</div>
```

Individual nodes should have:
- `role="treeitem"` (already shown in node pseudo-JSX above)
- `aria-level`: 1 for center, 2 for requirements, 3 for topics
- `aria-expanded`: for requirement nodes, `true` if topic children are visible
- `aria-setsize`: total number of siblings at this level
- `aria-posinset`: 1-based position among siblings

**Implementation in node data:**

```ts
// When building the graph, add ARIA metadata to node data:
data: {
  ...existingData,
  ariaLevel: 2,
  ariaSetSize: reqCount,
  ariaPosInSet: i + 1,
  ariaExpanded: true, // topics are always visible in current design
}
```

In the custom node component:

```tsx
<div
  role="treeitem"
  aria-level={data.ariaLevel}
  aria-setsize={data.ariaSetSize}
  aria-posinset={data.ariaPosInSet}
  aria-expanded={data.ariaExpanded}
  aria-label={/* descriptive label */}
  tabIndex={0}
>
```

### 5.4 Color Contrast Verification

All node states must meet WCAG AA (4.5:1 for normal text, 3:1 for large text) on their respective backgrounds.

| State | Text color | Background | Expected ratio | Passes AA? |
|---|---|---|---|---|
| Not started: `--gray-12` on `--gray-2` | ~#1c2024 | ~#f9f9fb | >15:1 | Yes |
| In progress: `--gray-12` on `--amber-2` | ~#1c2024 | ~#fefbe9 | >14:1 | Yes |
| Completed: `--gray-12` on `--green-2` | ~#1c2024 | ~#e9f9ee | >13:1 | Yes |
| Topic (no deep dive): `--gray-12` on `--gray-2` | same as above | | | Yes |
| Topic (deep dive): `--gray-12` on `--violet-3` | ~#1c2024 | ~#ede9fe | >12:1 | Yes |
| Accent text: `--green-11` on `--green-2` | ~#18794e | ~#e9f9ee | ~5.5:1 | Yes |
| Accent text: `--amber-11` on `--amber-2` | ~#ad5700 | ~#fefbe9 | ~5.2:1 | Yes |
| Meta text: `--gray-9` on `--gray-2` | ~#8b8d98 | ~#f9f9fb | ~3.8:1 | Borderline -- use `--gray-10` (~#73767d) for guaranteed AA |

**Fix for meta text:** Change `color: "var(--gray-9)"` to `color: "var(--gray-10)"` for the question count and other secondary text inside nodes. Step 10 provides ~4.5:1 on step-2 backgrounds.

### 5.5 Full Keyboard Navigation

See Section 2.5 for the keyboard interaction model. Additional requirements:

- **Skip link:** Add a visually hidden skip link before the flow container: "Skip interview prep graph" that jumps focus to the next section (Notes card).
- **Screen reader announcement on focus change:** Use an `aria-live="polite"` region to announce the focused node's details when keyboard navigation changes focus.

```tsx
<div aria-live="polite" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden" }}>
  {focusedNodeAnnouncement}
</div>
```

Where `focusedNodeAnnouncement` is a string like "Requirement: System Design. 2 of 4 topics completed. 5 interview questions."

---

## 6. React Flow Specific Features to Leverage

### 6.1 Enhanced MiniMap

The current MiniMap uses basic node colors. Enhance to reflect the tri-state status:

```tsx
<MiniMap
  nodeColor={(node) => {
    if (node.type === "center") return "var(--accent-9)";
    if (node.type === "requirement") {
      const status = node.data?.status;
      if (status === "completed") return "var(--green-9)";
      if (status === "in-progress") return "var(--amber-9)";
      return "var(--gray-7)";
    }
    // topic
    return node.data?.hasDeepDive ? "var(--violet-9)" : "var(--gray-5)";
  }}
  nodeStrokeColor={(node) => {
    if (node.type === "center") return "var(--accent-11)";
    return "transparent";
  }}
  style={{ background: "var(--gray-2)", borderColor: "var(--gray-5)" }}
  maskColor="rgba(0,0,0,0.12)"
  pannable
  zoomable
/>
```

### 6.2 Panel Controls

Add a filter/controls panel in the top-right corner:

```tsx
<Panel position="top-right">
  <div style={{
    display: "flex", gap: 4,
    background: "var(--gray-1)",
    border: "1px solid var(--gray-5)",
    borderRadius: 6,
    padding: 4,
  }}>
    {/* Filter by status */}
    <button
      onClick={() => setFilter("incomplete")}
      style={{
        padding: "4px 10px", borderRadius: 4, border: "none", cursor: "pointer",
        fontSize: 11, fontWeight: 500,
        background: filter === "incomplete" ? "var(--amber-3)" : "transparent",
        color: filter === "incomplete" ? "var(--amber-11)" : "var(--gray-11)",
      }}
    >
      Incomplete
    </button>
    <button
      onClick={() => zoomToIncomplete()}
      style={{
        padding: "4px 10px", borderRadius: 4, border: "none", cursor: "pointer",
        fontSize: 11, fontWeight: 500,
        background: "transparent", color: "var(--gray-11)",
      }}
    >
      Focus next
    </button>
    {/* Layout toggle */}
    <button
      onClick={() => setLayout(layout === "radial" ? "tree" : "radial")}
      style={{
        padding: "4px 10px", borderRadius: 4, border: "none", cursor: "pointer",
        fontSize: 11, fontWeight: 500,
        background: "transparent", color: "var(--gray-11)",
      }}
    >
      {layout === "radial" ? "Tree" : "Radial"}
    </button>
  </div>
</Panel>
```

**"Focus next" action:** Finds the first incomplete requirement node and calls `reactFlowInstance.fitView({ nodes: [incompleteNode], padding: 0.5, duration: 400 })`.

```ts
const reactFlowInstance = useReactFlow();

function zoomToIncomplete() {
  const incompleteNode = nodes.find(
    (n) => n.type === "requirement" && n.data?.status !== "completed"
  );
  if (incompleteNode) {
    reactFlowInstance.fitView({
      nodes: [{ id: incompleteNode.id }],
      padding: 0.5,
      duration: 400,
    });
  }
}
```

### 6.3 Custom Edge Labels

React Flow supports custom edge components. Use these to show relationship context on edges:

```tsx
import { BaseEdge, getSmoothStepPath, type EdgeProps } from "@xyflow/react";

function StatusEdge({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data, style }: EdgeProps) {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX, sourceY, sourcePosition,
    targetX, targetY, targetPosition,
  });

  return (
    <>
      <BaseEdge id={id} path={edgePath} style={style} />
      {data?.label && (
        <foreignObject
          x={labelX - 30} y={labelY - 10}
          width={60} height={20}
          style={{ overflow: "visible", pointerEvents: "none" }}
        >
          <div style={{
            fontSize: 9,
            color: "var(--gray-9)",
            textAlign: "center",
            whiteSpace: "nowrap",
          }}>
            {data.label}
          </div>
        </foreignObject>
      )}
    </>
  );
}

const edgeTypes = { status: StatusEdge };
```

Use edge labels sparingly -- only on center-to-requirement edges to show the question count: `data: { label: "5q" }`.

### 6.4 React Flow Wrapper Considerations

The `<ReactFlow>` component must be wrapped in a `<ReactFlowProvider>` if `useReactFlow()` is called inside child components (like the Panel controls). Currently the component does not use `useReactFlow()`, but the proposed enhancements (zoom to incomplete, viewport-to-screen coordinate conversion for tooltips) require it.

Ensure the provider is added at the component level:

```tsx
import { ReactFlowProvider } from "@xyflow/react";

export default function InterviewPrepFlow(props: InterviewPrepFlowProps) {
  return (
    <ReactFlowProvider>
      <InterviewPrepFlowInner {...props} />
    </ReactFlowProvider>
  );
}

function InterviewPrepFlowInner({ ... }: InterviewPrepFlowProps) {
  const reactFlowInstance = useReactFlow();
  // ... existing logic with enhancements
}
```

---

## 7. Implementation Priority

| Priority | Change | Effort | Impact |
|---|---|---|---|
| P0 | Tri-state status derivation + color coding for RequirementNode | Small | High -- gives immediate visual feedback on prep progress |
| P0 | ProgressRing inside RequirementNode | Small | High -- at-a-glance completion tracking |
| P0 | ProgressSummaryPanel overlay | Small | High -- overall prep completion visible |
| P1 | Balanced radial layout (full 360) with weighted spacing | Medium | High -- solves the right-side-only cramping issue |
| P1 | TopicNode status indicator (left border + check icon) | Small | Medium -- clearer topic state |
| P1 | Enhanced edge styling (solid/dashed/animated by state) | Small | Medium -- visual consistency |
| P1 | Hover tooltips with source quote and completion % | Medium | Medium -- discoverability of data |
| P2 | Context menu (right-click / long-press) | Medium | Medium -- power user efficiency |
| P2 | Panel controls (filter, focus next, layout toggle) | Medium | Medium -- navigation efficiency |
| P2 | Enhanced MiniMap colors | Small | Low -- incremental improvement |
| P2 | ReactFlowProvider + useReactFlow for zoom-to-node | Small | Medium -- enables other features |
| P3 | Keyboard navigation (arrow keys, focus management) | Large | Medium -- accessibility |
| P3 | ARIA tree semantics (role, aria-level, aria-expanded) | Medium | Medium -- accessibility |
| P3 | Mobile responsive (clamp height, hide minimap, larger touch targets) | Medium | Medium -- mobile usability |
| P3 | Dagre layout option as toggle | Medium | Low -- alternative for users who prefer tree view |
| P3 | Custom edge component with labels | Small | Low -- polish |
| P3 | Pulse animation on not-started nodes | Small | Low -- attention guidance |
| P3 | Skip link and aria-live announcements | Small | Medium -- screen reader support |

---

## 8. Schema Extension Notes (Future)

The current schema does not support:

1. **"Studied" status per topic.** Would require a new field: `studied: Boolean` on `AIStudyTopicDeepDive`, or a separate `studiedTopics: [String!]!` on `AIInterviewPrepRequirement`.
2. **Requirement categories.** Would require a `category: String` field on `AIInterviewPrepRequirement` (e.g., "technical", "behavioral", "domain").
3. **Estimated study time.** Would require `estimatedMinutes: Int` on `AIStudyTopicDeepDive` or computed from deep dive content length.
4. **User notes per topic.** Would require a `notes: String` field or a separate `AIInterviewPrepNote` type.

These are not blocking for the P0/P1 improvements above, but would enable the full interaction model described in the context menu (mark as studied) and topic node (estimated time) designs.
