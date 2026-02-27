# Design: Study Topic Library

## Technical Approach

Add a `study_topics` D1 table via Drizzle, expose it through GraphQL, and render topics at `/study/[category]/[topic]` using the existing `react-markdown` + `remark-gfm` stack. The approach follows existing codebase patterns exactly: Drizzle schema definition in `src/db/schema.ts`, resolver file merged into the root resolver map via `lodash.merge`, GraphQL schema in a new `schema/study/` directory picked up by the `schema/**/*.graphql` glob in `codegen.ts`, and App Router pages as client components fetching via Apollo hooks.

## Architecture Decisions

### Decision: Drizzle schema in `src/db/schema.ts` (not a separate file)

**Choice**: Add `studyTopics` table definition to the existing `src/db/schema.ts` file.
**Alternatives considered**: Separate `src/db/study-topics-schema.ts` file.
**Rationale**: Every other table (jobs, companies, contacts, resumes, etc.) is defined in the single `schema.ts` file. Following this pattern avoids import fragmentation and keeps the Drizzle config simple.

### Decision: Seed data via SQL migration (not a seed script)

**Choice**: Include `INSERT INTO study_topics ...` statements in the same migration file that creates the table.
**Alternatives considered**: Separate `pnpm db:seed` script; separate seed migration file.
**Rationale**: The proposal identifies a risk of "migration applied before seed data." Bundling the CREATE TABLE and initial INSERT in one migration file guarantees atomicity. The seed is small (one row for `db/acid`), so a dedicated script adds complexity for no benefit.

### Decision: Client component pages with Apollo hooks

**Choice**: `/study/[category]/[topic]/page.tsx` and `/study/[category]/page.tsx` as `"use client"` components fetching via generated Apollo hooks.
**Alternatives considered**: React Server Components with direct Drizzle queries.
**Rationale**: The codebase consistently uses client components with Apollo hooks for data fetching (see `src/app/prep/[key]/page.tsx`, `src/app/applications/page.tsx`). Server components would require a different data-fetching pattern and wouldn't benefit from the Apollo cache. Following the existing pattern keeps the codebase consistent.

### Decision: No DataLoader for study topics

**Choice**: Direct Drizzle queries in resolvers without DataLoader.
**Alternatives considered**: Adding a study topics DataLoader to `src/apollo/loaders.ts`.
**Rationale**: Study topic queries are always by exact `(category, topic)` pair or by `category` list. There is no N+1 risk since these are top-level Query resolvers, not field resolvers on a parent type. DataLoader would add unnecessary complexity.

### Decision: Composite unique index on `(category, topic)` instead of a single slug column

**Choice**: Two separate columns `category` + `topic` with a UNIQUE constraint.
**Alternatives considered**: Single `slug` column like `"db/acid"`.
**Rationale**: Separate columns enable the `studyTopics(category)` query to filter by category efficiently with a simple `WHERE category = ?` using the composite index prefix. URL routing also naturally maps to two dynamic segments: `/study/[category]/[topic]`.

## Data Flow

```
Browser ──GET /study/db/acid──→ Next.js App Router (client component)
                                     │
                                     ├── Apollo useQuery(STUDY_TOPIC_QUERY)
                                     │
                                     ▼
                              /api/graphql (Apollo Server)
                                     │
                                     ├── studyTopicResolver
                                     │   └── context.db.select().from(studyTopics)
                                     │       .where(eq(category) AND eq(topic))
                                     │
                                     ▼
                              D1 Gateway Worker ──→ D1 Database
                                     │
                                     ▼
                              StudyTopic { bodyMd: "..." }
                                     │
                                     ▼
                              <ReactMarkdown> renders bodyMd
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/db/schema.ts` | Modify | Add `studyTopics` table definition with columns: id, category, topic, title, summary, body_md, difficulty, tags, created_at, updated_at |
| `migrations/0022_add_study_topics.sql` | Create | CREATE TABLE + UNIQUE index + seed INSERT for db/acid |
| `schema/study/schema.graphql` | Create | `StudyTopic` type, `studyTopic(category, topic)` query, `studyTopics(category)` query |
| `src/apollo/resolvers/study-topics.ts` | Create | Query resolvers using Drizzle against D1 |
| `src/apollo/resolvers.ts` | Modify | Import and merge `studyTopicResolvers` |
| `src/app/study/[category]/[topic]/page.tsx` | Create | Topic detail page with ReactMarkdown rendering |
| `src/app/study/[category]/page.tsx` | Create | Category index page listing topic cards |
| `src/graphql/study-topics.ts` | Create | GraphQL query documents for codegen to generate typed hooks |
| `src/components/interview-prep-flow.tsx` | Modify | Change `TOPIC_PREP_URLS.acid` from `/prep/db/acid` to `/study/db/acid` |
| `src/__generated__/*` | Regenerated | Output of `pnpm codegen` |

