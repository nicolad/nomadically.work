# Tasks: Study Concept Explain

## Phase 1: Foundation — DB Schema + Migration

- [x] 1.1 Add `studyConceptExplanations` table to `src/db/schema.ts`: define columns `id` (integer PK autoincrement), `study_topic_id` (integer, FK to `studyTopics.id` ON DELETE CASCADE), `text_hash` (text, not null), `selected_text` (text, not null), `explanation_md` (text, not null), `created_at` (text, not null, default `(datetime('now'))`); add `uniqueIndex("idx_study_concept_explanations_topic_hash")` on `(study_topic_id, text_hash)`.
  - Ref: design.md § DB Schema (Drizzle), specs/schema/spec.md § study_concept_explanations Table
  - Follow pattern of `sqliteTable` + `uniqueIndex` already used in `src/db/schema.ts`

- [x] 1.2 Run `pnpm db:generate` to produce the Drizzle migration file; verify it matches the SQL in design.md § Migration SQL. Rename the generated file to `migrations/0023_add_study_concept_explanations.sql` if the auto-name differs.
  - Ref: design.md § Migration SQL
  - DEVIATION: Used `migrations/0024_add_study_concept_explanations.sql` (0023 was already taken by seed_react_hooks.sql). Created file manually to match design.md SQL exactly.

- [x] 1.3 Apply the migration to remote D1: `wrangler d1 execute nomadically-work-db --remote --file migrations/0023_add_study_concept_explanations.sql`
  - Ref: proposal.md § Approach (migration rollout), design.md § Migration / Rollout
  - DEVIATION: Applied `migrations/0024_add_study_concept_explanations.sql` instead. Applied successfully (2 queries, 3 rows written).

---

## Phase 2: GraphQL Schema + Codegen

