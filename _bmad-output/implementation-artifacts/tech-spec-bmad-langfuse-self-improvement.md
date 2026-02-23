---
title: 'BMAD Langfuse Self-Improvement Pipeline'
slug: 'bmad-langfuse-self-improvement'
created: '2026-02-23'
status: 'completed'
stepsCompleted: [1, 2, 3, 4]
tech_stack: ['python', 'langfuse', 'anthropic', 'claude-haiku']
files_to_modify: ['.claude/hooks/stop_hook.py', '.claude/hooks/improvement_agent.py', 'scripts/build-golden-datasets.py', 'scripts/upload-bmad-prompts.py', 'scripts/analyze-traces.py']
code_patterns: ['fail-open imports', 'atomic file writes', 'lock-protected queues', 'JSONL transcript parsing', 'Langfuse REST API (Basic Auth)', 'Langfuse scores API (createScore)']
test_patterns: ['manual verification against Langfuse Cloud dashboard']
---

# Tech-Spec: BMAD Langfuse Self-Improvement Pipeline

**Created:** 2026-02-23

## Overview

### Problem Statement

The existing stop hook traces Claude Code sessions to Langfuse Cloud and scores them generically across 4 dimensions (task_completion, tool_efficiency, skill_adherence, routing_accuracy), but it has no awareness of BMAD workflows. It doesn't tag traces by BMAD workflow type, doesn't score BMAD-specific output quality (PRDs, architecture docs, code reviews), doesn't build golden datasets for regression testing, doesn't manage BMAD agent prompts in Langfuse, and doesn't provide analysis tooling. The improvement agent referenced by the stop hook (`CC_AUTO_IMPROVE`) doesn't exist yet.

### Solution

Extend the existing stop hook with BMAD workflow detection and specialized scorers. Add standalone scripts for golden dataset building, BMAD prompt versioning in Langfuse, and trace analysis. Create the improvement agent that the stop hook already references.

### Scope

**In Scope:**
1. BMAD workflow tagging in `stop_hook.py` — detect `/create-prd`, `/dev-story`, `/code-review`, etc. from transcripts and tag traces
2. BMAD-specific LLM-as-judge scorers in the stop hook — PRD quality, architecture quality, code review quality (run automatically when BMAD workflow detected)
3. Golden dataset building script — collect best/worst outputs into Langfuse datasets
4. BMAD agent prompt versioning script — upload BMAD agent system prompts to Langfuse for version control
5. Trace analysis script (`analyze-traces.py`) — tool usage, session patterns, BMAD workflow stats
6. Improvement agent (`improvement_agent.py`) — spawned by stop hook on low scores, generates improvement suggestions

**Out of Scope:**
- Self-hosting Langfuse (using Langfuse Cloud)
- Cursor/Windsurf integration
- Changes to the existing `src/langfuse/` TypeScript client
- A/B testing automation (can be done manually with existing `pickAbLabel`)

## Context for Development

### Codebase Patterns

