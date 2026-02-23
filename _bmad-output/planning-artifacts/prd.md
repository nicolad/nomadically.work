---
stepsCompleted: [step-01-init, step-02-discovery, step-02b-vision, step-02c-executive-summary, step-03-success, step-04-journeys, step-05-domain, step-06-innovation, step-07-project-type, step-08-scoping, step-09-functional, step-10-nonfunctional, step-11-polish, step-12-complete]
status: complete
completedAt: 2026-02-23
classification:
  projectType: web_app + api_backend
  domain: scientific / AI-ML
  complexity: medium
  projectContext: brownfield
inputDocuments:
  - _bmad-output/planning-artifacts/product-brief-nomadically.work-2026-02-23.md
  - _bmad-output/planning-artifacts/research/technical-worker-cron-failures-observability-research-2026-02-23.md
workflowType: 'prd'
documentCounts:
  briefs: 1
  research: 1
  brainstorming: 0
  projectDocs: 0
  projectContext: 0
---

# Product Requirements Document - nomadically.work

**Author:** Vadim
**Date:** 2026-02-23

## Executive Summary

**Deep Planner** adds autonomous, long-running BMAD planning to nomadically.work. A Python Cloudflare Worker powered by langchain-cloudflare executes structured planning workflows — product briefs, architecture docs, stories — without human input. The operator assigns a problem with codebase context, the worker iterates for hours through BMAD steps with multi-pass self-critique, and delivers a finished artifact. All state checkpointed to D1 via `langgraph-checkpoint-cloudflare-d1`. Free Workers AI models only — zero API cost.

**Target user:** Solo operator (Vadim). Assigns a task before end of day, reviews the completed artifact next morning.

**Problem:** BMAD workflows produce high-quality planning artifacts but demand hours of interactive facilitation. That time competes with building. The planning either gets rushed or deferred indefinitely.

### What Makes This Special

The value of BMAD is the structured thinking process, not the human interaction. An LLM following BMAD's step-by-step quality gates with unlimited time produces deeper output than a human rushing through the same steps interactively. Deep Planner trades latency for depth — it has hours where you have minutes. D1 checkpointing makes multi-hour runs resilient to worker restarts. Codebase context injection (CLAUDE.md, schemas, architecture) grounds every artifact in reality rather than generic advice.

## Project Classification

- **Project Type:** Web app + API backend (Next.js admin UI + Python Cloudflare Worker)
- **Domain:** AI/ML — autonomous LLM workflow execution
- **Complexity:** Medium — novel architecture (multi-hour LLM execution with D1 checkpointing), no regulatory requirements
- **Project Context:** Brownfield — extending nomadically.work (7 existing workers, D1, GraphQL API, admin pages)

## Success Criteria

### User Success

- Assign a planning task in under 2 minutes (select workflow type, describe problem, provide context, hit Start)
- Return to a complete, structured BMAD artifact — not a wall of text, but properly sectioned markdown with executive summary, vision, users, scope
- Artifact is usable as-is or with light edits — not a rewrite job (>= 70% content kept)
- Full visibility into what the planner did: checkpoint count, passes per step, total run time

### Business Success

N/A — internal productivity tool. Success = planning work happens that otherwise wouldn't.

### Technical Success

- Worker runs for 1+ hours sustained without crashing (>= 90% completion rate)
- D1 checkpoints enable resume-on-failure — if a worker times out, the next invocation picks up from the last checkpoint
- Free Workers AI models produce coherent, structured output through BMAD steps
- Each BMAD step gets >= 3 passes (draft → critique → refine)
- Codebase context (CLAUDE.md, schemas) is successfully injected and reflected in the output

### Measurable Outcomes

| Metric | Target | How Measured |
|--------|--------|-------------|
| Artifact keep rate | >= 70% | Manual review |
| Run completion | >= 90% | D1 task status |
| Passes per step | >= 3 | D1 checkpoint count |
| Task assignment time | < 2 min | UX |
| Worker uptime per run | 1+ hours | Worker logs |

## User Journeys

### Journey 1: Vadim — Assign a Deep Planning Task (Success Path)

**Opening Scene:** It's 11pm. Vadim has been building all day — fixing workers, shipping features, reviewing PRs. He knows the resume matching system needs a proper architecture doc before he can build v2, but he hasn't had a focused hour to think about it all week. He opens `/admin/deep-planner`.

**Rising Action:** He clicks "New Task." Selects "Product Brief" as the workflow type. Types the problem: *"Design the resume matching v2 architecture — current system uses basic vector similarity, need semantic chunking, multi-resume comparison, and interview prep integration."* The codebase context auto-populates from CLAUDE.md and the DB schema. He hits "Start" and closes the laptop.