## Interfaces / Contracts

### Drizzle schema (`src/db/schema.ts`)

```ts
export const studyTopics = sqliteTable("study_topics", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  category: text("category").notNull(),
  topic: text("topic").notNull(),
  title: text("title").notNull(),
  summary: text("summary"),
  body_md: text("body_md"),
  difficulty: text("difficulty", {
    enum: ["beginner", "intermediate", "advanced"],
  }).notNull().default("intermediate"),
  tags: text("tags"), // JSON array of strings
  created_at: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updated_at: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
}, (table) => ({
  categoryTopicIdx: uniqueIndex("idx_study_topics_category_topic")
    .on(table.category, table.topic),
}));

export type StudyTopic = typeof studyTopics.$inferSelect;
export type NewStudyTopic = typeof studyTopics.$inferInsert;
```

### GraphQL schema (`schema/study/schema.graphql`)

```graphql
type StudyTopic {
  id: ID!
  category: String!
  topic: String!
  title: String!
  summary: String
  bodyMd: String
  difficulty: String!
  tags: [String!]!
  createdAt: DateTime!
}

extend type Query {
  studyTopic(category: String!, topic: String!): StudyTopic
  studyTopics(category: String!): [StudyTopic!]!
}
```

### Resolver shape (`src/apollo/resolvers/study-topics.ts`)

```ts
import type { GraphQLContext } from "../context";
import { eq, and } from "drizzle-orm";
import { studyTopics } from "@/db/schema";

export const studyTopicResolvers = {
  Query: {
    studyTopic: async (
      _: unknown,
      args: { category: string; topic: string },
      context: GraphQLContext,
    ) => {
      const rows = await context.db
        .select()
        .from(studyTopics)
        .where(
          and(
            eq(studyTopics.category, args.category),
            eq(studyTopics.topic, args.topic),
          ),
        )
        .limit(1);
      return rows[0] ?? null;
    },

    studyTopics: async (
      _: unknown,
      args: { category: string },
      context: GraphQLContext,
    ) => {
      return context.db
        .select()
        .from(studyTopics)
        .where(eq(studyTopics.category, args.category));
    },
  },

  StudyTopic: {
    tags(parent: any) {
      if (!parent.tags) return [];
      try { return JSON.parse(parent.tags); }
      catch { return []; }
    },
  },
};
```

### GraphQL query documents (`src/graphql/study-topics.ts`)

```ts
import { gql } from "@/__generated__";

export const STUDY_TOPIC_QUERY = gql(`
  query StudyTopic($category: String!, $topic: String!) {
    studyTopic(category: $category, topic: $topic) {
      id
      category
      topic
      title
      summary
      bodyMd
      difficulty
      tags
      createdAt
    }
  }
`);

export const STUDY_TOPICS_QUERY = gql(`
  query StudyTopics($category: String!) {
    studyTopics(category: $category) {
      id
      topic
      title
      summary
      difficulty
      tags
    }
  }
`);
```

### Migration SQL (`migrations/0022_add_study_topics.sql`)

