# Design: Study Concept Explain

## Technical Approach

Add a text-selection-triggered "Explain this" feature to study topic pages (`/study/[category]/[topic]`). Reuses the existing `useTextSelection` hook unchanged. A new `StudyConceptToolbar` renders a single button above the selection; on click it fires a GraphQL mutation that either returns a cached explanation from D1 or generates one via Vercel AI SDK (`anthropic('claude-3-5-haiku-20241022')`). The result displays in a Radix Dialog with ReactMarkdown.

Follows existing patterns: Drizzle schema + migration for caching, GraphQL schema extension in `schema/study/schema.graphql`, resolver in `src/apollo/resolvers/study-topics.ts` (extend existing file), components in `src/components/study/`.

## Architecture Decisions

### Decision: Extend study-topics resolver vs new resolver file

**Choice**: Add the mutation to the existing `src/apollo/resolvers/study-topics.ts`
**Alternatives considered**: Create `src/apollo/resolvers/study/generate-study-concept-explanation.ts` (new directory + file)
**Rationale**: The existing `study-topics.ts` is small (53 lines) and already handles all study topic concerns. A separate directory would be premature for one mutation. The proposal mentions `src/apollo/resolvers/study/` but the codebase has no such directory — follow the existing flat structure.

### Decision: Hash computation in JS, not SQL

**Choice**: Compute SHA-256 in the resolver using Node.js `crypto.subtle.digest`, store as hex string in `text_hash` column
**Alternatives considered**: D1 `hex(sha256(...))` — not available in SQLite/D1
**Rationale**: `crypto.subtle` is available in both Node.js 18+ and Cloudflare Workers. No DB-side hash function needed. The hash is computed once on insert and used for lookups.

### Decision: Anthropic Haiku via Vercel AI SDK

**Choice**: `generateText` from `ai` with `anthropic('claude-3-5-haiku-20241022')`
**Alternatives considered**: DeepSeek (used by `generateTopicDeepDive`), OpenRouter
**Rationale**: Haiku is cheap (~$0.25/1M input tokens), fast (<2s typical), and sufficient for single-concept explanations. The project already has `@ai-sdk/anthropic` and `ANTHROPIC_API_KEY` configured. DeepSeek Reasoner is overkill for short explanations.

### Decision: INSERT OR IGNORE + SELECT for cache upsert

**Choice**: Use `INSERT INTO ... ON CONFLICT DO NOTHING` followed by a SELECT on `(study_topic_id, text_hash)`
**Alternatives considered**: Check-then-insert (race condition), INSERT OR REPLACE (overwrites)
**Rationale**: The unique index on `(study_topic_id, text_hash)` prevents duplicates. If two concurrent requests race, the second INSERT is silently ignored and both SELECTs return the same row.

### Decision: No streaming for v1

**Choice**: Full `generateText` response, displayed after completion
**Alternatives considered**: `streamText` with progressive rendering
**Rationale**: Explanations are short (200-500 tokens). The added complexity of streaming subscriptions/SSE is not justified. Spinner in toolbar provides adequate UX feedback.

## Data Flow

```
User selects text on study topic page
        │
        ▼
useTextSelection hook → { selectedText, selectionRect }
        │
        ▼
StudyConceptToolbar renders above selection
        │ (click "Explain this")
        ▼
Apollo mutation: generateStudyConceptExplanation
        │
        ▼
Resolver (study-topics.ts)
        │
        ├─ Compute SHA-256(selectedText)
        ├─ SELECT from study_concept_explanations WHERE (study_topic_id, text_hash)
        │
        ├─ [Cache HIT] → return cached row
        │
        └─ [Cache MISS]
            ├─ Fetch study topic (title, category, difficulty) from DB
            ├─ generateText({ model: haiku, system: topic context, prompt: selectedText })
            ├─ INSERT explanation into study_concept_explanations
            └─ Return new row
        │
        ▼
ConceptExplanationDialog opens with markdown explanation
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/db/schema.ts` | Modify | Add `studyConceptExplanations` table definition |
| `migrations/0023_add_study_concept_explanations.sql` | Create | SQL migration for new table + unique index |
| `schema/study/schema.graphql` | Modify | Add `StudyConceptExplanation` type and `generateStudyConceptExplanation` mutation |
| `src/apollo/resolvers/study-topics.ts` | Modify | Add mutation resolver with cache-check + LLM call |
| `src/components/study/StudyConceptToolbar.tsx` | Create | Floating toolbar with "Explain this" button |
| `src/components/study/ConceptExplanationDialog.tsx` | Create | Radix Dialog rendering explanation as markdown |
| `src/app/study/[category]/[topic]/page.tsx` | Modify | Wire up useTextSelection, toolbar, dialog, and mutation |
| `src/__generated__/*` | Regenerated | `pnpm codegen` after schema changes |

