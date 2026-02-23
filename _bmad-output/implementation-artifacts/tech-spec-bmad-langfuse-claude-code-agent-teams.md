---
title: 'BMAD Method + Langfuse + Claude Code Agent Teams in Production'
slug: 'bmad-langfuse-claude-code-agent-teams'
created: '2026-02-23'
status: 'completed'
stepsCompleted: [1, 2, 3, 4]
tech_stack: [docusaurus, markdown, typescript, next.js, langfuse, claude-agent-sdk]
files_to_modify:
  - /Users/vadimnicolai/Public/vadim.blog/blog/2026/02-23-bmad-langfuse-claude-code-agent-teams/index.md
code_patterns:
  - Docusaurus blog frontmatter with authors/tags
  - Edge-compatible fetch-based Langfuse client (no Node SDK)
  - defineSubagent() / mergeSubagents() pattern from Claude Agent SDK
  - composePermissions() layered permission model
  - BMAD team-roles as spawn prompt files in .claude/team-roles/
test_patterns: []
---

# Tech-Spec: BMAD Method + Langfuse + Claude Code Agent Teams in Production

**Created:** 2026-02-23

## Overview

### Problem Statement

There is no written guide explaining how BMAD v6, Langfuse observability, and Claude Code Agent Teams work together in a real production codebase. Developers building AI-heavy products need a concrete, grounded reference — not abstract theory.

### Solution

Write a long-form Docusaurus blog article for vadim.blog that walks through the three pillars as implemented in `nomadically.work`: BMAD workflows and quality gates, Langfuse prompt management and tracing, and Claude Code Agent Teams coordination — with actual code snippets and file references.

### Scope

**In Scope:**
- BMAD v6 framework: workflows, roles, quality gates, step-file architecture
- Claude Code Agent Teams: team roles (pm/architect/dev/qa), spawn prompts, `defineSubagent()`, `composePermissions()`
- Langfuse: Edge-compatible fetch client, prompt management, tracing, scoring, A/B routing, composable prompts
- Code examples from real files in nomadically.work
- How the three pillars compose
- Docusaurus-ready format: frontmatter, `<!--truncate-->`, Table of Contents

**Out of Scope:**
- General LLM/AI 101
- Cloudflare D1/database infrastructure
- Job board product features

## Context for Development

### Codebase Patterns

- Blog posts: `vadim.blog/blog/2026/{date-slug}/index.md`
- Frontmatter: `title`, `description`, `slug`, `authors: [nicolad]`, `tags: [...]`
- `<!--truncate-->` after intro paragraph
- H2 sections with anchor-linked Table of Contents
- Code blocks with language identifiers

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `.claude/team-roles/pm.md` | PM spawn prompt — domain context + BMAD checklist ref |
| `.claude/team-roles/dev.md` | Dev spawn prompt — coding conventions + ownership |
| `src/langfuse/index.ts` | Edge-compatible Langfuse client (fetch, A/B, compose) |
| `src/langfuse/scores.ts` | Score ingestion API |
| `src/anthropic/subagents.ts` | `defineSubagent()`, `mergeSubagents()`, `SUBAGENT_PRESETS` |
| `src/anthropic/permissions.ts` | `allowOnly()`, `composePermissions()`, `blockCommands()` |
| `_bmad/bmm/config.yaml` | BMAD project config |
| `OPTIMIZATION-STRATEGY.md` | Two-Layer optimization model |
| `CLAUDE.md` | Project AI instructions |

### Technical Decisions

- Output: `vadim.blog/blog/2026/02-23-bmad-langfuse-claude-code-agent-teams/index.md`
- Author: `nicolad`
- Tags: `[bmad, langfuse, claude-code, ai-agents, observability, llm-evals, agent-teams]`

## Implementation Plan

### Tasks

- [x] Task 1: Read source files for code examples
  - Files: `src/langfuse/index.ts`, `src/langfuse/scores.ts`, `src/anthropic/subagents.ts`, `src/anthropic/permissions.ts`, `.claude/team-roles/pm.md`, `.claude/team-roles/dev.md`
  - Action: Extract real code snippets to embed in article
  - Notes: Complete — all files read in Step 2

- [x] Task 2: Create article directory and write `index.md`
  - File: `vadim.blog/blog/2026/02-23-bmad-langfuse-claude-code-agent-teams/index.md`
  - Action: Write full Docusaurus article with all sections, frontmatter, truncate marker, ToC, and code snippets from real source files
  - Notes: ~2500 words. Must include `<!--truncate-->` after first paragraph.

- [x] Task 3: Verify Docusaurus frontmatter is valid
  - File: same as Task 2
  - Action: Confirm `authors: [nicolad]` matches `authors.yml`, tags use kebab-case, slug is URL-safe

### Acceptance Criteria

- [x] AC 1: Given the article file exists at `vadim.blog/blog/2026/02-23-bmad-langfuse-claude-code-agent-teams/index.md`, when Docusaurus builds, then no frontmatter validation errors occur
- [x] AC 2: Given a developer unfamiliar with BMAD, when reading section 1, then they understand the step-file architecture and quality-gate approach in under 5 minutes
- [x] AC 3: Given a developer integrating Langfuse, when reading section 2, then they can copy the Edge-compatible client pattern and understand why the Node.js SDK is avoided
- [x] AC 4: Given a team using Claude Code, when reading section 3, then they understand how to set up Agent Teams with role-based spawn prompts and `defineSubagent()`
- [x] AC 5: Given all three sections, when reading the composition section, then the interplay of BMAD + Langfuse + Agent Teams is clear with a concrete end-to-end flow
- [x] AC 6: Given the file is moved to `vadim.blog/`, when `pnpm build` runs in vadim.blog, then the post appears in the blog feed with correct metadata

## Additional Context

### Dependencies

- `vadim.blog` repo at `/Users/vadimnicolai/Public/vadim.blog`
- `authors.yml` has `nicolad` defined
- Docusaurus config at `vadim.blog/docusaurus.config.ts`

### Testing Strategy

- Manual: open `http://localhost:3000/blog/bmad-langfuse-claude-code-agent-teams` after `pnpm start` in vadim.blog
- Verify `<!--truncate-->` shows excerpt in blog list view
- Verify all code blocks render correctly (no unclosed fences)

### Notes

- Article format confirmed as Docusaurus (user specified)
- All code snippets are from real production files — no invented examples
- The Langfuse section should emphasize the Edge Runtime constraint (no Node.js SDK) as this is non-obvious and practically important
- The BMAD section should explain step-file architecture since it's the unique mechanism of BMAD v6

## Review Notes

- Adversarial review completed
- Findings: 12 total, 0 fixed, 12 skipped
- Resolution approach: skip
