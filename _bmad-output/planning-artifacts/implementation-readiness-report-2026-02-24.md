# Implementation Readiness Assessment Report

**Date:** 2026-02-24
**Project:** nomadically.work — Workers Consolidation

---

## Document Inventory

**PRD:** `prd-workers-consolidation-2026-02-24.md` (status: complete)
**Architecture:** `architecture-workers-consolidation-2026-02-24.md` (status: complete)
**Epics & Stories:** `epics-workers-consolidation-2026-02-24.md` (status: complete)
**UX Design:** N/A — infrastructure initiative, no UI surface

---

## PRD Analysis

### Functional Requirements

FR1: Developer can view a complete inventory of all workers: name, runtime, trigger type (cron/queue/HTTP/on-demand), queue bindings, and status (active/legacy/uncertain)
FR2: Developer can identify workers with overlapping responsibilities or redundant queue consumer registrations
FR3: Developer can determine the exact dependency chain between workers (producer → consumer relationships)
FR4: Developer can retire `insert-jobs` with all artifacts removed: worker code, `wrangler.insert-jobs.toml`, CF dashboard queue consumer, and `@libsql/client` dependency
FR5: Developer can retire or migrate `promptfoo-eval` after confirming no external consumers reference it
FR6: Job ingestion pipeline processes correctly after worker retirement — no regression in throughput
FR7: Developer can identify all Turso/libsql references across the workers codebase: `wrangler.*.toml` env vars, TypeScript imports, `package.json` deps
FR8: Developer can remove all Turso/libsql references from surviving workers without breaking functionality
FR9: No `@libsql/client` or `TURSO_*` environment variables remain in any wrangler config or worker code post-consolidation
FR10: Developer deploys each surviving worker using a single, clearly named `wrangler.*.toml` config
FR11: Developer identifies the correct deploy command for any worker from `package.json` or `CLAUDE.md` without ambiguity
FR12: All surviving wrangler configs list only active, valid bindings — no dead KV, Queue, or D1 entries
FR13: Developer deploys the entire TypeScript workers fleet with ≤3 distinct `wrangler deploy` commands
FR14: CF dashboard queue consumer registrations match the surviving workers exactly — no ghost consumers
FR15: All queue message formats remain unchanged — consumers receive identical payloads as before
FR16: `d1-gateway` HTTP endpoint URL and `API_KEY` auth contract remain unchanged
FR17: `janitor` cron schedule and ATS ingestion trigger logic remain functionally identical after any refactoring
FR18: `CLAUDE.md` workers table contains an accurate entry for every surviving worker — no legacy entries
FR19: Developer traces a job through the ingestion pipeline by reading only the workers table — each step maps to exactly one worker
FR20: Surviving TypeScript workers emit structured logs with at minimum: `worker_name`, `status`, `duration_ms` per invocation

**Total FRs: 20**

### Non-Functional Requirements

NFR1 (Performance): Surviving TypeScript workers complete within Cloudflare's 30ms CPU time limit — verified via `wrangler dev` benchmark before production deploy
NFR2 (Performance): `d1-gateway` p95 response time does not increase post-consolidation — baseline measured before changes begin
NFR3 (Performance): `janitor` cron completes within the 30s wall-clock limit — verified if logic is added during any merge
NFR4 (Security): `d1-gateway` `API_KEY` remains the sole auth mechanism — no new auth surface introduced
NFR5 (Security): No secrets committed to source control — all secrets stay in CF dashboard / `.env.local`
NFR6 (Security): `insert-jobs` retirement does not expose queue endpoints — verify no public routes are opened
NFR7 (Reliability): Zero production downtime — workers are retired/deployed independently, no coordinated cutover
NFR8 (Reliability): Job ingestion throughput does not drop below pre-consolidation baseline for 48h post-deployment — monitored via CF analytics
NFR9 (Reliability): No increase in dead-lettered queue messages post-consolidation — any spike indicates a missed queue consumer
NFR10 (Integration): Queue message payload schemas remain byte-identical — no field renames, type changes, or additions
NFR11 (Integration): `d1-gateway` base URL unchanged in Vercel environment variables
NFR12 (Integration): Cloudflare binding names in surviving `wrangler.toml` files match worker code exactly — mismatches are silent runtime failures

**Total NFRs: 12**

### Additional Requirements

- Brownfield cleanup — no new infrastructure, no starter template
- CF dashboard manual step required for queue consumer de-registration (cannot be scripted)
- `pnpm build` gate after each retirement
- Runtime isolation: TypeScript-only consolidation; Python and Rust workers untouched
- Turso grep scope: `wrangler.*.toml`, all `package.json` files, all `.ts` files
- Wrangler config rename: `wrangler.toml` → `wrangler.janitor.toml`
- Deploy script coherence: `scripts/deploy.ts`, `package.json`, `CLAUDE.md` all require updating

### PRD Completeness Assessment

