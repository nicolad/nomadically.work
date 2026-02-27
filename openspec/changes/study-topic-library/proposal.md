# Proposal: Study Topic Library

## Intent

The interview prep ReactFlow graph at `/prep/[key]` surfaces study topic nodes (e.g., "ACID") that are meant to link out to authoritative reference pages. Currently there is a hardcoded `TOPIC_PREP_URLS` map in `src/components/interview-prep-flow.tsx` pointing to `/prep/db/acid` — a path that does not exist and returns a 404. The broader gap is that there is no topic library at all: no route, no DB table, no GraphQL type for topics.

This change introduces a dynamic topic library at `/study/[category]/[topic]` (e.g., `/study/db/acid`) with a small seed of curated topics, fixes the broken link in the graph, and creates the GraphQL/DB layer that allows topics to be authored and retrieved by slug. This unblocks the interview prep flow from being a dead-end and makes study material a first-class resource in the app.

## Scope

### In Scope

- New D1 table `study_topics` with Drizzle schema: `category`, `topic` (slug), `title`, `body_md` (Markdown), `summary`, `tags`, `difficulty`
- New Drizzle migration file for `study_topics`
- New GraphQL types, queries in `schema/study/schema.graphql`: `StudyTopic`, `studyTopic(category, topic)`, `studyTopics(category)`
- New Apollo resolvers in `src/apollo/resolvers/study-topics.ts` using Drizzle + D1 (no mock data)
- New Next.js App Router route `src/app/study/[category]/[topic]/page.tsx` — server-side data fetch, Markdown render via `react-markdown`
- New `src/app/study/[category]/page.tsx` — category index page listing topics within a category
- Seed script or migration data for the initial `db` category with topic `acid` (ACID properties)
- Fix `TOPIC_PREP_URLS` in `src/components/interview-prep-flow.tsx`: change `/prep/db/acid` → `/study/db/acid`
- `pnpm codegen` after schema additions

### Out of Scope

- Tracks system DB migration (mock data stays as-is; this change does not touch `Track`/`TrackItem`)
- Admin UI for authoring topics (write path is migration seeds only for now)
- AI-generated topic content (no LLM calls in this change)
- Full-text search across topics
- User progress tracking per topic
- Linking topics to the `jobSkillTags` taxonomy
- `/study` root index page (deferred to a follow-on)

## Approach

### Data model

Add a `study_topics` SQLite table via Drizzle:

```
study_topics
  id            INTEGER PK autoincrement
  category      TEXT NOT NULL         -- e.g. "db"
  topic         TEXT NOT NULL         -- slug e.g. "acid"
  title         TEXT NOT NULL         -- display title
  summary       TEXT                  -- one-paragraph summary for list views
  body_md       TEXT                  -- full Markdown body
  difficulty    TEXT CHECK IN ('beginner','intermediate','advanced') DEFAULT 'intermediate'
  tags          TEXT                  -- JSON array of tag strings
  created_at    TEXT DEFAULT datetime('now')
  updated_at    TEXT DEFAULT datetime('now')
  UNIQUE (category, topic)
```

Initial seed row: category=`db`, topic=`acid`, body covering Atomicity/Consistency/Isolation/Durability.

### GraphQL

Add `schema/study/schema.graphql` with:
- `type StudyTopic` (id, category, topic, title, summary, bodyMd, difficulty, tags, createdAt)
- `extend type Query { studyTopic(category: String!, topic: String!): StudyTopic, studyTopics(category: String!): [StudyTopic!]! }`

Resolvers in `src/apollo/resolvers/study-topics.ts` use `context.db` (Drizzle) with `eq(studyTopics.category, ...)` + `eq(studyTopics.topic, ...)`.

### Pages

`/study/[category]/[topic]/page.tsx` — fetches via Apollo (or direct Drizzle in a server component) and renders `bodyMd` with `react-markdown` + `remark-gfm` (already installed for applications page). Shows title, difficulty badge, tags, back link to category.

`/study/[category]/page.tsx` — lists all topics in a category as cards with title + summary.

### Fix broken link

Change `TOPIC_PREP_URLS` in `src/components/interview-prep-flow.tsx`:
```ts
const TOPIC_PREP_URLS: Record<string, string> = {
  acid: "/study/db/acid",
};
```

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/db/schema.ts` | Modified | Add `studyTopics` table export |
| `migrations/` | New | Drizzle migration for `study_topics` table |
| `schema/study/schema.graphql` | New | `StudyTopic` type + queries |
| `src/apollo/resolvers/study-topics.ts` | New | Query resolvers against D1 |
| `src/app/api/graphql/route.ts` | Modified | Register study-topics resolvers |
| `src/app/study/[category]/[topic]/page.tsx` | New | Topic detail page |
| `src/app/study/[category]/page.tsx` | New | Category index page |
| `src/__generated__/` | Regenerated | `pnpm codegen` output after schema change |
| `src/components/interview-prep-flow.tsx` | Modified | Fix TOPIC_PREP_URLS path |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Migration applied to remote D1 before seed data, leaving no topics | Med | Include seed INSERT in same migration file or a separate seed migration |
| `pnpm codegen` fails due to new schema file not being picked up | Low | Verify `codegen.ts` glob includes `schema/**/*.graphql` (it does) |
| TopicNode `href` in ReactFlow navigates away from the prep graph mid-session | Low | TopicNode already handles `href` as an optional external link; update to open in new tab |
| Route `/study/[category]/[topic]` conflicts with future routes | Low | Category + topic slug pair is narrow; no known conflicts |

## Rollback Plan

1. Revert `src/components/interview-prep-flow.tsx` TOPIC_PREP_URLS to the old path (or remove the `acid` entry entirely — the node still renders, just without a link).
2. Drop the `study_topics` table from D1: `wrangler d1 execute nomadically-work-db --remote --command "DROP TABLE IF EXISTS study_topics;"`.
3. Delete `src/app/study/`, `schema/study/`, `src/apollo/resolvers/study-topics.ts`, and the Drizzle migration file.
4. Re-run `pnpm codegen` to remove generated types.
5. Remove resolver registration from `src/app/api/graphql/route.ts`.

No user-visible data is lost — the table only contains curated seed content.

## Dependencies

- `react-markdown` and `remark-gfm` are already in `package.json` (used in `src/app/applications/[id]/page.tsx`)
- Drizzle ORM + D1 HTTP client already configured
- `pnpm codegen` must be run after schema additions before the route can use typed hooks

## Success Criteria

- [ ] `/study/db/acid` returns a 200 with rendered ACID properties content
- [ ] `/study/db` returns a 200 listing at least the ACID topic card
- [ ] Clicking the "ACID" topic node in the ReactFlow graph at `/prep/[key]` navigates to `/study/db/acid` (not a 404)
- [ ] `pnpm build` passes with no new errors
- [ ] `studyTopic(category: "db", topic: "acid")` GraphQL query resolves from D1 (not mock data)
- [ ] `src/components/interview-prep-flow.tsx` TOPIC_PREP_URLS entry is updated to `/study/db/acid`
