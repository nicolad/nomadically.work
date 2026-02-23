---
title: 'BMAD Langfuse Self-Improvement Pipeline'
slug: 'bmad-langfuse-self-improvement'
created: '2026-02-23'
status: 'in-progress'
stepsCompleted: [1]
tech_stack: ['python', 'langfuse', 'anthropic']
files_to_modify: ['.claude/hooks/stop_hook.py']
code_patterns: ['fail-open imports', 'atomic file writes', 'lock-protected queues']
test_patterns: []
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

- Stop hook uses fail-open imports (`try/except` with `sys.exit(0)` on failure)
- Atomic file writes via temp file + `os.replace()` for queue management
- Lock-protected queue with `fcntl.flock`
- Langfuse Cloud at `https://cloud.langfuse.com` (default in stop hook)
- Keys: `LANGFUSE_PUBLIC_KEY`, `LANGFUSE_SECRET_KEY`, `LANGFUSE_BASE_URL` from env
- Scorer uses Claude Haiku (`claude-haiku-4-5-20251001`) for cost efficiency
- Transcript is JSONL format, parsed line-by-line

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `.claude/hooks/stop_hook.py` | Main stop hook — extend with BMAD tagging + scorers |
| `.claude/settings.json` | Hook registration — already configured |
| `src/langfuse/index.ts` | TypeScript Langfuse client (reference only, not modified) |
| `_bmad/bmm/config.yaml` | BMAD module config |
| `_bmad/` | BMAD agent definitions and workflows |

### Technical Decisions

- All new scripts are Python (matching existing stop hook)
- Scorers run inside stop hook (not standalone) for automatic evaluation
- Use Haiku for scoring to keep costs low
- BMAD workflow detection is keyword-based on user messages in transcript
- Improvement agent runs as a subprocess (already wired in stop hook)

## Implementation Plan

### Tasks

_To be filled in Step 2 (Deep Investigation)_

### Acceptance Criteria

_To be filled in Step 3 (Generate)_

## Additional Context

### Dependencies

- `langfuse` Python package (already installed for stop hook)
- `anthropic` Python package (already installed for stop hook)
- Langfuse Cloud account with API keys (already configured)

### Testing Strategy

_To be filled in Step 2_

### Notes

- The stop hook already has `CC_AUTO_IMPROVE` env var check and subprocess spawn logic for `improvement_agent.py`
- The improvement queue (`~/.claude/state/improvement_queue.json`) is already implemented
- BMAD workflows are invoked via slash commands that appear in user messages in the transcript