- **Stop hook fail-open:** All imports wrapped in `try/except` with `sys.exit(0)` — hook must never block Claude Code
- **Atomic file writes:** temp file + `os.replace()` for POSIX-safe queue management
- **Lock-protected queue:** `fcntl.flock` on `improvement_queue.lock` for concurrent safety
- **Langfuse Cloud:** Default host `https://cloud.langfuse.com`, auth via `LANGFUSE_PUBLIC_KEY` + `LANGFUSE_SECRET_KEY`
- **Scorer model:** Claude Haiku (`claude-haiku-4-5-20251001`) for cost-efficient LLM-as-judge
- **Transcript format:** JSONL, one JSON object per line. Lines have `type` field (`user`, `assistant`, `system`, `progress`). User messages contain `<command-name>` XML tags for slash commands. Assistant messages contain `tool_use` blocks (including `Skill` tool invocations for BMAD workflows).
- **Existing Langfuse scoring:** `src/langfuse/scores.ts` provides `createScore()` with NUMERIC/CATEGORICAL/BOOLEAN types — this is the TS API; the stop hook uses the Python SDK's `lf.score_current_trace()`.
- **BMAD agent personas:** 9 agents (PM John, Architect Winston, Dev Amelia, QA Quinn, Analyst Mary, SM Bob, UX Sally, Tech Writer, BMad Master) with distinct system prompts in `_bmad/bmm/agents/` and `_bmad/core/agents/`.
- **BMAD outputs:** PRDs, architecture docs, tech specs land in `_bmad-output/planning-artifacts/` and `_bmad-output/implementation-artifacts/`.

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `.claude/hooks/stop_hook.py` | Main stop hook — extend with BMAD detection + specialized scorers |
| `.claude/settings.json` | Hook registration — already configured, no changes needed |
| `src/langfuse/index.ts` | TS Langfuse client — reference for API patterns (not modified) |
| `src/langfuse/scores.ts` | TS scoring API — reference for score types (not modified) |
| `src/observability/prompts.ts` | Prompt management patterns — reference (not modified) |
| `_bmad/bmm/config.yaml` | BMAD module config (project_name, user_name, etc.) |
| `_bmad/bmm/agents/*.md` | BMAD agent system prompts — source for prompt versioning |
| `_bmad/core/agents/*.md` | Core agent system prompts (BMad Master) |
| `_bmad/_config/agent-manifest.csv` | Registry of all BMAD agents |
| `_bmad-output/` | Example BMAD outputs (PRDs, tech specs) for golden datasets |

### Technical Decisions

1. **All new code is Python** — matches existing stop hook, uses same `langfuse` and `anthropic` packages
2. **Scorers run inside stop hook** — automatic on every session, not standalone scripts
3. **Haiku for all scoring** — cost-efficient; each session scores with ~500 tokens max
4. **BMAD detection strategy:** Scan transcript for both (a) `<command-name>` tags in user messages and (b) `Skill` tool_use blocks with BMAD skill names in assistant messages
5. **Improvement agent as subprocess** — already wired in stop hook via `CC_AUTO_IMPROVE` env var
6. **Langfuse REST API for scripts** — use `langfuse` Python SDK for datasets, prompts, traces
7. **BMAD workflow → scorer mapping:** Only certain workflows produce scoreable outputs (PRD, architecture, code review). Others (dev-story, quick-dev) just get tagged, not specially scored.

## Implementation Plan

### Tasks

- [x] Task 1: Add BMAD workflow detection to `stop_hook.py`
  - File: `.claude/hooks/stop_hook.py`
  - Action: Add `detect_bmad_workflows()` function that scans transcript messages for:
    - `<command-name>` tags in user message content (regex: `<command-name>([^<]+)</command-name>`)
    - `Skill` tool_use blocks in assistant content where `input.skill` starts with `bmad-`
  - Returns: `list[str]` of detected workflow tags (e.g., `["bmad:create-prd", "bmad:code-review"]`)
  - Mapping dict (add as module-level constant):
    ```python
    BMAD_WORKFLOWS = {
        "bmad-bmm-create-prd": "bmad:create-prd",
        "bmad-bmm-create-product-brief": "bmad:create-product-brief",
        "bmad-bmm-create-architecture": "bmad:create-architecture",
        "bmad-bmm-create-epics-and-stories": "bmad:create-epics",
        "bmad-bmm-create-ux-design": "bmad:create-ux-design",
        "bmad-bmm-dev-story": "bmad:dev-story",
        "bmad-bmm-code-review": "bmad:code-review",
        "bmad-bmm-sprint-planning": "bmad:sprint-planning",
        "bmad-bmm-sprint-status": "bmad:sprint-status",
        "bmad-bmm-create-story": "bmad:create-story",
        "bmad-bmm-quick-spec": "bmad:quick-spec",
        "bmad-bmm-quick-dev": "bmad:quick-dev",
        "bmad-bmm-retrospective": "bmad:retrospective",
        "bmad-bmm-correct-course": "bmad:correct-course",
        "bmad-bmm-qa-generate-e2e-tests": "bmad:qa-e2e-tests",
        "bmad-bmm-document-project": "bmad:document-project",
        "bmad-bmm-generate-project-context": "bmad:generate-context",
        "bmad-brainstorming": "bmad:brainstorming",
        "bmad-party-mode": "bmad:party-mode",
    }
    ```
  - Notes: Also detect via `/bmad-bmm-*` in `<command-name>` tags. Deduplicate results.

