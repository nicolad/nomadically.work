---
stepsCompleted: [1, 2, 3, 4, 5, 6]
status: complete
inputDocuments:
  - _bmad-output/planning-artifacts/research/technical-worker-cron-failures-observability-research-2026-02-23.md
date: 2026-02-23
author: Vadim
---

# Product Brief: nomadically.work — Deep Planner

<!-- Content will be appended sequentially through collaborative workflow steps -->

## Executive Summary

**Deep Planner** — a Cloudflare Worker powered by langchain-cloudflare and DeepSeek that autonomously executes BMAD-style structured planning workflows. Admin users assign complex problems via a tasks UI in the nomadically.work application, kick off the worker, and return to fully written BMAD planning artifacts (product briefs, architecture docs, stories) persisted in D1.

The system uses `langgraph-checkpoint-cloudflare-d1` to persist every iteration of multi-pass deep reasoning, enabling resume-on-failure and full audit trails. DeepSeek handles the bulk reasoning cheaply, following BMAD workflow step sequences (init → vision → users → scope → risks → completion) with self-critique and refinement loops at each stage.

---

## Core Vision

### Problem Statement

Complex planning work — product briefs, architecture decisions, story breakdowns — requires deep, uninterrupted thinking that competes with daily operational work. As a solo operator of nomadically.work, Vadim loses productive hours where structured planning could run autonomously in the background, producing first-draft artifacts ready for review.

### Problem Impact

- Planning work gets deferred indefinitely because it requires long focused sessions
- BMAD workflows are thorough but time-intensive when done interactively
- The existing worker infrastructure (7 workers, queues, D1) sits idle between cron runs
- langchain-cloudflare's free Workers AI tier and cheap DeepSeek reasoning are underutilized

### Why Existing Solutions Fall Short

- **Claude Code sessions** require interactive human input at every BMAD step
- **Cron workers** run fixed pipelines (ingest, classify) — they can't reason about open-ended problems
- **Trigger.dev tasks** handle job enhancement but have no planning/reasoning capability
- **No existing tool** combines BMAD-style structured workflows with autonomous multi-pass LLM iteration and D1 checkpoint persistence

### Proposed Solution

A **Python Cloudflare Worker** (`workers/deep-planner/`) using:

- **langchain-cloudflare** — `ChatCloudflareWorkersAI` for cheap first-pass reasoning, DeepSeek for deep refinement
- **langgraph-checkpoint-cloudflare-d1** — persist every planning iteration, enable resume-on-failure
- **BMAD workflow templates** — loaded as structured prompts, executed step-by-step with quality gates
- **Multi-pass depth** — each BMAD step gets: draft → self-critique → refine → validate against codebase constraints → finalize
- **Admin tasks UI** — new page in the Next.js app (admin-only) to create tasks, select BMAD workflow type, provide context, and kick off the worker
- **D1 task table** — stores task definitions, status, worker run IDs, and links to output artifacts
- **Deliverable** — fully written BMAD planning artifact (markdown) stored in D1 and viewable in the app

### Key Differentiators

- **BMAD-native** — not generic "think about X" but structured planning with quality gates, role personas, and step sequences baked in
- **Checkpoint-resilient** — D1 persistence means long-running plans survive worker restarts, timeouts, and failures
- **Cost-efficient** — Workers AI free tier for initial passes, DeepSeek for deep reasoning, no Claude API cost for bulk planning
- **Codebase-aware** — the planner can read project context (CLAUDE.md, schema, architecture) to ground its output in reality
- **Audit trail** — every iteration stored in D1, so you can see how the plan evolved across passes

---

## Target Users

### Primary Users

**Vadim — Solo Operator & Admin**

Solo technical founder running nomadically.work. Manages the full stack: infrastructure, AI pipelines, product planning, and feature development. Time-constrained during the day with operational work competing against strategic planning.

