---
title: 'Deeper Interview Prep Deep-Dive Prompt'
slug: 'deeper-interview-prep-deep-dive-prompt'
created: '2026-02-23'
status: 'completed'
stepsCompleted: [1, 2, 3, 4]
tech_stack: ['TypeScript', 'Apollo Server 5', 'DeepSeek Reasoner API', 'GraphQL']
files_to_modify: ['src/apollo/resolvers/application.ts']
code_patterns: ['GraphQL mutation resolver', 'DeepSeek chat client', 'JSON blob update pattern']
test_patterns: []
---

# Tech-Spec: Deeper Interview Prep Deep-Dive Prompt

**Created:** 2026-02-23

## Overview

### Problem Statement

The `generateTopicDeepDive` mutation (`application.ts:294-326`) produces shallow, generic content for technical system-design topics like "State Management". The current 6-section prompt allows DeepSeek Reasoner to produce overview-level text when the candidate needs concrete trade-off analysis, implementation comparisons, and senior-engineer-level precision. Additionally, once a `deepDive` is generated it cannot be regenerated (line 285 short-circuits), blocking prompt iteration.

### Solution

Rewrite the prompt to force technical depth: concrete trade-off tables, failure scenario examples, named implementation comparisons (e.g. PostgreSQL vs Cassandra), and explicit differentiation between technical and behavioral framing. Add a `force` boolean arg to the mutation to allow regeneration.

### Scope

**In Scope:**
- Rewrite the LLM prompt string inside `generateTopicDeepDive` (`application.ts:299-322`)
- Increase `max_tokens` from 3000 to 4000
- Add `force: Boolean` argument to the `generateTopicDeepDive` GraphQL mutation
- Update the early-return guard (line 285) to respect the `force` flag
- Update generated types via `pnpm codegen`

**Out of Scope:**
- Schema changes to `AIInterviewPrepRequirement` type
- New UI components or mutations
- Changes to `generateInterviewPrep` prompt
- Other resolvers

---

## Context for Development

### Codebase Patterns

- Resolvers use `createDeepSeekClient()` from a shared client factory; the pattern is `client.chat({ model: DEEPSEEK_MODELS.REASONER, messages: [...], max_tokens: N })`
- DB updates write back a full JSON blob: `JSON.stringify(prepData)` → `applications.ai_interview_prep`
- All mutations guard with `context.userEmail` ownership check (already present, no change needed)
- GraphQL args are typed inline (`args: { applicationId: number; requirement: string }`) — add `force?: boolean`
- After any `schema/**/*.graphql` change: run `pnpm codegen` to regenerate `src/__generated__/`

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `src/apollo/resolvers/application.ts` | Contains `generateTopicDeepDive` resolver (lines 253–346) — only file to modify |
| `schema/applications/schema.graphql` | GraphQL mutation definition for `generateTopicDeepDive` — add `force` arg |
| `src/__generated__/resolvers-types.ts` | Auto-generated — updated by `pnpm codegen`, do not edit manually |

### Technical Decisions

- **`force` arg defaults to `false`** — existing callers unaffected; passing `force: true` bypasses the early-return and overwrites the stored deepDive
- **Prompt rewrite approach**: Replace the flat 6-section list with a structured prompt that explicitly instructs technical depth, named system comparisons, and trade-off tables. The 6 sections are kept (familiar output shape) but each section gets explicit depth instructions.
- **`max_tokens: 4000`** — gives Reasoner enough room for a thorough technical output without excessive cost

---

## Implementation Plan

### Tasks

1. [x] **`schema/applications/schema.graphql`** — Add `force: Boolean` to the `generateTopicDeepDive` mutation signature
   ```graphql
   generateTopicDeepDive(applicationId: Int!, requirement: String!, force: Boolean): Application
   ```

2. [x] **`pnpm codegen`** — Regenerate types after schema change

3. [x] **`src/apollo/resolvers/application.ts:253`** — Update resolver signature to include `force` in args:
   ```ts
   args: { applicationId: number; requirement: string; force?: boolean }
   ```