- [x] Task 2: Add BMAD-specific scorers to `stop_hook.py`
  - File: `.claude/hooks/stop_hook.py`
  - Action: Add three scorer prompt constants and a `score_bmad_output()` function:
    - `BMAD_PRD_SCORE_PROMPT` — scores completeness, clarity, actionability, consistency (0.0–1.0 each)
    - `BMAD_ARCH_SCORE_PROMPT` — scores prd_alignment, feasibility, scalability, completeness (0.0–1.0 each)
    - `BMAD_CODE_REVIEW_SCORE_PROMPT` — scores thoroughness, false_positive_rate, actionability, spec_compliance (0.0–1.0 each)
  - Mapping: `BMAD_SCORER_MAP` dict maps workflow tags to their scorer prompt:
    ```python
    BMAD_SCORER_MAP = {
        "bmad:create-prd": BMAD_PRD_SCORE_PROMPT,
        "bmad:create-product-brief": BMAD_PRD_SCORE_PROMPT,
        "bmad:create-architecture": BMAD_ARCH_SCORE_PROMPT,
        "bmad:code-review": BMAD_CODE_REVIEW_SCORE_PROMPT,
    }
    ```
  - `score_bmad_output(summary, workflow_tag)` function:
    - Looks up scorer prompt from `BMAD_SCORER_MAP`
    - If no specialized scorer, returns `None` (falls through to generic scorer)
    - Calls Haiku with the last assistant message as the output to evaluate
    - Returns dict of dimension scores (same format as existing `score_session`)
  - Notes: Each prompt must request JSON-only response. Reuse `_strip_markdown_fences()` and `_truncate_summary_for_prompt()`.

- [x] Task 3: Wire BMAD detection and scoring into `main()` in `stop_hook.py`
  - File: `.claude/hooks/stop_hook.py`
  - Action: Modify `main()` to:
    1. After `build_session_summary()`, call `detect_bmad_workflows(msgs)`
    2. Add detected workflow tags to the `tags` list in `emit_to_langfuse()` call
    3. Add `bmad_workflows` to trace metadata
    4. For each detected workflow with a specialized scorer, call `score_bmad_output()` and emit those scores via `lf.score_current_trace()` with `name=f"bmad-{dim}"` prefix
    5. Include BMAD scores in the low-score threshold check (use min of all scores, generic + BMAD)
  - Notes: Must not break existing generic scoring. BMAD scores are additive — a session gets both generic scores AND BMAD-specific scores if a BMAD workflow was detected.

- [x] Task 4: Update `emit_to_langfuse()` to accept BMAD tags and scores
  - File: `.claude/hooks/stop_hook.py`
  - Action: Extend `emit_to_langfuse()` signature to accept:
    - `bmad_tags: list[str]` — added to trace tags
    - `bmad_scores: Optional[Dict]` — additional BMAD-specific scores to emit
  - Add BMAD tags to the `tags` list in `propagate_attributes()`
  - Emit BMAD scores as additional `lf.score_current_trace()` calls with `name` prefixed by `bmad-` (e.g., `bmad-prd-completeness`, `bmad-prd-clarity`)

