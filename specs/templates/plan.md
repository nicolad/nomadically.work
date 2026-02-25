# Plan: {spec-title}

> Spec: `specs/active/{slug}/spec.md`
> Author: Architect
> Date: {date}

---

## Technical Approach

_High-level strategy. How will this be built?_

## Component Design

_What components/modules are involved? Show the boundaries._

### New Components

| Component | Location | Responsibility |
|---|---|---|
| {name} | `src/{path}` | {what it does} |

### Modified Components

| Component | Location | Change |
|---|---|---|
| {name} | `src/{path}` | {what changes} |

## Data Flow

_How does data move through the system for this feature?_

```
{source} → {transform} → {destination}
```

## Schema Changes

_GraphQL schema, Drizzle schema, or API contract changes._

### GraphQL

```graphql
# New types/fields/mutations
```

### Database

```typescript
// New Drizzle columns/tables
```

## File Ownership

_Who touches what? Prevents teammate conflicts._

| Teammate | Files |
|---|---|
| Dev | `src/{paths}` |
| Dev | `workers/{paths}` |

## Architecture Decisions

_Key decisions and their rationale. Reference constraints from constitution._

| Decision | Rationale | Alternatives Considered |
|---|---|---|
| {decision} | {why} | {what else was considered} |

## Risk & Mitigation

| Risk | Mitigation |
|---|---|
| {risk} | {mitigation} |

## Dependencies

_What must exist before implementation can start?_

- [ ] {dependency — e.g., "D1 migration applied", "codegen run"}

---

_Architect: After completing this plan, update `status.yaml` to `in-progress` and create `tasks.md` for the Dev._