**Context:** Assigns deep planning tasks at end of day via the admin tasks UI. Returns next morning to review fully written BMAD artifacts. Needs confidence that the planner ran for hours, iterated deeply, and produced something worth reviewing — not a shallow first draft.

**Key behaviors:**
- Assigns 1 task before closing the laptop
- Expects the worker to run autonomously for hours with multi-pass refinement
- Reviews output next morning, either approves or kicks off another pass with feedback
- Trusts the system because D1 checkpoints show the full reasoning trail

### Secondary Users

N/A — single admin user system.

### User Journey

1. **Assign:** Open admin tasks page → select BMAD workflow type (product brief, architecture, stories) → provide problem description and context → hit "Start"
2. **Worker runs:** Deep Planner worker picks up the task, iterates for hours through BMAD steps with self-critique loops, checkpoints every pass to D1
3. **Morning review:** Open tasks page → see status "Complete" → read the generated artifact → approve, request revisions, or assign a new follow-up task
4. **Iteration:** If the artifact needs refinement, add feedback notes and re-kick — the planner resumes from the last checkpoint with the new context

---

## Success Metrics

- **Artifact usability:** >= 70% of generated BMAD artifact content is kept as-is or lightly edited (not rewritten from scratch)
- **Run completion rate:** >= 90% of Deep Planner tasks run to full completion without crashing or timing out

### Business Objectives

N/A — internal productivity tool for solo operator.

### Key Performance Indicators

| KPI | Target | Measurement |
|-----|--------|-------------|
| Artifact keep rate | >= 70% | Manual assessment on review |
| Run completion | >= 90% | D1 task status tracking (completed vs failed) |
| Passes per BMAD step | >= 3 | D1 checkpoint count per step |

---

## MVP Scope

### Core Features

1. **D1 task table** — `deep_planner_tasks` with columns: id, workflow_type, problem_description, context, status (pending/running/complete/failed), output_artifact (markdown text), checkpoint_count, created_at, updated_at
2. **Admin tasks UI** — admin-only page at `/admin/deep-planner` with: create task form (workflow type selector, problem description textarea, context textarea), task list with status badges, artifact viewer (rendered markdown)
3. **Deep Planner Python Worker** (`workers/deep-planner/`) — langchain-cloudflare with `ChatCloudflareWorkersAI` (free Workers AI models only, no paid APIs), executes product brief BMAD workflow, multi-pass per step (draft → self-critique → refine → finalize), `langgraph-checkpoint-cloudflare-d1` for persistence across hours-long runs
4. **Codebase context injection** — worker loads project context (CLAUDE.md, GraphQL schema, DB schema, architecture patterns) into the planning prompts so artifacts are grounded in the actual codebase
5. **Status tracking** — real-time status on tasks page (pending → running → complete/failed), checkpoint count showing iteration depth

### Out of Scope for MVP

- Multiple BMAD workflow types (architecture docs, stories) — MVP supports product brief only
- Re-kick with feedback (resume from checkpoint with revision notes)
- Advanced elicitation / party mode in autonomous execution
- Notifications (email/push on completion)
- DeepSeek or any paid LLM API — Workers AI free tier only
- BMAD agent personas (PM, architect, QA role-playing within the planner)

### MVP Success Criteria

- Worker completes a full product brief workflow without crashing (run completion >= 90%)
- Generated artifact is usable without full rewrite (keep rate >= 70%)
- Worker runs for 1+ hours sustained using D1 checkpoints
- All planning iterations persisted and auditable in D1

### Future Vision

- Support all BMAD workflow types (architecture, stories, epics, research)
- Multi-model routing: Workers AI for first pass, DeepSeek for deep refinement
- Feedback loop: re-kick with notes, planner resumes from last checkpoint
- BMAD agent personas: PM drafts, architect critiques, QA validates within the planner
- Cross-task learning: Vectorize memory (`langmem-cloudflare-vectorize`) learns from past planning runs