- [x] Task 5: Create `improvement_agent.py`
  - File: `.claude/hooks/improvement_agent.py`
  - Action: Create the improvement agent that processes the improvement queue:
    1. Read `~/.claude/state/improvement_queue.json`
    2. For each queued session:
       - Load the transcript from `transcript_path`
       - Build summary (reuse `build_session_summary` logic — import from stop_hook or duplicate)
       - Send to Claude Sonnet with an improvement prompt that asks:
         - What went wrong (based on low scores)?
         - What specific changes to system prompts/agent instructions would fix it?
         - Concrete suggestions (not vague "improve X")
       - Write suggestions to `~/.claude/state/improvements/{session_id}.json`
       - Log the improvement to Langfuse as a new trace with tag `improvement-agent`
    3. Remove processed sessions from the queue (atomic write)
  - Notes: Use Sonnet (not Haiku) for improvement generation — needs deeper reasoning. Fail-open pattern. Guard against empty queue. Import `LANGFUSE_*` env vars.

- [x] Task 6: Create `scripts/build-golden-datasets.py`
  - File: `scripts/build-golden-datasets.py`
  - Action: Script that queries Langfuse for BMAD traces and builds golden datasets:
    1. Fetch all traces tagged with `bmad:create-prd`, `bmad:create-architecture`, `bmad:code-review`
    2. Sort by score (highest → golden examples, lowest → anti-examples)
    3. Create/update Langfuse datasets:
       - `bmad-prd-golden-set` — top-scored PRD outputs
       - `bmad-arch-golden-set` — top-scored architecture outputs
       - `bmad-review-golden-set` — top-scored code review outputs
    4. Each dataset item includes: `input` (user request), `expected_output` (assistant output), `metadata` (scores, trace_id)
  - CLI: `python3 scripts/build-golden-datasets.py [--min-score 0.8] [--max-items 50] [--workflow bmad:create-prd]`
  - Notes: Uses Langfuse Python SDK (`langfuse.create_dataset()`, `langfuse.create_dataset_item()`). Idempotent — skips already-added trace_ids.

- [x] Task 7: Create `scripts/upload-bmad-prompts.py`
  - File: `scripts/upload-bmad-prompts.py`
  - Action: Script that reads BMAD agent system prompts from `_bmad/` and uploads to Langfuse as versioned prompts:
    1. Scan `_bmad/bmm/agents/*.md` and `_bmad/core/agents/*.md`
    2. For each agent file, extract the system prompt content
    3. Upload to Langfuse as `bmad-agent-{name}` prompt (e.g., `bmad-agent-pm`, `bmad-agent-architect`)
    4. Label as `production` by default
    5. Skip if content matches current Langfuse version (no unnecessary versions)
  - CLI: `python3 scripts/upload-bmad-prompts.py [--label production] [--dry-run]`
  - Notes: Uses Langfuse REST API for prompt creation. Reads frontmatter from agent files for metadata.

- [x] Task 8: Create `scripts/analyze-traces.py`
  - File: `scripts/analyze-traces.py`
  - Action: Script that analyzes Langfuse traces and produces reports:
    1. Fetch traces from Langfuse (filterable by tags, date range)
    2. Produce 5 analyses:
       - **Tool usage distribution** — which tools Claude uses most across sessions
       - **Session turn distribution** — histogram of turns per session
       - **BMAD workflow frequency** — which BMAD workflows run most often
       - **Score trends** — average scores over time (generic + BMAD-specific)
       - **Low-score patterns** — common failure_types from scoring
    3. Output as formatted table (default) or JSON (`--json` flag)
  - CLI: `python3 scripts/analyze-traces.py [--days 30] [--tag bmad:create-prd] [--json]`
  - Notes: Uses Langfuse Python SDK for trace/score fetching. Pagination for large datasets.

### Acceptance Criteria

