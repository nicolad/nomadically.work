---
title: "Your Linter Can't Trace Execution Paths. This Agent Can."
description: "Linters catch patterns. This AI agent traces N+1 queries from resolver to database and back. Four research papers shaped an auditor with playbooks for perf, security, types, and dead code."
date: "2026-02-25"
author: "nomadically.work"
tags: ["autonomous-agents", "code-auditing", "self-improvement", "software-quality", "AI-code-review"]
status: draft
---

# Your Linter Can't Trace Execution Paths. This Agent Can.

Static analysis tools find pattern violations. Linters catch style issues. But neither traces an N+1 query from a GraphQL resolver through a DataLoader absence to a frontend performance degradation. That requires understanding execution paths — and that's what the Codebase Auditor does.

The Codebase Auditor is the second agent in our six-agent autonomous self-improvement pipeline for [nomadically.work](https://nomadically.work). It receives pattern IDs from the Trajectory Miner, investigates the actual code exhaustively, and produces findings with exact `file:line` references. It never modifies code — it only reads and reports.

Four research papers shaped its design, curated from the [VoltAgent/awesome-ai-agent-papers](https://github.com/VoltAgent/awesome-ai-agent-papers) collection. Here is how each one translated into practice.

> **Note:** The implementation has since evolved from a generic codebase auditor into a goal-driven "Discovery Expander" focused on finding more AI engineering companies and job boards. The research principles described here still underpin the architecture. The playbooks and data structures below reflect the original design that these papers informed.

## What Linters Miss

ESLint will tell you about an unused variable. SonarQube will flag a code smell. Neither will tell you that your `enhance-job.ts` resolver fetches every job in the database to find one by `external_id` — a full table scan that degrades with every job you add. Neither will trace a missing admin guard from mutation definition through resolver to production exposure. The gap between pattern matching and execution path tracing is where real bugs live.

Google's 2025 DORA Report found that 90% AI adoption increase correlates with a 91% increase in code review time. More AI-generated code means more code to review — and linters aren't scaling to meet the need. What's needed isn't a faster linter. It's an agent that investigates like a senior engineer: following imports, reading callers, tracing data flow across layers.

## Four Papers, One Auditor

### TraceCoder: Observe-Analyze-Repair

TraceCoder (He et al., 2025) introduces a three-phase loop for LLM-based code debugging: observe the code and its runtime behavior, analyze what's wrong, and propose a repair. The paper demonstrates that separating observation from analysis significantly improves debugging accuracy — agents that jump to conclusions before thoroughly reading the code produce worse fixes.

The critical insight is that LLM agents tend to pattern-match on surface-level code features rather than tracing actual execution paths. TraceCoder forces a structured observation phase that must complete before analysis begins.

**How we used it:** The Codebase Auditor's first two phases directly implement TraceCoder's observe-analyze loop (we omit the repair phase — that's the Code Improver's job):

**Observe Phase:** For each target area, the agent systematically reads the primary files, traces imports and dependencies, reads related tests, checks the schema and types that constrain the code, and looks for TODO/FIXME/HACK comments. This isn't a keyword search — it's following the call chain.

**Analyze Phase:** Each observation gets classified into a structured finding with type, severity, location, evidence (the actual code snippet), root cause, impact, fix strategy, and a confidence score from 0.0 to 1.0.

The separation matters. In early prototypes without this structure, the agent would read a file, spot an `any` type, immediately suggest a fix, and miss that the `any` was masking a deeper schema mismatch three files away.

### TrajAD: Trajectory Anomaly Detection

TrajAD (Li et al., 2025) is a specialized verifier that detects errors in LLM agent trajectories — sequences of actions that went wrong. Rather than evaluating individual actions, it evaluates the trajectory as a whole, catching errors that look reasonable in isolation but form a problematic pattern in sequence.

**How we used it:** TrajAD's approach directly maps to the Analyze Phase's classification system. Each finding is not just a point-in-time observation but includes links to mining report patterns (`related_patterns: ["P-xxx"]`), creating a trajectory view. The confidence score (0.0-1.0) is a direct application of TrajAD's anomaly scoring — findings below 0.7 confidence must be flagged as "needs verification."

This prevents the auditor from reporting false positives with false certainty. When the agent reads code and isn't sure whether something is actually a bug or an intentional design choice, it says so.

### Graph-RAG for Codebases: AST-Derived Navigation

"Reliable Graph-RAG for Codebases" (Zhang et al., 2025) proposes using AST-derived knowledge graphs for code understanding. Instead of treating code as flat text, it builds a graph of relationships — function calls, imports, type hierarchies, data flow — and uses this graph to navigate the codebase intelligently.

**How we used it:** While we don't build an explicit AST graph, the Observe Phase implements the same principle through structured code navigation. The agent doesn't grep for keywords — it follows imports, reads callers, checks type definitions, and traces data flow through resolvers. In a GraphQL codebase like ours, this means following the path from schema definition → resolver → Drizzle query → D1 database.

### Architecture-Aware Evaluation

Architecture-Aware Evaluation (Wang et al., 2025) links code findings to architectural components, answering not just "what's wrong" but "which layer is affected and what cascades." A bug in a database query might seem isolated, but if it's in a resolver called by every frontend page, the blast radius is the entire application.

**How we used it:** The auditor's Architecture Trace phase maps every finding to the project's layers:

```json
{
  "architecture_map": {
    "affected_layers": ["db", "api", "resolver", "frontend", "worker", "agent"],
    "cascade_risks": ["Finding F-001 in resolver affects F-003 in frontend"],
    "systemic_issues": ["Issues that appear across multiple files"]
  }
}
```

This is especially valuable in our architecture where data flows through multiple layers: `D1 Database → Gateway Worker → Drizzle ORM → Apollo Resolver → GraphQL → React Frontend`. A type mismatch at the database layer cascades through every layer above it.

## The Four Playbooks

The Codebase Auditor includes four investigation playbooks — standardized checklists for common audit types. Each playbook is grounded in real issues we've encountered in the nomadically.work codebase.

### Performance Playbook

1. Search for N+1 query patterns — resolvers calling the database inside field resolvers without DataLoaders
2. Check for missing indexes on frequently-queried columns
3. Look for full table scans — `SELECT *` without `WHERE`
4. Find unbounded queries — no `LIMIT`
5. Check for synchronous operations that could be parallel

**Real example:** The `enhance-job.ts` resolver fetches all jobs to find one by `external_id` — a full table scan documented in CLAUDE.md's known issues. The playbook catches this systematically rather than stumbling on it.

### Type Safety Playbook

1. Grep for `any` type usage in resolvers and agents
2. Check for missing null checks on nullable DB columns
3. Verify GraphQL resolver return types match schema
4. Look for unchecked `JSON.parse` calls
5. Check for D1 boolean coercion issues (0/1 vs true/false)

**Real example:** The project has 283+ `any` types in resolvers. D1 returns `0`/`1` for SQLite integers while GraphQL expects `true`/`false` — the playbook specifically checks for this D1-specific gotcha.

### Security Playbook

1. Verify admin guards on all mutations
2. Check for SQL injection vectors (raw SQL strings)
3. Look for exposed secrets or API keys in code
4. Check CORS configuration
5. Verify input validation on API routes

**Real example:** The D1 Gateway Worker has `CORS: *` — a known issue. The playbook ensures every mutation includes the `isAdminEmail()` guard from `src/lib/admin.ts`.

### Dead Code Playbook

1. Find exports with no importers
2. Find files with no references
3. Check for unused dependencies in `package.json`
4. Look for commented-out code blocks
5. Find TODO comments older than current patterns

**Real example:** `@libsql/client` and `pg` dependencies remain in `package.json` after the D1 migration — likely unused. The `insert-jobs` worker still references Turso in its help text. The playbook catches stale code that humans overlook because it doesn't break anything.

## Cross-Referencing Known Issues

A subtle but important feature: the auditor reads CLAUDE.md's "Known issues" section before reporting. It won't re-report issues that are already documented unless it has new information — such as discovering the issue is worse than documented or finding the root cause of a known symptom.

This prevents the improvement pipeline from generating redundant work. The team already knows about CORS `*` on the gateway. The auditor's job is to find what the team doesn't know.

## Read-Only by Design

Traditional static analysis operates at the syntax level. Code review by humans operates at the understanding level but doesn't scale. The Codebase Auditor sits between these — it traces execution paths like a human reviewer but does so systematically across the entire codebase, guided by playbooks that encode institutional knowledge about what to look for.

The read-only constraint is fundamental. By never modifying code, the auditor can be aggressive in its investigation without risk. It can report 20 findings per audit (its configured limit), each with confidence scores, and let the downstream Code Improver decide which ones to actually fix. This separation of diagnosis from treatment mirrors how senior engineers work: the person who identifies the problem isn't always the person who fixes it.

Your linter will keep catching semicolons. This agent will keep tracing the execution paths where the real problems hide.

## References

1. Huang, J., et al. "TraceCoder: A Trace-Driven Multi-Agent Framework for Automated Debugging of LLM-Generated Code." ICSE 2026. [https://conf.researchr.org/details/icse-2026/icse-2026-research-track/145/](https://conf.researchr.org/details/icse-2026/icse-2026-research-track/145/)

2. Pathak, D., et al. "Detecting Silent Failures in Multi-Agentic AI Trajectories." arXiv preprint, 2025. [https://arxiv.org/abs/2511.04032](https://arxiv.org/abs/2511.04032)

3. "Reliable Graph-RAG for Codebases: AST-Derived Graphs vs LLM-Extracted Knowledge Graphs." arXiv preprint, 2026. [https://arxiv.org/abs/2601.08773](https://arxiv.org/abs/2601.08773)

4. "Toward Architecture-Aware Evaluation Metrics for LLM Agents." arXiv preprint, 2026. [https://arxiv.org/abs/2601.19583](https://arxiv.org/abs/2601.19583)

---

*This article is part of a six-part series on building autonomous self-improvement agents, grounded in research from [VoltAgent/awesome-ai-agent-papers](https://github.com/VoltAgent/awesome-ai-agent-papers). Data and implementation details from [nomadically.work](https://nomadically.work).*