PRD is complete and well-structured. 20 FRs across 5 clear capability areas, 12 NFRs across 4 quality dimensions. Requirements are specific, testable, and unambiguous. No vague or unmeasurable requirements identified.

---

## Epic Coverage Validation

### Coverage Matrix

| FR | PRD Requirement (summary) | Epic Coverage | Status |
|---|---|---|---|
| FR1 | Complete worker inventory (name, runtime, trigger, bindings, status) | Epic 1, Story 1.1 | ✅ Covered |
| FR2 | Identify overlapping responsibilities / redundant consumers | Epic 1, Story 1.1 | ✅ Covered |
| FR3 | Determine exact producer → consumer dependency chain | Epic 1, Story 1.1 | ✅ Covered |
| FR4 | Retire insert-jobs — code, config, CF dashboard, @libsql/client | Epic 2, Story 2.2 | ✅ Covered |
| FR5 | Retire/migrate promptfoo-eval after confirming no external consumers | Epic 2, Story 2.4 | ✅ Covered |
| FR6 | Pipeline integrity — no regression after retirement | Epic 2, Story 2.5 | ✅ Covered |
| FR7 | Identify all Turso/libsql refs across codebase | Epic 2, Story 2.1 | ✅ Covered |
| FR8 | Remove all Turso/libsql refs from surviving workers | Epic 2, Story 2.3 | ✅ Covered |
| FR9 | Zero @libsql/client or TURSO_* vars remaining post-consolidation | Epic 2, Story 2.3 | ✅ Covered |
| FR10 | Single clearly-named wrangler.*.toml per surviving worker | Epic 3, Story 3.1 | ✅ Covered |
| FR11 | Unambiguous deploy command per worker in package.json / CLAUDE.md | Epic 3, Story 3.2 | ✅ Covered |
| FR12 | Surviving configs list only active, valid bindings | Epic 3, Story 3.1 | ✅ Covered |
| FR13 | Full TS fleet deployed with ≤3 wrangler deploy commands | Epic 3, Story 3.2 | ✅ Covered |
| FR14 | CF dashboard consumers match surviving workers — no ghosts | Epic 2, Story 2.2 | ✅ Covered |
| FR15 | Queue message formats unchanged | Epic 2, Story 2.5 | ✅ Covered |
| FR16 | d1-gateway HTTP URL and API_KEY contract unchanged | Epic 2, Story 2.5 | ✅ Covered |
| FR17 | janitor cron schedule and logic functionally identical | Epic 2, Story 2.5 | ✅ Covered |
| FR18 | CLAUDE.md workers table — accurate, no legacy entries | Epic 1, Story 1.2 | ✅ Covered |
| FR19 | Pipeline traceable from workers table alone | Epic 1, Story 1.2 | ✅ Covered |
| FR20 | Structured logs: worker_name, status, duration_ms per invocation | Epic 4, Stories 4.1 & 4.2 | ✅ Covered |

### Missing Requirements

None.

### Coverage Statistics

- Total PRD FRs: 20
- FRs covered in epics: 20
- **Coverage: 100%**

---

## UX Alignment Assessment

### UX Document Status

Not applicable — Workers Consolidation is a pure infrastructure initiative (worker retirement, config cleanup, dependency removal). The PRD contains no user interface requirements. No web/mobile components are implied. All work affects developer tooling and backend configuration only.

### Alignment Issues

None.

### Warnings

None — absence of UX documentation is correct and expected for this initiative.

---

## Epic Quality Review

### Epic Structure Validation

| Epic | User Value? | Standalone? | Title User-Centric? | Result |
|---|---|---|---|---|
| Epic 1: Fleet Audit & Documentation | ✅ Developer understands full fleet state | ✅ Delivers audit + clean CLAUDE.md independently | ✅ | PASS |
| Epic 2: Legacy Worker Retirement & Dependency Cleanup | ✅ Dead code eliminated, pipeline proven clean | ✅ Uses Epic 1 findings; delivers independently | ✅ | PASS |
| Epic 3: Streamlined Deploy Configuration | ✅ Developer deploys with single unambiguous command | ✅ Depends correctly on Epic 2 (retired workers), stands alone | ✅ | PASS |
| Epic 4: Observability for Surviving Workers | ✅ Developer traces invocations without log parsing | ✅ Independent after Epic 2; can run in parallel with Epic 3 | ✅ | PASS |

**Note on "infrastructure" epics:** The developer is the user for this initiative. Epics are framed around developer outcomes (understanding, confidence, deploy simplicity, traceability) — not technical milestones. Correct pattern for infrastructure/platform work.

### Story Quality Assessment

**Epic 1:**
- Story 1.1: ✅ Completable alone; AC specifies exact output (inventory with name/runtime/trigger/bindings/status); no forward deps
- Story 1.2: ✅ Uses Story 1.1 output only; AC specific and testable; pipeline traceability requirement explicitly captured