## Interfaces / Contracts

### DB Schema (Drizzle)

```ts
// src/db/schema.ts
export const studyConceptExplanations = sqliteTable(
  "study_concept_explanations",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    study_topic_id: integer("study_topic_id")
      .notNull()
      .references(() => studyTopics.id, { onDelete: "cascade" }),
    text_hash: text("text_hash").notNull(), // SHA-256 hex of selected_text
    selected_text: text("selected_text").notNull(),
    explanation_md: text("explanation_md").notNull(),
    created_at: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (table) => ({
    topicHashIdx: uniqueIndex("idx_study_concept_explanations_topic_hash")
      .on(table.study_topic_id, table.text_hash),
  }),
);
```

### Migration SQL (`migrations/0023_add_study_concept_explanations.sql`)

```sql
CREATE TABLE `study_concept_explanations` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `study_topic_id` integer NOT NULL REFERENCES `study_topics`(`id`) ON DELETE CASCADE,
  `text_hash` text NOT NULL,
  `selected_text` text NOT NULL,
  `explanation_md` text NOT NULL,
  `created_at` text NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX `idx_study_concept_explanations_topic_hash`
  ON `study_concept_explanations` (`study_topic_id`, `text_hash`);
```

### GraphQL Schema Extension

```graphql
# schema/study/schema.graphql (additions)

type StudyConceptExplanation {
  id: ID!
  selectedText: String!
  explanation: String!
  createdAt: DateTime!
}

extend type Mutation {
  generateStudyConceptExplanation(
    studyTopicId: ID!
    selectedText: String!
    context: String
  ): StudyConceptExplanation!
}
```

- `studyTopicId` — the DB id of the study topic the user is reading
- `selectedText` — the text the user highlighted (max ~2000 chars, enforced in resolver)
- `context` — optional surrounding paragraph text for better LLM grounding (not stored, not cached)
- Returns the explanation object (cached or freshly generated)

### Resolver Shape

```ts
// Added to studyTopicResolvers.Mutation in src/apollo/resolvers/study-topics.ts
async generateStudyConceptExplanation(
  _: unknown,
  args: { studyTopicId: string; selectedText: string; context?: string },
  context: GraphQLContext,
) {
  // 1. Auth guard
  if (!context.userId) throw new Error("Forbidden");

  // 2. Validate input length
  const text = args.selectedText.trim();
  if (!text || text.length > 2000) throw new Error("Selected text must be 1-2000 characters");

  // 3. Compute hash
  const hash = await sha256Hex(text);

  // 4. Check cache
  const topicId = parseInt(args.studyTopicId, 10);
  const [cached] = await context.db
    .select()
    .from(studyConceptExplanations)
    .where(and(
      eq(studyConceptExplanations.study_topic_id, topicId),
      eq(studyConceptExplanations.text_hash, hash),
    ))
    .limit(1);
  if (cached) return mapExplanation(cached);

  // 5. Fetch topic for LLM context
  const [topic] = await context.db
    .select()
    .from(studyTopics)
    .where(eq(studyTopics.id, topicId))
    .limit(1);
  if (!topic) throw new Error("Study topic not found");

  // 6. Generate explanation
  const { text: explanation } = await generateText({
    model: anthropic("claude-3-5-haiku-20241022"),
    system: `You are a technical instructor...`, // see LLM Prompt section
    prompt: `Explain: "${text}"`,
  });

  // 7. Cache result (INSERT OR IGNORE for race safety)
  await context.db.insert(studyConceptExplanations).values({
    study_topic_id: topicId,
    text_hash: hash,
    selected_text: text,
    explanation_md: explanation,
  }).onConflictDoNothing();

  // 8. Read back (in case a concurrent insert won the race)
  const [row] = await context.db
    .select()
    .from(studyConceptExplanations)
    .where(and(
      eq(studyConceptExplanations.study_topic_id, topicId),
      eq(studyConceptExplanations.text_hash, hash),
    ))
    .limit(1);

  return mapExplanation(row!);
}
```

