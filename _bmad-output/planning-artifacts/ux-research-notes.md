# UX Research Notes: Interview Prep Graph View Redesign

**Date:** 2026-02-24
**Author:** UX Researcher (Agent Teams)
**Scope:** `src/components/interview-prep-flow.tsx`, `src/app/applications/[id]/page.tsx`, `schema/applications/schema.graphql`

---

## 1. User Problem Definition

### What the current mind map does well

The existing React Flow graph (`interview-prep-flow.tsx`) provides a spatial overview of AI-generated interview prep data. It renders a center node (job title) with 5 requirement nodes fanning out to the right, each branching into 3 study topic leaf nodes. This gives users a "map of the territory" for a specific application -- something the flat list view cannot do.

### What the current mind map does poorly

**Problem 1: The graph is read-only wallpaper.**
The graph renders all nodes at once with no progressive disclosure. A user sees 5 requirements x 3 topics = 15 leaf nodes plus 5 intermediate nodes plus 1 center node = 21 nodes simultaneously in a 500px-tall container. At the default `fitView` zoom level, node text is 11-12px -- barely readable without zooming in. The graph provides a bird's-eye view but no actionable detail at any zoom level. Users must click a node and then read a modal dialog to get value; the graph itself communicates only topology.

**Problem 2: No progress or readiness signals at a glance.**
The only visual differentiation is:
- Requirement nodes: green background (`var(--green-3)`) if `hasDeepDive`, gray otherwise. A small "Deep dive ready" label in 10px green text.
- Topic nodes: slightly darker violet (`var(--violet-5)`) if `hasDeepDive`, lighter violet otherwise.
- Edges from center to requirements: animated dashed line if no deep dive, solid if deep dive exists.

These signals are subtle. A user cannot scan the graph and quickly answer "How prepared am I?" or "What should I study next?" There is no completion percentage, no progress ring, no red/yellow/green traffic light system. The binary "has deep dive / doesn't have deep dive" is the only status, and it maps to "content has been generated," not "user has studied this."

**Problem 3: No user-driven progress tracking.**
The data model (`AIInterviewPrepRequirement`) has no field for user completion status. `deepDive` indicates whether AI-generated content exists, not whether the user has read it. There is no "mark as studied" action, no time-spent metric, no self-assessment. The graph cannot show progress because the backend does not track it. This is the most fundamental gap.

**Problem 4: Spatial layout is arbitrary and unstable.**
Requirements fan out in a 30-degree arc to the right of center. Topics extend further right. The entire graph is right-heavy -- the left half of the canvas is empty space. The layout is computed from array index order, not from any semantic grouping (e.g., difficulty, topic relatedness, priority). If the AI returns requirements in a different order on regeneration, the spatial arrangement changes, destroying any spatial memory the user built.

**Problem 5: Information density mismatch between graph and list views.**
The list view (rendered in the same `page.tsx` when `prepView === "list"`) shows: requirement title, source quote (italic), deep dive badge, question count (implicit via the clickable row), and study topic chips with deep dive coloring. The graph view shows: requirement title and "Deep dive ready" / question count. It loses the source quote entirely. The topic nodes show only the label -- no deep dive status text. A user switching from list to graph loses information.

**Problem 6: No hover or tooltip interactions.**
Nodes have `cursor: pointer` styling but no hover state beyond the implicit cursor change. There are no tooltips showing questions, source quotes, or deep dive previews. The only interaction is click-to-open-modal. This means the graph requires the same interaction pattern as the list (click to see details) but provides less at-a-glance information.

**Problem 7: Topic node text is truncated.**
Topic nodes have `maxWidth: 160`, `whiteSpace: nowrap`, `overflow: hidden`, `textOverflow: ellipsis`. Many study topics exceed 160px of text at 11px font size (e.g., "Microservices architecture patterns" or "TypeScript advanced type system"). Users see truncated labels and must click to discover what the topic actually is.

**Problem 8: The graph adds no value over the list for the primary use case.**
A user preparing for an interview follows a sequential workflow: pick a requirement, study the topics, review the questions, read the deep dive. This is inherently a drill-down linear flow. The graph's strength -- showing relationships and structure -- is underutilized because the data structure is a simple tree (center -> requirements -> topics) with no cross-links, no dependency edges, and no non-obvious relationships to reveal.

---

## 2. User Personas for Interview Prep

### Primary Persona: "The Active Preparer" -- EU Remote Job Seeker Preparing for a Specific Interview

**Name:** Katarina, 29, fullstack developer in Lisbon, Portugal.
**Situation:** She applied to a senior fullstack role at a fintech company via nomadically.work two days ago. She has a technical interview scheduled in 5 days. She generated the AI interview prep and now needs to systematically work through the 5 requirements and their study topics before her interview.