**Epic 2:**
- Story 2.1: ✅ Completable alone (grep audit); AC produces file-grouped output; no forward deps
- Story 2.2: ✅ Uses Story 2.1 only; AC includes mandatory CF dashboard step (cannot be scripted); pnpm build gate included
- Story 2.3: ✅ Uses Story 2.2 only; AC covers import removal, env var removal, and package.json cleanup
- Story 2.4: ✅ Independent within Epic 2 (no dependency on 2.2 or 2.3); AC includes consumer verification grep before retiring
- Story 2.5: ✅ Uses 2.2+2.3+2.4; AC is specific and measurable (d1-gateway test POST, queue metrics, pipeline verification)

**Epic 3:**
- Story 3.1: ✅ Requires Epic 2 complete (correct cross-epic dep); AC covers name field, binding names, dead binding cleanup, deploy verification
- Story 3.2: ✅ Uses Story 3.1 only; AC covers all four files (scripts/deploy.ts, package.json, CLAUDE.md, wrangler config names)

**Epic 4:**
- Story 4.1: ✅ Uses Story 2.3 (Turso refs removed from janitor — correct pre-req); AC covers format, error field, CPU benchmark
- Story 4.2: ✅ Independent (d1-gateway has no Turso cleanup); AC covers consistent log shape across fleet

### Dependency Analysis

**Epic-level dependency chain:**
```
Epic 1 (standalone) → Epic 2 (uses E1 findings) → Epic 3 (uses E2 fleet state)
                                                  ↗
                              Epic 4 (after E2, parallel with E3)
```
✅ No circular dependencies. No Epic N+1 forward requirements.

**Within-epic story chains — all correct:**
- 1.1 → 1.2 ✅
- 2.1 → 2.2 → 2.3, and 2.4 independent, 2.5 caps all ✅
- 3.1 → 3.2 ✅
- 4.1 and 4.2 independent of each other ✅

**Database/entity creation:** N/A — no schema changes in this initiative. ✅
**Starter template:** N/A — brownfield. ✅
**Brownfield indicators:** ✅ Story 2.5 is an explicit integration/pipeline verification story.

### Best Practices Compliance Checklist

| Check | Epic 1 | Epic 2 | Epic 3 | Epic 4 |
|---|---|---|---|---|
| Delivers developer/user value | ✅ | ✅ | ✅ | ✅ |
| Functions independently | ✅ | ✅ | ✅ | ✅ |
| Stories appropriately sized | ✅ | ✅ | ✅ | ✅ |
| No forward dependencies | ✅ | ✅ | ✅ | ✅ |
| DB tables created only when needed | N/A | N/A | N/A | N/A |
| Clear Given/When/Then ACs | ✅ | ✅ | ✅ | ✅ |
| FR traceability maintained | ✅ | ✅ | ✅ | ✅ |

### Quality Findings

**🔴 Critical Violations:** None

**🟠 Major Issues:** None

**🟡 Minor Concerns:**
1. Story 2.5 has a 48h monitoring window in its AC (`review CF analytics for 48h post-deployment`). This means the story cannot be fully verified until 48h after deployment. This is inherent to NFR8 and acceptable — flag for the implementer to be aware the story closes 48h post-deploy, not immediately.
2. Story 2.4 consumer verification ("confirmed by grepping CI configs, scripts, and cron definitions") is embedded as an implicit AC precondition rather than an explicit grep command. Recommend the implementer run: `grep -r "promptfoo-eval\|wrangler.promptfoo" .github/ scripts/ *.json` before proceeding with retirement.

**Overall epic quality: PASS with minor notes.**

---

## Summary and Recommendations

### Overall Readiness Status

**✅ READY FOR IMPLEMENTATION**

### Critical Issues Requiring Immediate Action

None. No blockers identified.

### Recommended Next Steps

1. **Note Story 2.5's 48h window** — implementer should be aware that Story 2.5 (pipeline verification) cannot be fully closed until 48h after deployment. Plan accordingly; don't mark the epic complete before the window elapses.
2. **Add explicit promptfoo consumer grep to Story 2.4** — before retiring `promptfoo-eval`, run: `grep -r "promptfoo-eval\|wrangler.promptfoo" .github/ scripts/ *.json` to confirm no CI references exist. This is currently implicit in the AC.
3. **Proceed to Sprint Planning** — run `/bmad-bmm-sprint-planning` in a fresh context window to generate the implementation sprint plan.

### Final Note

This assessment identified **0 critical issues, 0 major issues, and 2 minor concerns** across 6 validation categories (document discovery, PRD analysis, FR coverage, UX alignment, epic quality, dependency analysis).

- FR coverage: 20/20 (100%)
- Epic quality: All 4 epics PASS
- Story quality: All 11 stories PASS
- Dependencies: Clean — no forward references, no circular deps
- UX: Not applicable (infrastructure initiative)

The planning artifacts are complete, aligned, and ready for implementation. The 2 minor concerns are informational notes for the implementer, not blockers.

**Report generated:** `implementation-readiness-report-2026-02-24.md`
**Assessed by:** Winston 🏗️ Architect (Implementation Readiness Workflow)
**Date:** 2026-02-24