**Climax:** The Deep Planner worker picks up the task. It loads the BMAD product brief workflow, injects the codebase context, and begins. Step 1: init. Step 2: vision — draft, critique ("this doesn't account for the existing Vectorize integration"), refine, finalize. Step 3: users. Step 4: metrics. Each step gets 3+ passes. Checkpoints saved to D1 after every pass. The worker runs for 4 hours.

**Resolution:** Next morning, Vadim opens `/admin/deep-planner`. Status: Complete. 18 checkpoints. He reads the artifact — a structured product brief with executive summary, vision grounded in his actual DB schema, user personas, measurable success criteria, and a focused MVP scope that accounts for the existing resume-rag worker. He keeps 80% as-is, tweaks the scope section, and moves to architecture planning.

### Journey 2: Vadim — Worker Fails Mid-Run (Edge Case / Recovery)

**Opening Scene:** Vadim assigns a task at 10pm. The Deep Planner starts running, completes 3 BMAD steps (9 checkpoints), then the worker hits a Cloudflare CPU time limit and terminates.

**Rising Action:** The worker's error handler catches the timeout. Task status updates to "failed" in D1 with the last successful checkpoint recorded. The partial artifact (steps 1-3) is preserved in the output field.

**Climax:** Next morning, Vadim sees status "Failed — 9/18 checkpoints." He can read the partial output and see exactly where it stopped. He hits "Retry" — the worker resumes from checkpoint 9 via `langgraph-checkpoint-cloudflare-d1`, picks up at step 4, and continues.

**Resolution:** After the retry completes, Vadim has the full artifact. The D1 audit trail shows the failure point, the resume, and the final completion. He learns that certain complex prompts need shorter steps to stay within CPU limits.

### Journey 3: Vadim — Admin Monitoring (Operations)

**Opening Scene:** Vadim has been using Deep Planner for a week. He has 5 completed tasks and 1 running.

**Rising Action:** He opens `/admin/deep-planner` and sees the task list: status badges (complete/running/failed), checkpoint counts, timestamps. He clicks the running task — sees it's on step 4 with 11 checkpoints so far, started 2 hours ago.

**Climax:** He scrolls through completed tasks, reading the artifacts inline. He notices one task produced a weak output — the problem description was too vague. He mentally notes to be more specific next time.

**Resolution:** The tasks page becomes his planning dashboard. He can see his planning velocity — how many artifacts produced per week, completion rates, average checkpoint depth.

### Journey Requirements Summary

| Journey | Capabilities Revealed |
|---------|----------------------|
| Success Path | Task creation form, workflow type selector, codebase context injection, artifact viewer, status tracking |
| Failure/Recovery | Error handling, checkpoint persistence, retry from last checkpoint, partial artifact display, failure diagnostics |
| Admin Monitoring | Task list with status badges, checkpoint progress, inline artifact reading, historical task browsing |

## Domain-Specific Requirements

### Runtime Constraints

- **Durable Objects** for long-lived execution — DO handles the multi-hour BMAD workflow loop, hibernates between Workers AI calls, maintains state across the full run
- **Workers AI rate limits** — free tier has per-minute request caps. BMAD workflow generates ~54+ LLM calls (6 steps x 3 passes x ~3 prompts). Build in backoff/pacing between calls to stay within limits
- **D1 write limits** — 100K writes/day free tier. Each checkpoint is 1+ writes. Deep Planner tasks well within budget
- **Pyodide memory** — 128MB ceiling. Must validate that langchain-cloudflare + langgraph + pydantic fit within the Python-on-Workers memory budget
- **Subrequest limits** — 1000 per invocation. Each Workers AI call and D1 query counts. Durable Object resets this per alarm/request cycle

### Architecture Constraint: Durable Objects

- Regular Worker receives task creation HTTP request, instantiates/wakes a Durable Object by task ID
- DO runs the BMAD workflow loop: execute step → call Workers AI → checkpoint to D1 → sleep/alarm → next step
- DO hibernation between LLM calls keeps costs at zero when waiting
- DO alarm API schedules next step execution — enables pacing and rate limit compliance
- If DO crashes, next alarm or HTTP request resumes from last D1 checkpoint via `langgraph-checkpoint-cloudflare-d1`

### Risk Mitigations