Helper:

```ts
async function sha256Hex(input: string): Promise<string> {
  const encoded = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function mapExplanation(row: typeof studyConceptExplanations.$inferSelect) {
  return {
    id: String(row.id),
    selectedText: row.selected_text,
    explanation: row.explanation_md,
    createdAt: row.created_at,
  };
}
```

### LLM Prompt

System prompt (constructed per-request with topic metadata):

```
You are a technical instructor explaining a concept to a software engineer studying for interviews.

Topic context:
- Title: {topic.title}
- Category: {topic.category}
- Difficulty: {topic.difficulty}

Explain the selected excerpt clearly and concisely in the context of this topic. Use markdown formatting. Keep the explanation focused — 3-8 paragraphs max. Include a short code example if relevant. Do not repeat the selected text back verbatim.
```

User prompt:

```
Explain the following excerpt:

"{selectedText}"

{args.context ? `\nSurrounding context:\n${args.context}` : ""}
```

### Component: StudyConceptToolbar

```tsx
// src/components/study/StudyConceptToolbar.tsx
"use client";

interface StudyConceptToolbarProps {
  selectedText: string;
  selectionRect: DOMRect | null;
  isLoading: boolean;
  onExplain: (text: string) => void;
}
```

Positioning: same pattern as `TextSelectionToolbar` — `position: absolute`, top = `selectionRect.top + window.scrollY - 50`, left = centered on selection. Single button: "Explain this" (Radix `Button` size="1" color="blue"). Disabled + spinner text while `isLoading`. Renders `null` when no selection.

### Component: ConceptExplanationDialog

```tsx
// src/components/study/ConceptExplanationDialog.tsx
"use client";

interface ConceptExplanationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedText: string;
  explanation: string | null;
}
```

Uses Radix `Dialog.Root` / `Dialog.Content`. Title shows truncated `selectedText`. Body renders `explanation` via `ReactMarkdown` with `remarkGfm`. Close button in top-right.

### Study Topic Page Wiring

In `src/app/study/[category]/[topic]/page.tsx`:

1. Add `useRef<HTMLDivElement>(null)` for the markdown content container
2. Call `useTextSelection(containerRef)`
3. Use generated `useGenerateStudyConceptExplanationMutation` hook from codegen
4. Track `explanationDialogOpen` and `currentExplanation` in local state
5. Capture `selectedText` into a ref/state before firing mutation (selection may clear on click)
6. Render `StudyConceptToolbar` and `ConceptExplanationDialog` as siblings inside the page

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Manual | Full flow: select text, click explain, see dialog | Dev server with a seeded study topic |
| Build | No new type errors | `pnpm build` passes |
| Lint | No new warnings | `pnpm lint` passes |
| Codegen | Types regenerated correctly | `pnpm codegen` produces expected mutation hook |

No unit tests needed for v1 — the resolver is a thin LLM wrapper with caching; the components are UI-only. If evals are added later, they would test LLM explanation quality via Promptfoo.

## Migration / Rollout

1. Run `pnpm db:generate` after adding the Drizzle schema to verify migration file content
2. Apply: `wrangler d1 execute nomadically-work-db --remote --file migrations/0023_add_study_concept_explanations.sql`
3. Run `pnpm codegen` after GraphQL schema changes
4. Deploy via `pnpm deploy` — the new mutation and components ship together

No feature flag needed. The toolbar only appears on study pages when text is selected. The new table is additive with no impact on existing data.

## Open Questions

None — all technical decisions are resolved. The proposal covers scope, and existing codebase patterns provide clear implementation paths.