- [ ] AC 1: Given a session where `/bmad-bmm-create-prd` was invoked, when the stop hook runs, then the Langfuse trace has tags `["claude-code", "main", "unknown", "bmad:create-prd"]` and metadata includes `"bmad_workflows": ["bmad:create-prd"]`
- [ ] AC 2: Given a session with a BMAD PRD workflow, when the stop hook scores it, then Langfuse shows both generic scores (task_completion, tool_efficiency, skill_adherence, routing_accuracy) AND BMAD-specific scores (bmad-prd-completeness, bmad-prd-clarity, bmad-prd-actionability, bmad-prd-consistency)
- [ ] AC 3: Given a session with `/bmad-bmm-dev-story` (no specialized scorer), when the stop hook runs, then the trace is tagged `bmad:dev-story` but only generic scores are applied (no BMAD-specific scores)
- [ ] AC 4: Given a session with no BMAD workflows, when the stop hook runs, then behavior is identical to current (no BMAD tags, no BMAD scores) — backward compatible
- [ ] AC 5: Given `CC_AUTO_IMPROVE=true` and a low-scoring BMAD session in the queue, when improvement_agent.py runs, then it produces a suggestions file at `~/.claude/state/improvements/{session_id}.json` with concrete improvement recommendations and logs a trace to Langfuse tagged `improvement-agent`
- [ ] AC 6: Given 10+ BMAD PRD traces with scores in Langfuse, when `build-golden-datasets.py --workflow bmad:create-prd --min-score 0.8` runs, then a `bmad-prd-golden-set` dataset is created/updated in Langfuse with high-scoring items
- [ ] AC 7: Given BMAD agent files in `_bmad/bmm/agents/`, when `upload-bmad-prompts.py` runs, then each agent's system prompt appears in Langfuse as a versioned prompt named `bmad-agent-{name}` with label `production`
- [ ] AC 8: Given traces in Langfuse, when `analyze-traces.py --days 7` runs, then it prints a formatted report with tool usage, turn distribution, BMAD workflow frequency, score trends, and low-score patterns
- [ ] AC 9: Given the stop hook encounters a Langfuse API error during BMAD scoring, when the error occurs, then it logs the error and continues (fail-open) — never blocks Claude Code

## Additional Context

### Dependencies

- `langfuse` Python package (already installed for stop hook)
- `anthropic` Python package (already installed for stop hook)
- Langfuse Cloud account with API keys (already configured in env)
- No new pip packages required

### Testing Strategy

- **Stop hook (Tasks 1–4):** Manually run a BMAD workflow (e.g., `/bmad-bmm-create-prd`), verify in Langfuse Cloud that the trace has BMAD tags and both generic + BMAD-specific scores
- **Improvement agent (Task 5):** Set `CC_AUTO_IMPROVE=true`, artificially enqueue a low-scoring session, run `python3 ~/.claude/hooks/improvement_agent.py`, verify suggestions file and Langfuse trace
- **Golden datasets (Task 6):** After accumulating 5+ scored BMAD traces, run `python3 scripts/build-golden-datasets.py`, verify dataset in Langfuse dashboard
- **Prompt versioning (Task 7):** Run `python3 scripts/upload-bmad-prompts.py --dry-run` first, then without `--dry-run`, verify prompts in Langfuse
- **Analysis (Task 8):** Run `python3 scripts/analyze-traces.py --days 7`, verify output format and accuracy against Langfuse dashboard

### Notes

- The stop hook already has `CC_AUTO_IMPROVE` env var check and subprocess spawn logic for `improvement_agent.py` at `~/.claude/hooks/improvement_agent.py`
- The improvement queue (`~/.claude/state/improvement_queue.json`) is already implemented with atomic writes
- 17+ BMAD workflows exist but only 3 produce outputs worth specialized scoring: create-prd/create-product-brief (PRD quality), create-architecture (architecture quality), code-review (review quality)
- Other workflows (dev-story, quick-dev, sprint-planning, etc.) benefit from tagging but use the existing generic scorer
- BMAD slash commands in transcripts: user messages contain `<command-name>/bmad-bmm-create-prd</command-name>` tags; assistant responses contain `Skill` tool_use blocks with `"skill": "bmad-bmm-create-prd"`
- High-risk: BMAD scoring prompts may need iteration — start with v1 and refine based on score distribution in Langfuse
- The improvement agent uses Sonnet (not Haiku) since generating concrete improvement suggestions requires deeper reasoning

## Review Notes
- Adversarial review completed
- Findings: 15 total, 0 fixed, 15 skipped
- Resolution approach: skip