| Risk | Mitigation |
|------|-----------|
| Workers AI rate limit hit | Exponential backoff + pacing between calls (e.g., 2s delay between prompts) |
| Pyodide memory overflow | Profile langchain-cloudflare import chain; strip unused modules; test with full BMAD workflow |
| DO eviction mid-run | D1 checkpoints + alarm-based resume — DO state is never the source of truth, D1 is |
| Workers AI model quality | Validate output quality per BMAD step; if free models produce garbage, escalate to DeepSeek (post-MVP) |
| D1 write contention | Single writer (one DO per task) — no contention by design |
| Workers AI output quality too low | Swap to DeepSeek (paid) post-MVP; or use Workers AI for drafts, DeepSeek for critique passes |
| Pyodide + langchain-cloudflare too heavy | Move to TypeScript worker with direct Workers AI REST API (drop LangChain) |
| DO alarm pacing too slow | Batch multiple LLM calls per alarm cycle; accept longer runs |
| Autonomous BMAD produces incoherent artifacts | Add explicit coherence validation step after each BMAD stage; halt and report if quality drops |

## Innovation & Novel Patterns

### Detected Innovation Areas

1. **Autonomous structured methodology execution** — BMAD workflows designed for human-AI collaboration, repurposed for fully autonomous LLM execution. The methodology's quality gates (step sequences, self-critique, validation) replace human judgment rather than requiring it.
2. **Hours-long LLM reasoning on serverless edge** — Durable Objects + LangGraph D1 checkpointing enable multi-hour autonomous reasoning on Cloudflare's free tier. Novel combination: DO hibernation for cost-zero waiting + D1 checkpoints for crash resilience + Workers AI for zero-cost inference.
3. **Depth-first AI planning** — deliberate inversion of the "fast response" LLM product pattern. Deep Planner optimizes for iteration depth (3+ passes per step, hours of runtime) rather than latency. Time is the feature, not the cost.

### Market Context & Competitive Landscape

- No existing tool combines structured planning methodology + autonomous LLM execution + serverless long-running compute
- AI planning tools (ChatGPT, Claude, Cursor) optimize for interactive speed — single-pass, seconds to minutes
- BMAD Method is open-source but designed for interactive use — no autonomous execution mode exists
- Cloudflare's langchain-cloudflare is new (April 2025) — the DO + LangGraph + D1 checkpoint combination is unexplored territory

### Validation Approach

- **Proof of concept:** Single BMAD product brief workflow running in a DO with Workers AI + D1 checkpoints
- **Quality gate:** Compare autonomous output vs. interactive BMAD output for the same problem — target 70% content keep rate
- **Runtime validation:** Confirm DO + alarm-based pacing can sustain 1+ hour runs within free tier limits

## Web App + API Backend Specific Requirements

### Project-Type Overview

Deep Planner adds two components to the existing nomadically.work stack: (1) an admin UI page within the Next.js App Router SPA, and (2) a Python Cloudflare Worker with Durable Object. The admin UI communicates via GraphQL mutations/queries through the existing Apollo Server endpoint.

### Technical Architecture Considerations

**Frontend (Admin UI):**
- New page at `/admin/deep-planner` within existing Next.js 16 App Router
- Admin-only — Clerk auth guard (`isAdminEmail()`)
- No SEO, no public access, no accessibility beyond admin use
- Polling for status updates (no WebSocket/SSE needed for MVP)
- Radix UI components consistent with existing admin pages

**API Layer (GraphQL):**
- `createDeepPlannerTask` mutation — accepts workflow_type, problem_description, context; triggers the worker; returns task ID
- `deepPlannerTasks` query — returns task list with status, checkpoint_count, timestamps
- `deepPlannerTask(id)` query — returns single task with full output_artifact markdown
- Resolvers in `src/apollo/resolvers/deep-planner.ts`
- Schema in `schema/deep-planner/schema.graphql`
- Admin guard on all operations

**Worker (Deep Planner):**
- Python Cloudflare Worker (`workers/deep-planner/`) with Durable Object
- Triggered via HTTP POST from GraphQL mutation (resolver calls worker URL)
- Worker receives task ID, DO handles execution
- D1 binding for task table + checkpoints
- Workers AI binding for LLM calls

### Implementation Considerations

- GraphQL schema + codegen (`pnpm codegen`) after adding deep-planner schema
- Drizzle schema update for `deep_planner_tasks` table + migration
- Worker wrangler config: `wrangler.deep-planner.toml` with D1 binding, Workers AI binding, Durable Object binding
- Admin UI follows existing patterns: `src/app/admin/deep-planner/page.tsx`
- Apollo hooks generated for mutations/queries

## Project Scoping & Phased Development

### MVP Strategy & Philosophy

**MVP Approach:** Problem-solving MVP — prove the core loop works (assign task → worker runs for hours → review artifact). No users to acquire, no market to validate. The only question is: does the autonomous BMAD execution produce usable output?

**Resource Requirements:** Solo developer (Vadim). Python + TypeScript. Cloudflare Workers + D1 + Workers AI infrastructure already in place.

### MVP Feature Set (Phase 1)

**Core User Journey Supported:** Journey 1 (assign and review success path)

