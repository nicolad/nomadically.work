# Spec Constitution

Governing principles for spec-driven development at nomadically.work.
All specs, plans, and implementations must conform to these rules.

---

## Core Principles

### 1. Intent Before Implementation

Every change starts with a spec that captures **what** and **why** before anyone writes **how**. Code without a spec is tech debt by default.

### 2. Specs Are Executable Contracts

A spec is not documentation — it is a living contract that drives implementation, validation, and acceptance. If the spec says it, the code must do it. If the code does something the spec doesn't say, either the spec is incomplete or the code is wrong.

### 3. Team Roles Own Spec Phases

| Phase | Owner | Output |
|---|---|---|
| Specify | PM | `spec.md` — requirements, constraints, success criteria |
| Clarify | PM + Architect | Updated `spec.md` — resolved ambiguities |
| Plan | Architect | `plan.md` — technical design, components, data flow |
| Tasks | Architect → Dev | `tasks.md` — ordered implementation steps |
| Analyze | QA | `analysis.md` — consistency, coverage, risk assessment |
| Implement | Dev | Code changes tracked in `status.yaml` |
| Validate | QA | Updated `status.yaml` — pass/fail against spec |

### 4. Single Source of Truth

Each spec lives in `specs/active/{slug}/` and is the authoritative reference for that unit of work. Stories, PRDs, and architecture docs may reference specs but never contradict them.

### 5. No Spec, No Merge

Code changes that lack a corresponding spec (or reference to an existing spec) should be challenged during review. Exceptions: typo fixes, dependency bumps, and emergency hotfixes (which get a retroactive spec).

---

## Spec Lifecycle States

```
draft → ready → in-progress → review → completed
                                  ↘ rejected
                                  ↘ deferred
```

| State | Meaning |
|---|---|
| `draft` | PM is still writing; not ready for team review |
| `ready` | Spec is complete and approved for planning |
| `in-progress` | Architect is planning or Dev is implementing |
| `review` | QA is validating the implementation against the spec |
| `completed` | All acceptance criteria met; spec moves to `specs/completed/` |
| `rejected` | Spec was reviewed and rejected; moves to `specs/rejected/` with reason |
| `deferred` | Spec is valid but deprioritized; stays in `specs/active/` with deferred state |

---

## Constraints

These constraints apply to all specs in this repository:

### Technical Boundaries (from CLAUDE.md)

- Database: Cloudflare D1 (SQLite) only — no Postgres, no MySQL
- ORM: Drizzle ORM — no raw SQL in application code
- API: Apollo Server 5 with GraphQL codegen
- Frontend: Next.js 16 App Router, React 19, Radix UI
- Auth: Clerk — admin mutations require `isAdminEmail()` guard
- Workers: Cloudflare Workers (TypeScript/Rust/Python), Trigger.dev v3

### Quality Bars

- AI classification accuracy: >= 80% eval bar (`pnpm test:eval`)
- Type safety: no new `any` types in resolvers
- Security: auth guards on all admin mutations, input validation at boundaries
- Performance: no N+1 queries, use DataLoaders, batch D1 queries
- Build: `pnpm lint` and `pnpm build` must pass

### Process Rules

- Teammates must not edit the same files — break ownership by directory/module
- Use plan approval on teammates before implementation
- Quality gates: teammates reference `_bmad/checklists.md` before marking tasks complete
- Specs reference the Optimization Strategy (`OPTIMIZATION-STRATEGY.md`) for eval-first and grounding-first patterns

---

## Spec Sizing

| Size | Scope | Expected Phases |
|---|---|---|
| **S** | Single file change, bug fix, config tweak | Specify → Implement → Validate |
| **M** | Multiple files, new resolver, UI component | Specify → Plan → Tasks → Implement → Validate |
| **L** | Cross-cutting feature, new subsystem, migration | Full lifecycle with Analyze phase |
| **XL** | Multi-sprint epic, architectural change | Split into multiple M/L specs first |

XL specs must be decomposed before entering `ready` state.