**What she needs from the graph:**
1. **Progress dashboard**: At a glance, how much of the prep has she completed? She wants to see "3 of 5 requirements studied, 9 of 15 topics reviewed" without counting nodes.
2. **Priority guidance**: Which requirement should she study first? The graph should suggest an order based on: (a) which topics she hasn't covered yet, (b) which requirements have the most questions (higher signal of interview importance), (c) which topics she marked as "weak" or "needs more study."
3. **Quick preview on hover**: When hovering over a requirement node, she wants to see the source quote from the job description and the list of questions -- without opening a modal that takes over the screen.
4. **Completion marking**: After studying a topic, she wants to mark it as done. This should visually change the node in the graph so she can see her remaining work shrink.
5. **Deep dive status at a glance**: She wants to see which topics have deep dive content generated (so she knows she can study them offline) vs. which require an API call (and therefore internet + wait time).
6. **Session continuity**: When she returns tomorrow, the graph should show exactly where she left off. Which topics did she mark as done? Which requirement was she in the middle of?

**Key frustration with current implementation:**
The graph looks the same whether she has studied nothing or everything. There is no visual reward for progress. She cannot tell what she has and hasn't reviewed without clicking every node.

---

### Secondary Persona: "The Career Explorer" -- Career Changer Mapping Skill Gaps

**Name:** Alexei, 34, transitioning from DevOps into platform engineering. He is based in Prague.
**Situation:** He has saved 3 applications on nomadically.work for platform engineering roles. He is not interviewing yet -- he is using the interview prep feature to understand what skills these roles actually require and where his gaps are. He generated prep for all 3 applications and wants to compare the requirement sets across them.

**What he needs from the graph:**
1. **Skill gap identification**: The graph should make it obvious which requirements appear across multiple applications (e.g., "Kubernetes orchestration" shows up in 3 of 3 preps) vs. which are unique to one role.
2. **Self-assessment overlay**: He wants to rate his confidence on each requirement (strong / moderate / weak) and see the graph color-code accordingly. Red nodes = weak areas to prioritize. Green nodes = strengths he can leverage in interviews.
3. **Cross-application comparison**: Ideally, a combined graph showing requirements from multiple applications, with shared topics linked. This is beyond current scope but informs the data model -- any progress/assessment data should be stored per-user-per-topic, not per-application.
4. **Learning path**: A suggested order of study that builds foundational topics before advanced ones. Currently all 15 topics are flat and unordered.

**Key frustration with current implementation:**
The graph is per-application with no cross-referencing. He must mentally compare 3 separate graphs. The study topics are flat pills with no difficulty or dependency ordering.

---

## 3. User Journey for Interview Prep

### Journey Map: Generating and Using Interview Prep

**Step 1: View application detail page (`/applications/[id]`)**
The user sees the application header (job title, company, status), job description card, and the Interview Prep card. If no AI prep exists, they see "No prep tracks linked yet" and a "Generate with AI" button. The button is disabled if no job description is saved.

- Friction point: If the user saved the application with a URL but no job description text, they must first paste the JD manually. There is no auto-extraction from the URL.

**Step 2: Generate AI prep (click "Generate with AI")**
The button shows "Generating..." while the mutation runs. On success, the page refetches and shows the AI-GENERATED PREP section with a summary and the list/graph toggle.

- Friction point: Generation can take 10-30 seconds. There is no progress indicator beyond the button text change. The user has no idea if it will take 5 seconds or 2 minutes.

**Step 3: View prep overview (default: list view)**
The user sees the summary text and 5 requirement cards. Each card shows: requirement title, source quote (if available), "Ready" badge (if deep dive generated), and study topic chips.

- Friction point: The user has 5 requirements x 3 topics = 15 items to study. There is no suggested order, no priority, no estimated time. The user must decide on their own where to start.

**Step 4: Click a requirement to explore it**
A modal dialog opens showing: requirement title, source quote (clickable to scroll to JD), interview questions list, study topic chips, and the deep dive section. If no deep dive exists, it auto-generates one (loading animation with "Generating deep-dive with DeepSeek Reasoner...").

- Friction point: The modal is up to 680px wide and 85vh tall. The deep dive content can be very long (DeepSeek Reasoner produces thorough responses). The user is now reading a long-form article inside a modal, which is a poor reading experience. They cannot resize, bookmark, or share the content.
- Friction point: The modal replaces the graph entirely. When the user closes the modal, they are back to the graph with no indication of which node they just visited.

