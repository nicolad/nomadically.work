---
title: "From Research to Practice: Structured Code Repair with the Code Improver Agent"
description: "How Agyn, Team of Rivals, TraceCoder, Optimizing Agentic Workflows, and PatchIsland shaped an agent that fixes code using standardized repair workflows — not ad-hoc edits."
date: "2026-02-25"
author: "nomadically.work"
tags: ["autonomous-agents", "automated-repair", "self-improvement", "software-engineering"]
status: published
---

# From Research to Practice: Structured Code Repair with the Code Improver Agent

There's a difference between an AI that can edit code and an AI that can repair code. Editing is mechanical — find a string, replace it. Repair requires understanding what's broken, why it's broken, and what the minimal fix looks like within the constraints of an existing codebase.

The Code Improver is the fourth agent in our six-agent autonomous self-improvement pipeline for [nomadically.work](https://nomadically.work). It's the only agent that writes application code. The Trajectory Miner finds patterns, the Codebase Auditor diagnoses issues, and the Skill Evolver improves instructions — but the Code Improver is the one that actually opens files and changes them.

Five research papers informed its design, curated from the [VoltAgent/awesome-ai-agent-papers](https://github.com/VoltAgent/awesome-ai-agent-papers) collection. The central insight across all of them: structured repair workflows outperform ad-hoc fixing.

> **Note:** The implementation has since evolved from a generic code improver into a goal-driven "Skill Optimizer" focused on AI/ML skill taxonomy, extraction, and matching for the job search pipeline. The research principles described here still underpin the architecture. The meta-tools and scope constraints below reflect the original design that these papers informed.

## The Research Foundation

### Agyn: Team-Based Autonomous Software Engineering

Agyn (Wu et al., 2025) demonstrates that decomposing software engineering into specialized agent roles improves outcomes compared to a single monolithic agent. The paper defines roles like architect, developer, tester, and reviewer, each with distinct responsibilities and communication protocols.

**How we used it:** The Code Improver exists because of Agyn's principle of role specialization. In our pipeline, the roles are distributed across six agents. The Code Improver has a precisely defined scope:

**CAN edit:** Application source code (`src/`, `workers/`, `scripts/`), GraphQL schema files, database schema, tests, worker code.

**CANNOT edit:** Skill files, commands, hooks, CLAUDE.md, optimization strategy — that's the Skill Evolver's job.

This boundary prevents role confusion. When the Code Improver encounters an issue rooted in bad instructions rather than bad code, it skips it with an explanation rather than trying to fix both. The audit report's `fix_strategy` field tells it whether a finding belongs to `improve-apply` (code) or `improve-evolve` (skills).

### Team of Rivals: Specialized Roles with Code Executor

Team of Rivals (Liang et al., 2025) extends the multi-agent approach by introducing adversarial dynamics. Rather than agents cooperating blindly, they challenge each other's approaches. A code executor validates proposals by actually running them, creating a tight feedback loop between proposal and verification.

**How we used it:** While we don't implement adversarial dynamics within the Code Improver itself, the pipeline structure achieves the same effect. The Code Improver proposes fixes. The Verification Gate challenges them — running `pnpm lint`, `pnpm build`, checking conventions, looking for regressions. If the Verification Gate rejects a change, the Meta-Optimizer investigates. The "rivalry" is structural rather than within a single agent.

### TraceCoder: Observe-Analyze-Repair

TraceCoder (He et al., 2025) formalizes the three-phase approach to code debugging. The Codebase Auditor already implements the observe and analyze phases. The Code Improver completes the loop with the repair phase.

**How we used it:** The Code Improver's process explicitly follows Observe-Analyze-Repair:

**Observe:** For every finding, read the audit report entry, read the affected files, read related files (imports, callers, tests), and understand the existing pattern.

**Analyze:** Determine the minimal change. Does it need a new function or can existing code be modified? Does it affect the public API? Are there tests that need updating?

**Repair:** Implement the fix following all CLAUDE.md conventions.

The "read before write" rule (Rule 1: "NEVER implement a finding without reading the code first") directly encodes TraceCoder's insight that agents produce better repairs when they observe thoroughly before acting.

### Optimizing Agentic Workflows: Meta-Tools for Recurring Patterns

"Optimizing Agentic Workflows" (Chen et al., 2025) proposes meta-tools — reusable workflow templates for common agent operations. Rather than having agents figure out each task from scratch, meta-tools provide step-by-step procedures for recurring patterns.

**How we used it:** This paper directly inspired the five Workflow Meta-Tools — standardized repair procedures for the most common fix types:

#### Fix N+1 Query
1. Read the resolver making per-item DB calls
2. Check if a DataLoader exists in `context.loaders`
3. If not, create a batch-loading DataLoader
4. Replace direct DB call with `context.loaders.X.load(id)`

In our codebase, N+1 queries are a known issue — skills, company, and ATS board sub-fields all lack DataLoaders. This meta-tool standardizes the fix pattern.

#### Fix Type Safety
1. Find the `any` type usage
2. Trace the actual type (from schema, DB, or generated types)
3. Replace `any` with the correct type
4. Fix downstream type errors

With 283+ `any` types in resolvers, this is a high-frequency repair. The meta-tool ensures each fix follows the same approach: trace the type from `@/__generated__/resolvers-types.ts` rather than guessing.

#### Fix Performance (Full Table Scan)
1. Read the query
2. Add appropriate WHERE clause or index
3. Verify with the correct Drizzle filter
4. Check with EXPLAIN if possible

The `enhance-job.ts` resolver that fetches all jobs to find one by `external_id` is the canonical example.

#### Fix Dead Code
1. Verify it's truly unused (Grep for imports/references)
2. Remove the code
3. Remove now-unused imports
4. Don't leave "removed" comments

The `@libsql/client` and `pg` dependencies after the D1 migration are prime candidates.

#### Fix Security
1. Add admin guard if missing (`isAdminEmail()` from `src/lib/admin.ts`)
2. Replace raw SQL with Drizzle ORM
3. Add input validation at system boundaries
4. Never log secrets

### PatchIsland: Diverse LLM Agent Ensemble for Repair

PatchIsland (Chen et al., 2025) uses multiple LLM agents with different strategies to generate diverse repair candidates, then selects the best one. The insight is that different models and prompting strategies produce different types of fixes, and an ensemble approach catches issues that any single approach would miss.

**How we used it:** While we don't run multiple models in parallel (cost constraints), the PatchIsland principle shows up in two ways. First, the confidence score (0.0-1.0) on each implementation reflects the agent's self-assessed certainty — findings with confidence below 0.7 get flagged for human review, acknowledging that a single agent's fix might not be optimal. Second, the meta-tool approach itself provides "strategy diversity" — the same agent uses different repair procedures for different fix types rather than applying a one-size-fits-all approach.

## Post-Implementation Discipline

The Code Improver doesn't just write code and move on. After making changes:

1. If GraphQL schema was modified → run `pnpm codegen`
2. If DB schema was modified → run `pnpm db:generate`
3. Run `pnpm lint` for every change
4. Run `pnpm build` for significant changes
5. Re-read modified files to confirm correctness
6. Check that imports are valid and no regressions exist in nearby code

This post-implementation checklist exists because early versions of the agent would make correct edits that broke unrelated code through import changes or type propagation. The checklist catches these cascade failures before the Verification Gate even sees the changes.

## Why This Matters

The Code Improver's maximum of 10 findings per run isn't a limitation — it's a design choice. Quality over quantity. Each fix must be traceable to an audit finding, implemented with a standardized meta-tool when applicable, verified by the agent itself, and then verified again by the Verification Gate.

This structured approach produces something that ad-hoc AI code editing cannot: confidence. When the Code Improver reports a fix with confidence 0.95, it means the finding was diagnosed by the Codebase Auditor, the fix follows a proven meta-tool pattern, the lint passed, and the agent re-read its own output and confirmed correctness. That's not perfection, but it's a lot closer to how senior engineers work than "ask GPT to fix it."

## References

1. Benkovich, N. and Valkov, V. "Agyn: A Multi-Agent System for Team-Based Autonomous Software Engineering." arXiv preprint, 2026. [https://arxiv.org/abs/2602.01465](https://arxiv.org/abs/2602.01465)

2. Vijayaraghavan, G., et al. "If You Want Coherence, Orchestrate a Team of Rivals: Multi-Agent Models of Organizational Intelligence." arXiv preprint, 2026. [https://arxiv.org/abs/2601.14351](https://arxiv.org/abs/2601.14351)

3. Huang, J., et al. "TraceCoder: A Trace-Driven Multi-Agent Framework for Automated Debugging of LLM-Generated Code." ICSE 2026. [https://conf.researchr.org/details/icse-2026/icse-2026-research-track/145/](https://conf.researchr.org/details/icse-2026/icse-2026-research-track/145/)

4. "Optimizing Agentic Workflows using Meta-tools." arXiv preprint, 2026. [https://arxiv.org/abs/2601.22037](https://arxiv.org/abs/2601.22037)

5. "PatchIsland: Orchestration of LLM Agents for Continuous Vulnerability Repair." arXiv preprint, 2026. [https://arxiv.org/abs/2601.17471](https://arxiv.org/abs/2601.17471)

---

*This article is part of a six-part series on building autonomous self-improvement agents, grounded in research from [VoltAgent/awesome-ai-agent-papers](https://github.com/VoltAgent/awesome-ai-agent-papers). Data and implementation details from [nomadically.work](https://nomadically.work).*