**Must-Have Capabilities:**
1. `deep_planner_tasks` D1 table + Drizzle schema
2. GraphQL schema, mutations (`createDeepPlannerTask`), queries (`deepPlannerTasks`, `deepPlannerTask`)
3. Admin UI at `/admin/deep-planner` — create form, task list, artifact viewer
4. Python Worker + Durable Object — BMAD product brief workflow, multi-pass, Workers AI (free), D1 checkpoints
5. Codebase context injection (CLAUDE.md, schemas)
6. Status polling from admin UI

### Post-MVP Features

**Phase 2 (Growth):**
- Journey 2 support: retry from checkpoint on failure
- Multiple BMAD workflow types (architecture, stories, research)
- DeepSeek integration for deep refinement passes
- BMAD agent personas (PM, architect, QA roles)

**Phase 3 (Expansion):**
- Cross-task learning via `langmem-cloudflare-vectorize`
- Auto-suggest tasks from codebase changes
- Full BMAD pipeline: discovery → planning → stories → specs, all autonomous
- Feedback loop: re-kick with revision notes

### Risk Mitigation Strategy

**Technical Risks:**
- *Riskiest assumption:* Workers AI free models produce coherent structured planning output across 6+ BMAD steps. **Mitigation:** Build PoC with one BMAD step first; validate output quality before building full pipeline.
- *DO + Pyodide stability:* Multi-hour DO runs with Python are unexplored. **Mitigation:** If Pyodide is too heavy, fall back to TypeScript worker with direct Workers AI REST API.

**Market Risks:** N/A — internal tool, no market validation needed.

**Resource Risks:** Solo dev. **Contingency:** If full BMAD workflow is too complex for MVP, start with a simplified 3-step workflow (vision → scope → summary) instead of the full 6-step BMAD product brief.

## Functional Requirements

### Task Management

- FR1: Admin can create a deep planner task by specifying workflow type, problem description, and context
- FR2: Admin can view a list of all deep planner tasks with their current status
- FR3: Admin can view a single task's full output artifact as rendered markdown
- FR4: Admin can see checkpoint count and timestamps for each task
- FR5: System assigns "pending" status to newly created tasks

### Workflow Execution

- FR6: System can execute a BMAD product brief workflow autonomously without human input
- FR7: System executes each BMAD step through multiple passes (draft → self-critique → refine → finalize)
- FR8: System injects codebase context (CLAUDE.md, GraphQL schema, DB schema) into planning prompts
- FR9: System uses free Workers AI models for all LLM inference
- FR10: System paces LLM calls to stay within Workers AI rate limits

### State Persistence

- FR11: System checkpoints workflow state to D1 after each pass
- FR12: System can resume workflow execution from the last checkpoint after failure
- FR13: System persists partial output artifacts when a task fails mid-execution
- FR14: System tracks checkpoint count per task for audit visibility

### Status Tracking

- FR15: System updates task status through lifecycle states (pending → running → complete → failed)
- FR16: Admin can poll for task status updates from the admin UI
- FR17: System records failure reason when a task fails
- FR18: System records total run time for completed tasks

### Authentication & Authorization

- FR19: Only admin users can access the deep planner UI and API operations
- FR20: All GraphQL mutations and queries for deep planner require admin email verification

### Output Generation

- FR21: System produces a structured markdown artifact following BMAD product brief template format
- FR22: Output artifact contains properly sectioned content (executive summary, vision, users, scope, metrics)
- FR23: Output artifact reflects codebase-specific context (actual schemas, architecture patterns, existing infrastructure)

## Non-Functional Requirements

### Performance

- NFR1: Individual Workers AI calls complete within 30 seconds (model inference timeout)
- NFR2: D1 checkpoint writes complete within 2 seconds per checkpoint
- NFR3: DO alarm pacing allows at least 10 LLM calls per minute while staying within Workers AI free tier rate limits
- NFR4: Full BMAD product brief workflow completes within 6 hours (target: 2-4 hours)
- NFR5: Admin UI task list query returns within 1 second

### Reliability

- NFR6: No workflow progress is lost on DO eviction — D1 is the single source of truth
- NFR7: Worker resumes from last D1 checkpoint within 1 alarm cycle after failure
- NFR8: Partial artifacts are preserved and readable when a task fails mid-execution
- NFR9: Task status accurately reflects current state (no stale "running" status on crashed tasks)
- NFR10: System handles Workers AI temporary unavailability with retry + backoff (max 3 retries per call)

### Integration

- NFR11: Worker uses Cloudflare-native bindings only (D1 binding, Workers AI binding, DO binding) — no external HTTP dependencies for core execution
- NFR12: GraphQL mutations trigger the worker via HTTP POST to the worker URL — standard Cloudflare Worker routing
- NFR13: Codebase context files are bundled with the worker at deploy time (not fetched at runtime)