**Step 5: Click a study topic chip (from within the requirement modal or from the graph)**
A second modal opens on top of the first (the `selectedStudyTopic` dialog). It shows: topic name, parent requirement name, and the study topic deep dive content (auto-generated if not present).

- Friction point: Stacked modals. The user now has the page -> requirement modal -> study topic modal. Closing the study topic modal returns to the requirement modal. Closing that returns to the page. Three layers of navigation in a modal-based system with no breadcrumb.

**Step 6: Close modals and return to graph**
The user closes all modals and is back at the graph (or list). Nothing has changed visually. There is no "studied" indicator. The user must remember mentally what they've reviewed.

### Where the graph view specifically fails in this journey

- **Step 3 (overview)**: The graph shows the same data as the list but with less detail and more effort to parse. Users default to list view because it is more scannable.
- **Step 4 (explore requirement)**: Clicking a graph node opens the same modal as clicking a list item. The graph provides no unique value at this step.
- **Step 6 (return)**: The graph cannot show session state. A list view could at least show "visited" styling. The graph has no mechanism for this.

### Where the graph COULD add unique value

- **Step 3 (overview)**: If the graph showed progress rings on each requirement node, completion percentages, color-coded readiness, and hover previews -- it would serve as a **dashboard** complementing the list's **detail view**. The graph should be the "how am I doing overall?" view. The list should be the "let me drill into specifics" view.
- **Step 4 (explore)**: Instead of opening a modal, clicking a requirement node could expand it inline in the graph -- showing questions and study topics as child nodes that animate into view (progressive disclosure). This leverages the spatial medium rather than fighting it.
- **Step 6 (return)**: The graph should update in real-time as the user completes topics. Nodes should visually transform (green checkmark, dimmed opacity, progress ring filling) to create a sense of accomplishment.

---

## 4. Information Architecture for the Graph

### Visual Hierarchy (Recommended Priority)

The graph should communicate the following information in this order of visual prominence:

1. **Progress / readiness** (highest prominence)
   - Overall completion: how many requirements / topics studied
   - Per-requirement completion ring or bar
   - Per-topic studied/not-studied state
   - Color system: green = studied/ready, yellow = in progress, gray = not started, red = flagged as weak

2. **Content availability** (medium prominence)
   - Has deep dive content been generated? (Indicates "can study now" vs. "needs generation")
   - Number of questions per requirement (indicates interview weight)
   - Source quote existence (indicates grounding quality)

3. **Structural relationships** (low prominence -- the topology is simple)
   - Which topics belong to which requirement (already shown by edges)
   - Center node = job title (anchor point)

### What should be visible at each interaction level

**At a glance (no interaction):**
- Requirement node: title (max 2 lines, not truncated), progress ring showing X/Y topics completed, question count badge, color-coded border (readiness state)
- Topic node: title (full text, wrapped to max 2 lines), studied/not-studied icon or strikethrough, deep dive available indicator (small icon)
- Center node: job title, overall progress summary ("3/5 ready")
- Edges: thickness or color encodes progress (studied requirements have thicker/green edges)

**On hover (lightweight, no layout change):**
- Requirement node tooltip: source quote from job description, list of question titles (first 3), deep dive preview (first 100 chars if available)
- Topic node tooltip: "Click to study" or "Studied on Feb 23" or "Deep dive available -- click to read"
- Edge hover: no action needed

**On click (primary interaction):**
- Requirement node click: expand inline to show questions and topic list within the graph canvas (collapsible accordion within the node, or a side panel that does not obscure the graph)
- Topic node click: open study topic content in a side panel (not a stacking modal) that keeps the graph visible at reduced width
- Center node click: toggle between "show all" and "focus mode" (highlight path to a specific requirement)

### Node Clustering and Layout Recommendations

**Current layout problem:** All 5 requirements fan out in a narrow arc (120 degrees) to the right of center. This creates:
- A right-heavy canvas where the left 40% is empty
- Overlapping topic nodes when requirements are at similar angles
- No semantic grouping

**Recommended layout: Radial with weighted spacing**
- Place the center node in the true center of the canvas
- Distribute requirements in a full 360-degree radial layout (not a half-arc)
- Space requirements by "study weight" -- requirements with more questions or lower readiness get more angular space
- Topics extend outward from each requirement in a tight cluster
- This uses the full canvas and creates a symmetric, memorable layout

**Alternative layout: Force-directed with semantic grouping**
- If cross-application topic linking is added later, a force-directed layout would naturally cluster related topics
- For now, a deterministic radial layout is more predictable and supports spatial memory