- [x] 2.1 Add `StudyConceptExplanation` type and `generateStudyConceptExplanation` mutation to `schema/study/schema.graphql`:
  ```graphql
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
  - Ref: design.md § GraphQL Schema Extension, specs/schema/spec.md § StudyConceptExplanation GraphQL Type

- [x] 2.2 Run `pnpm codegen` to regenerate `src/__generated__/types.ts`, `src/__generated__/resolvers-types.ts`, `src/__generated__/hooks.tsx`, and `src/__generated__/typeDefs.ts`. Verify that `useGenerateStudyConceptExplanationMutation` hook and `StudyConceptExplanation` interface are present in the generated output.
  - Ref: design.md § File Changes, proposal.md § Approach
  - Also added `GenerateStudyConceptExplanation` mutation document to `src/graphql/study-topics.graphql` — needed for hook generation.

---

## Phase 3: Resolver Implementation

- [x] 3.1 Add `sha256Hex` helper function and `mapExplanation` helper function at the top of `src/apollo/resolvers/study-topics.ts`. `sha256Hex` computes SHA-256 via `crypto.subtle.digest` and returns a lowercase hex string. `mapExplanation` maps a `studyConceptExplanations.$inferSelect` row to `{ id: string, selectedText: string, explanation: string, createdAt: string }`.
  - Ref: design.md § Resolver Shape (helper functions)

- [x] 3.2 Add `generateStudyConceptExplanation` mutation resolver to the `Mutation` key of `studyTopicResolvers` in `src/apollo/resolvers/study-topics.ts`. The resolver must:
  1. Auth guard: throw `new Error("Forbidden")` if `context.userId` is falsy
  2. Validate: trim `args.selectedText`; throw if empty or > 2000 chars
  3. Compute `hash = await sha256Hex(text)`
  4. Query cache: `SELECT` from `studyConceptExplanations` where `(study_topic_id, text_hash)` — return `mapExplanation(cached)` on HIT
  5. Fetch topic: `SELECT` from `studyTopics` where `id = parseInt(args.studyTopicId, 10)` — throw `"Study topic not found"` if missing
  6. Call `generateText({ model: anthropic("claude-haiku-4-5-20251001"), system: <topic-scoped prompt>, prompt: <user excerpt + optional context> })`
  7. `INSERT INTO studyConceptExplanations ... .onConflictDoNothing()`
  8. Re-`SELECT` the row (handles race condition) and return `mapExplanation(row!)`
  - Ref: design.md § Resolver Shape, design.md § LLM Prompt, specs/schema/spec.md § generateStudyConceptExplanation Mutation (all scenarios)

- [x] 3.3 Add required imports to `src/apollo/resolvers/study-topics.ts`: `generateText` from `"ai"`, `anthropic` from `"@ai-sdk/anthropic"`, `studyConceptExplanations` from `"@/db/schema"`, and `MutationResolvers` / `StudyConceptExplanation` from `"@/__generated__/resolvers-types"`.
  - Ref: design.md § Technical Approach, CLAUDE.md § Apollo Server 5 resolver patterns
  - Note: MutationResolvers and StudyConceptExplanation type imports were not strictly needed (resolver shape typed inline), kept other imports as required.

---

## Phase 4: StudyConceptToolbar Component

- [x] 4.1 Create directory `src/components/study/` (it does not exist yet).

- [x] 4.2 Create `src/components/study/StudyConceptToolbar.tsx` as a `"use client"` component with props interface `{ selectedText: string; selectionRect: DOMRect | null; isLoading: boolean; onExplain: (text: string) => void }`. Implement:
  - Return `null` when `selectedText` is empty or `selectionRect` is null (toolbar hidden spec)
  - Position via `position: "fixed"`, `top: selectionRect.top + window.scrollY - 50`, `left: selectionRect.left + selectionRect.width / 2`, `transform: "translateX(-50%)"`, `zIndex: 50`
  - Single Radix UI `Button` (size="1", color="blue") with text "Explain this"; `disabled={isLoading}`
  - When `isLoading`, show "Explaining..." text instead of "Explain this"
  - `onClick` calls `onExplain(selectedText)` (passes from props, never reads `window.getSelection()`)
  - Ref: specs/toolbar/spec.md (all requirements), design.md § Component: StudyConceptToolbar

---

## Phase 5: ConceptExplanationDialog Component

- [x] 5.1 Create `src/components/study/ConceptExplanationDialog.tsx` as a `"use client"` component with props interface `{ open: boolean; onOpenChange: (open: boolean) => void; selectedText: string; explanation: string | null; loading: boolean; error: string | null }`. Implement:
  - Radix UI `Dialog.Root` controlled via `open`/`onOpenChange` props
  - `Dialog.Title`: display `selectedText` truncated to 80 chars with "..." if longer (e.g. `selectedText.length > 80 ? selectedText.slice(0, 80) + "..." : selectedText`)
  - Content area: when `loading` is true, show a Radix `Skeleton` or spinner placeholder; when `error` is non-null, show error text "Failed to generate explanation. Please try again."; otherwise render `explanation` via `<ReactMarkdown remarkPlugins={[remarkGfm]}>`
  - Close button in top-right using `Dialog.Close`
  - Ref: specs/dialog/spec.md (all requirements), design.md § Component: ConceptExplanationDialog

---

## Phase 6: Page Wiring

- [x] 6.1 Modify `src/app/study/[category]/[topic]/page.tsx` to add state and refs:
  - Import `useRef` from React; add `const contentRef = useRef<HTMLDivElement>(null)`
  - Import and call `useTextSelection(contentRef)` to get `{ selectedText, selectionRect, clearSelection }`
  - Add state: `const [dialogOpen, setDialogOpen] = useState(false)` and `const [currentExplanation, setCurrentExplanation] = useState<string | null>(null)`
  - Ref: design.md § Study Topic Page Wiring (steps 1–4), specs/page/spec.md § Container Ref for useTextSelection

- [x] 6.2 Wire the `generateStudyConceptExplanation` mutation into `src/app/study/[category]/[topic]/page.tsx`:
  - Import `useGenerateStudyConceptExplanationMutation` from `"@/__generated__/hooks"`
  - Call it: `const [generateExplanation, { loading: explanationLoading, error: explanationError }] = useGenerateStudyConceptExplanationMutation()`
  - In the `onExplain` handler: call `generateExplanation({ variables: { studyTopicId: data.studyTopic.id, selectedText: text } })`; on success set `currentExplanation` to the returned `explanation` and `setDialogOpen(true)`
  - Ref: design.md § Study Topic Page Wiring (steps 3, 5), specs/page/spec.md § Mutation Wiring

- [x] 6.3 Wrap the `bodyMd` render box in `src/app/study/[category]/[topic]/page.tsx` with a `<div ref={contentRef}>` so `useTextSelection` is scoped to the markdown content area only (selections in heading/navigation ignored).
  - Ref: specs/page/spec.md § Container Ref for useTextSelection (scenarios: selection outside content ignored, selection inside triggers toolbar)

- [x] 6.4 Render `StudyConceptToolbar` and `ConceptExplanationDialog` as siblings inside the page `return` in `src/app/study/[category]/[topic]/page.tsx`:
  - `<StudyConceptToolbar selectedText={selectedText} selectionRect={selectionRect} isLoading={explanationLoading} onExplain={(text) => { /* fire mutation */ }} />`
  - `<ConceptExplanationDialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) clearSelection(); }} selectedText={selectedText} explanation={currentExplanation} loading={explanationLoading} error={explanationError?.message ?? null} />`
  - Ref: design.md § Study Topic Page Wiring (step 6), specs/page/spec.md § Dialog State Management
  - EXTRA: Also wired toolbar + dialog into `TopicDialog` in `src/app/study/[category]/page.tsx` (critical deviation task).

---

## Phase 7: Build Verification

- [ ] 7.1 Run `pnpm lint` from the project root; fix any new warnings introduced by the changes.
  - Ref: proposal.md § Success Criteria, design.md § Testing Strategy

- [ ] 7.2 Run `pnpm build` from the project root; confirm it exits with code 0 and no new TypeScript errors are reported (even with `ignoreBuildErrors: true` in `next.config.ts`, surface any TS errors in the new files using `tsc --noEmit` if build hides them).
  - Ref: proposal.md § Success Criteria, design.md § Testing Strategy

- [ ] 7.3 Manual smoke test on the local dev server (`pnpm dev`):
  1. Navigate to any study topic page (e.g. `/study/<category>/<topic>`)
  2. Select a text snippet in the body — confirm the "Explain this" toolbar appears floating above the selection
  3. Click "Explain this" — confirm toolbar shows "Explaining..." and is disabled
  4. Confirm the `ConceptExplanationDialog` opens with markdown-rendered explanation after the mutation completes
  5. Select the same text again and click "Explain this" — confirm response is instant (cache hit, no second LLM call visible in network tab)
  6. Sign out, repeat the selection + click — confirm a GraphQL error appears in the dialog ("Forbidden")
  7. Close the dialog — confirm the text selection is cleared and toolbar disappears
  - Ref: proposal.md § Success Criteria, specs/page/spec.md (all scenarios)
