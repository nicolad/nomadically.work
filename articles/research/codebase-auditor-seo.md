# SEO Strategy: Codebase Auditor

## Target Keywords
| Keyword | Monthly Volume | Difficulty | Intent | Priority |
|---|---|---|---|---|
| AI code review | est. high | high | commercial | P1 |
| automated code auditing | est. medium | medium | informational | P1 |
| AI static analysis beyond linting | est. low | low | informational | P2 |
| execution path tracing AI | est. low | low | informational | P2 |
| N+1 query detection AI | est. low | low | informational | P3 |

## Search Intent
Mixed commercial and informational — engineers evaluating AI code review tools want to know what's possible beyond linting. The bold claim format ("Your linter can't...") targets the gap between what linters do and what execution-path-aware analysis can do.

## Competitive Landscape
| Rank | Title | Domain | Format | Word Count | Gap |
|---|---|---|---|---|---|
| 1 | Single vs Multi-Agent Code Review 2026 | qodo.ai | comparison | ~2500 | Product-focused, not architecture |
| 2 | AI Coding Agents Complete Guide | verdent.ai | guide | ~4000 | Broad, not auditing-specific |
| 3 | DORA Report AI findings | google.com | report | ~3000 | Stats only, no implementation |

## Recommended Structure
- **Format**: Bold-claim technical article with playbook examples
- **Word count**: 1500-2000
- **Title tag**: "Your Linter Can't Trace Execution Paths. This Agent Can."
- **Meta description**: "Linters catch patterns. This AI agent traces N+1 queries from resolver to database and back. Four research papers shaped an auditor with playbooks for perf, security, types, and dead code."
- **H1**: Your Linter Can't Trace Execution Paths. This Agent Can.
- **H2s**:
  1. What Linters Miss — the gap between pattern matching and path tracing
  2. Four Papers, One Auditor — TraceCoder, TrajAD, Graph-RAG, Architecture-Aware Evaluation
  3. The Four Playbooks — performance, type safety, security, dead code
  4. Cross-Referencing Known Issues — avoiding redundant reports
  5. Read-Only by Design — why the auditor never writes code

## Internal Linking Opportunities
- nomadically.work job listings → real codebase context
- Trajectory Miner article → upstream in the pipeline

## Differentiation Strategy
The "linter vs execution path" contrast is concrete and relatable. Every engineer has hit the limits of ESLint/SonarQube. Showing specific playbooks (N+1, type safety, dead code) with real examples from a production codebase is unique.

## Distribution Notes
- HackerNews: "your linter can't" is provocative enough to drive clicks
- Twitter/X: screenshot the playbook checklists
- Dev.to: the playbook format is highly shareable