**Layout stability:**
- The layout algorithm should produce the same positions for the same input data. Currently it does (array-index-based angles), but the order depends on the AI generation, which is not guaranteed stable across regenerations. Consider sorting requirements alphabetically or by question count before layout to ensure consistency.

---

## 5. Design Principles for Interview Prep Graph

### Principle 1: Progressive Disclosure -- Show Less, Reveal More on Interaction

The current graph renders all 21 nodes at once. This is the most common mistake in graph visualization -- showing everything simultaneously guarantees that nothing is prominent.

**Application to this graph:**
- **Default state**: Show only the center node and 5 requirement nodes. Topic nodes are hidden.
- **On requirement click/hover**: Animate topic nodes into view for that requirement only. Other requirements' topics remain hidden (or dim to 20% opacity).
- **On topic click**: Expand the topic node to show content preview, or open a side panel.
- **"Show all" toggle**: For users who want the full bird's-eye view, provide a toggle that reveals all nodes. This is the current behavior but should be opt-in, not the default.

**Rationale:** A graph with 6 nodes (center + 5 requirements) is immediately scannable. A graph with 21 nodes requires zooming and panning. Start with the scannable version.

### Principle 2: Progress Visibility -- Make Study Completion Status the Primary Visual Signal

The most important question the graph should answer is: "How prepared am I for this interview?"

**Application to this graph:**
- Each requirement node shows a circular progress indicator (e.g., 2/3 topics studied)
- The center node shows overall progress (e.g., "60% ready" or "3/5 requirements covered")
- Color transitions: gray (not started) -> amber (in progress) -> green (all topics studied)
- Completed topics appear with a subtle checkmark icon overlay and slightly reduced opacity (pushing attention toward unstudied topics)
- Edge color follows progress: gray edges lead to unstudied areas, green edges lead to completed areas

**Backend requirement:** This requires a new field on the data model. Proposed additions:
- `AIInterviewPrepRequirement.userStatus`: enum (not_started | in_progress | completed)
- `AIStudyTopicDeepDive.studied`: boolean
- `AIStudyTopicDeepDive.studiedAt`: DateTime
- Or a separate `UserPrepProgress` type linked to the application

### Principle 3: Spatial Memory -- Consistent Layout So Users Remember Where Topics Are

Users return to the prep graph multiple times across study sessions. If the layout changes between visits, they lose the spatial map they built ("Kubernetes was in the top-right, system design was bottom-left").

**Application to this graph:**
- Sort requirements deterministically before layout (e.g., alphabetically by requirement title)
- Use a fixed radial position algorithm: requirement[0] always at 12 o'clock, requirement[1] at ~72 degrees clockwise, etc.
- Never re-layout on window resize -- only adjust zoom level
- If a requirement is added (regeneration with `force: true`), append it to the next available position rather than re-distributing all nodes
- Store node positions in local state (or even persist to backend) so that user-dragged positions are remembered

### Principle 4: Contextual Richness -- Show Relevant Snippets Without Overwhelming

The current nodes show titles only. The modals show everything. There is no middle ground.

**Application to this graph:**
- **Requirement nodes** should show:
  - Title (2 lines max, full text)
  - Progress indicator (ring or bar)
  - Question count badge (e.g., "5 Qs")
  - Truncated source quote on hover (tooltip, 1 line)
  - "Deep dive" icon if content exists
- **Topic nodes** should show:
  - Full title (wrapped, not truncated)
  - Studied status icon (checkmark, empty circle, or clock for "in progress")
  - Deep dive available indicator (book icon or similar)
- **Center node** should show:
  - Job title (potentially abbreviated)
  - Company name
  - Overall readiness score or progress fraction
  - Interview date if tracked (e.g., "Interview in 3 days")

### Principle 5: The Graph and List Serve Different Purposes -- Do Not Duplicate

The current implementation treats graph and list as two renderings of the same view, toggled by a button. This creates a dilemma: the list is always better for detail, so the graph feels redundant.

**Reframe the relationship:**
- **List view** = study mode. Sequential, detailed, optimized for reading and drilling into content. This is where the user spends 90% of their time.
- **Graph view** = dashboard mode. Spatial, visual, optimized for "where am I?" and "what's next?" assessment. This is where the user starts and returns to between study sessions.

**Practical implications:**
- The graph should NOT try to show all the information the list shows. Instead, it should show *different* information: progress, readiness, suggested next action, overall structure.
- The graph should have a "Study this" CTA on each node that switches to list view filtered to that requirement -- bridging the two views.
- The list view could show a compact progress bar at the top (derived from graph data) to maintain progress visibility even in list mode.

---

## 6. Specific Recommendations for Implementation

### Immediate improvements (no backend changes needed)