4. [x] **`src/apollo/resolvers/application.ts:285`** — Update early-return guard:
   ```ts
   // Before:
   if (reqEntry.deepDive) return mapApplication(row.app, row.jobDescription);
   // After:
   if (reqEntry.deepDive && !args.force) return mapApplication(row.app, row.jobDescription);
   ```

5. [x] **`src/apollo/resolvers/application.ts:299-322`** — Replace the prompt with the deeper version (full prompt in Notes section below)

6. [x] **`src/apollo/resolvers/application.ts:325`** — Increase `max_tokens` from `3000` to `4000`

### Acceptance Criteria

- **Given** `generateTopicDeepDive` is called for a requirement with no existing deepDive, **When** it completes, **Then** the returned deepDive markdown contains at least one concrete named-system comparison (e.g. PostgreSQL, Redis, Cassandra) or trade-off table where the topic warrants it
- **Given** a deepDive already exists, **When** `generateTopicDeepDive` is called without `force: true`, **Then** the mutation returns immediately without calling DeepSeek (no change)
- **Given** a deepDive already exists, **When** `generateTopicDeepDive` is called with `force: true`, **Then** the deepDive is regenerated and the new content is stored
- **Given** `force: true` is not passed by existing callers, **Then** existing behavior is unchanged (non-breaking)

---

## Additional Context

### Dependencies

- No new npm packages
- `pnpm codegen` must be run after schema change

### Testing Strategy

Manual: Hit "Generate Deep Dive" in the UI for the State Management requirement on `/applications/9`. Inspect the modal content for technical depth — expect named systems, trade-off comparisons, failure scenarios. Use GraphQL Playground at `http://localhost:3000/api/graphql` with `force: true` to regenerate.

### Notes

**New prompt (replace lines 299-322):**

```
You are a senior staff engineer and technical interview coach. The candidate is preparing for a technical interview at ${(row.app as any).company_name ?? "a tech company"} for the role of ${(row.app as any).job_title ?? "software engineer"}.

Job description context:
${plainJobDesc}

Topic to master: "${args.requirement}"

Related interview questions:
${reqEntry.questions?.map((q: string) => `- ${q}`).join("\n")}

Study areas identified:
${reqEntry.studyTopics?.map((t: string) => `- ${t}`).join("\n")}

Write a deep, technically rigorous preparation guide in markdown. This is for a senior engineer — avoid surface-level definitions. Every section must contain concrete, specific technical content.

Structure your response exactly as follows:

## Why This Matters for This Role
Explain specifically why this topic is critical for this company and role. Reference the job description context. Be concrete about the technical decisions the candidate will face on the job.

## Core Technical Concepts
For each concept, go beyond the definition. Explain the mechanism, the trade-offs, and when each applies. Use concrete named systems as examples (e.g. PostgreSQL, Cassandra, Redis, Kafka, DynamoDB). Where relevant, include a trade-off comparison table.

## How to Answer in the Interview
Provide a structured framework for answering questions on this topic. Don't use generic STAR framing for technical topics — instead give a technical reasoning pattern: state your assumptions, name the constraints, explain the trade-offs, give a concrete recommendation with justification.

## Battle-Tested Examples
2-3 real-world scenarios where this topic caused a production incident or shaped a major architectural decision. Describe what went wrong (or right), why, and what the candidate can learn from it.

## What Separates Senior Answers
Exactly what a senior engineer says that a mid-level engineer misses. Be specific — quote the kind of phrasing, the specific trade-offs named, or the edge cases mentioned.

## Common Mistakes to Avoid
What weak or under-prepared candidates get wrong. Be blunt and specific.

## Targeted Study Plan
3-5 specific things to review before the interview (concepts, papers, system internals — not generic URLs). Prioritized by impact.
```

## Review Notes
- Adversarial review completed
- Findings: 11 total, 0 fixed, 11 skipped
- Resolution approach: skip