```sql
CREATE TABLE `study_topics` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `category` text NOT NULL,
  `topic` text NOT NULL,
  `title` text NOT NULL,
  `summary` text,
  `body_md` text,
  `difficulty` text NOT NULL DEFAULT 'intermediate',
  `tags` text,
  `created_at` text NOT NULL DEFAULT (datetime('now')),
  `updated_at` text NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX `idx_study_topics_category_topic` ON `study_topics` (`category`, `topic`);

INSERT INTO `study_topics` (`category`, `topic`, `title`, `summary`, `body_md`, `difficulty`, `tags`)
VALUES (
  'db',
  'acid',
  'ACID Properties',
  'The four guarantees that database transactions provide: Atomicity, Consistency, Isolation, and Durability.',
  '# ACID Properties

ACID is an acronym describing four key properties that database transactions must guarantee to ensure data integrity, even in the face of errors, power failures, or concurrent access.

## Atomicity

A transaction is an **all-or-nothing** operation. Either every statement in the transaction succeeds, or none of them take effect. If any part fails, the entire transaction is rolled back to its previous state.

**Example:** Transferring money between accounts — both the debit and credit must succeed, or neither should.

```sql
BEGIN TRANSACTION;
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
UPDATE accounts SET balance = balance + 100 WHERE id = 2;
COMMIT;
-- If either UPDATE fails, both are rolled back
```

## Consistency

A transaction moves the database from one **valid state** to another valid state. All defined rules — constraints, cascades, triggers — are enforced. If a transaction would violate any integrity constraint, it is aborted.

**Key points:**
- Foreign key constraints remain valid
- CHECK constraints are enforced
- NOT NULL and UNIQUE constraints hold
- Application-level invariants (e.g., "total balance across all accounts is constant") are preserved

## Isolation

Concurrent transactions execute as if they were **serialized** — each transaction is unaware of other in-flight transactions. The degree of isolation is configurable via isolation levels:

| Level | Dirty Read | Non-Repeatable Read | Phantom Read |
|-------|-----------|-------------------|-------------|
| Read Uncommitted | Possible | Possible | Possible |
| Read Committed | No | Possible | Possible |
| Repeatable Read | No | No | Possible |
| Serializable | No | No | No |

**Trade-off:** Higher isolation = more correctness but lower concurrency and throughput.

## Durability

Once a transaction is **committed**, its changes are permanent — they survive system crashes, power failures, and restarts. This is typically implemented via write-ahead logging (WAL) or journaling.

**Implementation mechanisms:**
- Write-Ahead Log (WAL) — changes written to log before data files
- Checkpointing — periodic flushing of in-memory state to disk
- Replication — copies on multiple nodes for fault tolerance

## ACID in Practice

### SQLite (D1)
SQLite provides full ACID compliance using a journal file or WAL mode. Each transaction is atomic, and the database file is always in a consistent state.

### PostgreSQL
Full ACID with MVCC (Multi-Version Concurrency Control) for isolation. Default isolation level is Read Committed.

### NoSQL Trade-offs
Many NoSQL databases relax ACID guarantees for better performance and scalability (see BASE: Basically Available, Soft state, Eventually consistent).

## Interview Tips

- Be ready to explain each letter with a concrete example
- Understand the trade-off between isolation levels and performance
- Know when ACID is overkill (e.g., analytics pipelines, event logs)
- Be able to compare ACID vs BASE and when each is appropriate
- Mention WAL as the standard durability mechanism
',
  'intermediate',
  '["databases", "transactions", "consistency", "interviews"]'
);
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `StudyTopic.tags` JSON parsing field resolver | Call resolver with valid JSON, invalid JSON, and null; verify array output |
| Integration | `studyTopic(category, topic)` query end-to-end | GraphQL integration test: query against seeded D1 data, verify response shape |
| Manual | `/study/db/acid` renders correctly | `pnpm dev` + browser check: title, markdown rendering, difficulty badge, tags |
| Manual | Prep flow link works | Navigate to `/prep/[key]`, click ACID topic node, verify it navigates to `/study/db/acid` |

## Migration / Rollout

1. Run `pnpm db:generate` to create the migration file (or write manually as `0022_add_study_topics.sql`)
2. Apply locally: `pnpm db:migrate`
3. Apply to remote D1: `pnpm db:push` (or `wrangler d1 execute nomadically-work-db --remote --file migrations/0022_add_study_topics.sql`)
4. Run `pnpm codegen` after adding `schema/study/schema.graphql`
5. Deploy app to Vercel

Seed data is bundled in the migration, so the table is never empty after migration.

## Open Questions

- [x] Migration file number — use `0022` (next after `0021_restore_classification_columns.sql`). If Drizzle generates a different name, rename accordingly.
- [ ] Should the ACID topic node in the ReactFlow graph open `/study/db/acid` in a new tab (proposal notes this risk)? Current `TopicNode` uses `href` as a same-page navigation. Recommend: keep same-tab navigation for now since `/study` is part of the same app.