1. **Radial layout**: Distribute requirements in a full 360-degree circle, not a right-side-only arc. Topic nodes extend outward from each requirement.
2. **Hover tooltips**: Add a tooltip component that shows source quote + question count + deep dive preview on requirement hover. Show full topic name on topic hover.
3. **Full topic labels**: Remove `whiteSpace: nowrap` and `textOverflow: ellipsis` from topic nodes. Allow text wrapping to 2 lines within a wider node (200px instead of 160px).
4. **Deep dive visual distinction**: Use an icon (e.g., a small book or graduation cap) on nodes with deep dive content, in addition to the color change. Color alone is insufficient for accessibility.
5. **Visited state via local storage**: Track which nodes the user has clicked in `localStorage` keyed by application ID. Show visited nodes with a subtle visual change (e.g., a small dot or checkmark overlay). This is client-side only and requires no backend changes.
6. **Animated entry**: On switching to graph view, animate nodes in sequentially (center first, then requirements, then topics) to guide the eye and reduce initial cognitive load.

### Medium-term improvements (requires backend changes)

7. **Progress tracking fields**: Add `studied: Boolean` and `studiedAt: DateTime` to the `AIStudyTopicDeepDive` type. Add a `markStudyTopicStudied` mutation. Display progress rings on requirement nodes.
8. **Side panel instead of stacked modals**: Replace the modal-based drill-down with a side panel that slides in from the right, keeping the graph visible at 60% width. This maintains spatial context while showing detail.
9. **Progressive disclosure**: Default to showing only center + requirement nodes. Clicking a requirement animates its topic nodes into view. A "Show all" button reveals the full tree.
10. **Focus mode**: Clicking a requirement dims all other requirements and their topics to 20% opacity, highlighting only the selected requirement's branch. Clicking the center node or pressing Escape returns to the full view.

### Long-term improvements (new features)

11. **Cross-application topic linking**: For users with multiple applications, show shared requirements/topics across preps. This surfaces skill gap patterns.
12. **Self-assessment overlay**: Let users rate each requirement (strong/moderate/weak). Color-code the graph accordingly. This transforms the graph from a content map into a personalized study plan.
13. **Interview countdown integration**: If the user records an interview date on the application, the graph header shows "3 days until interview" and highlights the most critical unstudied topics.

---

## Appendix: Data Model Gaps for Graph Enhancement

| Gap | Current State | Proposed Addition | Impact on Graph |
|---|---|---|---|
| No user progress tracking | `deepDive` existence is the only "status" | Add `studied: Boolean`, `studiedAt: DateTime` to `AIStudyTopicDeepDive` | Enables progress rings, completion percentages, visited states |
| No self-assessment | No field for user confidence | Add `userConfidence: enum(strong, moderate, weak)` to `AIInterviewPrepRequirement` | Enables red/yellow/green color coding by user-assessed readiness |
| No study session tracking | No time or visit data | Add `lastViewedAt: DateTime` to requirement level | Enables "continue where you left off" and session-based progress |
| No topic difficulty ordering | `studyTopics` is an unordered string array | Add `difficulty: enum(foundational, intermediate, advanced)` to a structured topic type | Enables layout by difficulty (inner ring = foundational, outer = advanced) |
| No cross-application linking | Prep data is per-application only | Add a shared skill/topic entity that links across applications | Enables cross-application graph comparisons |
| No interview date | Application has no interview date field | Add `interviewDate: DateTime` to `Application` | Enables countdown display and urgency-based prioritization |

---

## Appendix: Current Component Structure Reference

- **Graph component**: `src/components/interview-prep-flow.tsx` (309 lines)
  - Custom nodes: `CenterNode`, `RequirementNode`, `TopicNode`
  - Layout: `buildGraph()` function, deterministic position calculation
  - Interaction: `onNodeClick` dispatches to parent callbacks
  - No hover handlers, no tooltips, no progress indicators

- **Parent page**: `src/app/applications/[id]/page.tsx` (1017 lines)
  - State: `prepView` toggle (list/graph), `selectedReq` modal, `selectedStudyTopic` modal
  - Mutations: `generateInterviewPrep`, `generateTopicDeepDive`, `generateStudyTopicDeepDive`
  - The graph is lazy-loaded via `React.lazy()`
  - Click handlers from graph nodes open the same modals as list item clicks

- **Data model**: `schema/applications/schema.graphql`
  - `AIInterviewPrep`: summary + requirements array + generatedAt
  - `AIInterviewPrepRequirement`: requirement + questions + studyTopics + studyTopicDeepDives + sourceQuote + deepDive
  - `AIStudyTopicDeepDive`: topic + deepDive (both strings, no metadata)
