# Proposal: Study Concept Explain

## Intent

Study topic pages at `/study/[category]/[topic]` render technical content as read-only markdown. When a user encounters an unfamiliar term or snippet — e.g., `PRAGMA foreign_keys = ON` in a SQLite article — there is no way to get an in-context explanation without leaving the page.

The `/applications/[id]` page already solves this for job descriptions via a text-selection toolbar + LLM deep-dive. We want the same interaction on study pages: select any text, click "Explain this", receive an LLM-generated explanation scoped to the topic's domain and difficulty level.

## Scope

### In Scope
- New `study_concept_explanations` DB table to cache LLM results per (studyTopicId, selectedText) pair
- New GraphQL mutation `generateStudyConceptExplanation(studyTopicId: ID!, selectedText: String!, context: String): StudyConceptExplanation`
- New GraphQL type `StudyConceptExplanation` with fields: `id`, `selectedText`, `explanation`, `createdAt`
- New `StudyConceptToolbar` component — minimal floating toolbar: select text → "Explain this" button (no link/match features from the app-detail toolbar)
- New `ConceptExplanationDialog` component — Radix UI Dialog rendering the explanation as markdown (ReactMarkdown + remarkGfm)
- Wire the toolbar + dialog into `src/app/study/[category]/[topic]/page.tsx` using the existing `useTextSelection` hook
- Drizzle migration for the new table
- Resolver in `src/apollo/resolvers/study/` that calls Vercel AI SDK (Anthropic) with topic title, difficulty, and category as system context

### Out of Scope
- Persisting explanations per user (anonymous caching only by text hash)
- Linking selected text to existing study topics (that is the app-detail "link" feature)
- Streaming the explanation (full response only for v1)
- Mobile/touch selection support improvements
- Editing or rating explanations

## Approach

Reuse `useTextSelection` as-is — it is already generic and container-scoped. Build a thin `StudyConceptToolbar` that only renders a single "Explain this" button positioned above the selection (same floating-above-selection pattern as `TextSelectionToolbar`). On click, fire the Apollo mutation; while pending show a spinner in the toolbar. On success, open a Radix `Dialog.Root` with the markdown explanation.

The resolver constructs a prompt: system context = study topic title + category + difficulty, user message = `"Explain the following excerpt in that context: <selectedText>"`. Uses Vercel AI SDK `generateText` with `anthropic('claude-3-5-haiku-20241022')` (cheap, fast, sufficient). Caches by `(study_topic_id, sha256(selectedText))` — if an identical explanation already exists return it directly.

GraphQL codegen (`pnpm codegen`) runs after the schema change to produce updated hooks and types.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/db/schema.ts` | Modified | Add `studyConceptExplanations` table |
| `migrations/` | New | Drizzle-generated migration for new table |
| `schema/study/schema.graphql` | Modified | Add `StudyConceptExplanation` type and `generateStudyConceptExplanation` mutation |
| `src/apollo/resolvers/study/` | New | `generate-study-concept-explanation.ts` resolver |
| `src/apollo/resolvers/index.ts` | Modified | Register new resolver |
| `src/components/study/StudyConceptToolbar.tsx` | New | Floating "Explain this" toolbar for study pages |
| `src/components/study/ConceptExplanationDialog.tsx` | New | Dialog rendering explanation markdown |
| `src/app/study/[category]/[topic]/page.tsx` | Modified | Wire up toolbar + dialog + useTextSelection |
| `src/__generated__/` | Regenerated | Updated types/hooks after codegen |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| LLM latency (~2–5s) degrades UX | Med | Show spinner in toolbar; button disabled while pending |
| Duplicate DB rows if two requests race on same text | Low | Unique index on `(study_topic_id, text_hash)`; resolver uses INSERT OR IGNORE + SELECT |
| `window.getSelection()` lost before mutation fires (toolbar click clears selection) | Med | Capture `selectedText` into local state before toolbar renders; do not rely on live selection inside onClick |
| D1 text hash column requires raw SQL for `hex(sha256(...))` | Low | Store hash as app-computed hex string (JS `crypto.subtle.digest`) — no DB-side hash needed |
| Apollo mutation not guarded (unauthenticated cost) | Med | Require valid Clerk session (`context.userId`) in resolver; throw Forbidden if missing |

## Rollback Plan

1. Remove the `generateStudyConceptExplanation` mutation from `schema/study/schema.graphql` and resolver
2. Revert `src/app/study/[category]/[topic]/page.tsx` to the read-only version (single file change)
3. Drop the `study_concept_explanations` table: `wrangler d1 execute nomadically-work-db --remote --command "DROP TABLE IF EXISTS study_concept_explanations;"`
4. Run `pnpm codegen` to regenerate types without the mutation
5. New components (`StudyConceptToolbar`, `ConceptExplanationDialog`) are self-contained — deleting their files is sufficient

The DB table is additive; no existing tables are altered. Rollback has zero impact on job or study data.

## Dependencies

- `crypto.subtle` available in Next.js App Router client components (browser + Node.js 18+ edge runtime)
- Anthropic API key already configured (`ANTHROPIC_API_KEY` in `.env.local` / Vercel env)
- Vercel AI SDK (`@ai-sdk/anthropic`) already in `package.json`
- Clerk auth context already threaded through `GraphQLContext`

## Success Criteria

- [ ] User can select any text on a study topic page, see the "Explain this" toolbar appear, click it, and receive a markdown explanation in a dialog within 10 seconds
- [ ] Explanation is scoped to the topic's category and difficulty (system prompt includes that context, visible in Langfuse traces)
- [ ] Identical selected text on the same topic returns the cached DB result (no second LLM call)
- [ ] Unauthenticated requests to the mutation return a 403-equivalent GraphQL error
- [ ] `pnpm build` passes with no new type errors
- [ ] `pnpm lint` passes with no new warnings
