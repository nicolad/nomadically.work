---
title: 'Study Topic Sub-Deep-Dives'
slug: 'study-topic-sub-deep-dives'
created: '2026-02-23'
status: 'Completed'
stepsCompleted: [1, 2, 3, 4]
tech_stack: ['TypeScript', 'Apollo Server 5', 'DeepSeek Reasoner API', 'GraphQL', 'React 19', 'Radix UI Themes']
files_to_modify:
  - 'schema/applications/schema.graphql'
  - 'src/graphql/applications.graphql'
  - 'src/apollo/resolvers/application.ts'
  - 'src/app/applications/[id]/page.tsx'
code_patterns:
  - 'Apollo type resolver (AIInterviewPrepRequirement)'
  - 'GraphQL mutation resolver — DeepSeek JSON blob update pattern'
  - 'React Dialog state + auto-generate on open'
  - 'Event propagation stop on clickable child inside clickable parent'
test_patterns: []
---

# Tech-Spec: Study Topic Sub-Deep-Dives

**Created:** 2026-02-23

## Overview

### Problem Statement

In the Interview Prep section, study topics (e.g. "Stateless vs. stateful services", "Consistency models (strong, eventual, causal)") are shown as static purple badges on each requirement card. Clicking the requirement card opens a dialog with interview questions, all study topics, and a single full-topic deep dive — but there is no way to get a focused, technically deep breakdown of an *individual* study topic.

### Solution

1. Extend the `AIInterviewPrepRequirement` GraphQL type with `studyTopicDeepDives: [AIStudyTopicDeepDive!]!` (new type: `{ topic, deepDive }`).
2. Add a `generateStudyTopicDeepDive` mutation that calls DeepSeek Reasoner for one focused subtopic.
3. Make study topic badges on the main requirement card directly clickable — clicking opens a dialog that auto-generates (if absent) and displays the sub-deep-dive.

### Scope

**In Scope:**
- New `AIStudyTopicDeepDive` GraphQL type and `studyTopicDeepDives` field on `AIInterviewPrepRequirement`
- New `generateStudyTopicDeepDive(applicationId: Int!, requirement: String!, studyTopic: String!, force: Boolean): Application!` mutation
- New resolver + `AIInterviewPrepRequirement` field resolver in `src/apollo/resolvers/application.ts`
- Study topic badges made clickable on the main requirement card (event propagation stopped)
- Sub-deep-dive dialog: auto-generates on open, renders ReactMarkdown, loading dots, error state
- `pnpm codegen` after schema + document changes
- `src/graphql/applications.graphql` — add `studyTopicDeepDives` to all three `aiInterviewPrep` selections + new mutation document

**Out of Scope:**
- Making badges clickable inside the topic deep dive dialog
- Changing the topic-level deep dive behavior
- Force regeneration UI (backend supports `force`, no UI button needed now)

---

## Context for Development

### Codebase Patterns

- `applicationResolvers` (exported from `application.ts:45`) is merged via `lodash.merge` in `src/apollo/resolvers.ts`. Adding a new top-level key `AIInterviewPrepRequirement: { ... }` to `applicationResolvers` is the correct place for field resolvers on that type.
- **No `AIInterviewPrepRequirement` resolver exists today** — all fields use Apollo's default resolver (reads property directly from the parent JSON object). A new resolver entry is required so `studyTopicDeepDives` returns `[]` instead of `undefined` for existing data (field is non-nullable `[AIStudyTopicDeepDive!]!`).
- `mapApplication()` (`application.ts:7`) parses `ai_interview_prep` JSON blob and returns it verbatim — requirements flow through Apollo's default resolvers. New `studyTopicDeepDives` entries will be in the blob for new data, absent for old.
- **Mutation resolver pattern** (exact, mirrors `generateTopicDeepDive`):
  1. Build `whereClause` with `context.userEmail`
  2. `db.select({ app, jobDescription })` + `leftJoin(jobs, ...)` + `.where(whereClause)`
  3. Parse `row.app.ai_interview_prep` JSON → find `reqEntry` by `args.requirement`
  4. Find or create `studyTopicDeepDive` entry in `reqEntry.studyTopicDeepDives` array
  5. Early-return guard if entry has `deepDive && !args.force`
  6. Strip `row.jobDescription` HTML → 4000 chars → `plainJobDesc`
  7. `createDeepSeekClient().chat({ model: DEEPSEEK_MODELS.REASONER, messages, max_tokens: 2500 })`
  8. Parse `deepDive` from response; mutate entry in-place
  9. `db.update(applications).set({ ai_interview_prep: JSON.stringify(prepData), updated_at }).where(...).returning()`
  10. `return mapApplication(updated, row.jobDescription)`
- **Exact insertion point for new mutation**: `application.ts:469` — insert the new resolver before the closing `},` of the `Mutation` block (after `generateInterviewPrep` which ends at line 468).
- All three `aiInterviewPrep` selections in `src/graphql/applications.graphql` are at lines 26–36, 97–108, 114–125 — all must include `studyTopicDeepDives { topic deepDive }`.
- Page state pattern: `useState` for `selectedXxx`, `xxxLoading`, `xxxError`; mutation hook via generated `useGenerateStudyTopicDeepDiveMutation`; `handleOpenStudyTopic(e, req, topic)` async handler.
- Mutations refetch via `refetchQueries: ["GetApplication"]`.
- Dialog: `Dialog.Root open={!!selectedStudyTopic}` with `onOpenChange` to close + reset state.

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `schema/applications/schema.graphql` | Add `AIStudyTopicDeepDive` type, `studyTopicDeepDives` field, `generateStudyTopicDeepDive` mutation |
| `src/graphql/applications.graphql` | Add `studyTopicDeepDives { topic deepDive }` to 3 selections; add mutation document |
| `src/apollo/resolvers/application.ts` | Add `AIInterviewPrepRequirement` field resolver (line 57 area) + `generateStudyTopicDeepDive` mutation resolver (before line 469) |
| `src/apollo/resolvers.ts` | No change — `applicationResolvers` is already merged here |
| `src/app/applications/[id]/page.tsx` | 3 new state vars, 1 handler, badge onClick, new `Dialog.Root` |
| `src/__generated__/hooks.tsx` | Auto-generated — do not edit |
| `src/__generated__/resolvers-types.ts` | Auto-generated — do not edit |

### Technical Decisions

- **`studyTopicDeepDives` stored as array in JSON blob**: `requirements[n].studyTopicDeepDives = [{ topic: string, deepDive: string }]`. Field resolver returns `[]` if absent — backward-compatible with all existing data.
- **`force` arg on mutation** matches `generateTopicDeepDive` pattern; not exposed in UI yet.
- **Badge click stops propagation** — prevents parent card's `handleOpenTopic` from also firing.
- **Darker badge** (`var(--violet-5)`) when sub-deep-dive exists — passive done indicator, no extra element needed.
- **Separate dialog** from the topic dialog — both can be open independently (though unlikely in practice); avoids nested Dialog complexity.
- **`max_tokens: 2500`** — subtopic is narrower scope than the 7-section full topic deep dive (4000).

---

## Implementation Plan

### Tasks

- [x] **Task 1**: Add new GraphQL type, field, and mutation to schema
  - File: `schema/applications/schema.graphql`
  - Action: Add after the `AIInterviewPrepRequirement` type (line 21):
    ```graphql
    type AIStudyTopicDeepDive {
      topic: String!
      deepDive: String!
    }
    ```
    Add `studyTopicDeepDives: [AIStudyTopicDeepDive!]!` as a field inside `AIInterviewPrepRequirement` (after `deepDive: String`).
    Add to the `Mutation` type:
    ```graphql
    generateStudyTopicDeepDive(applicationId: Int!, requirement: String!, studyTopic: String!, force: Boolean): Application!
    ```

- [x] **Task 2**: Add `studyTopicDeepDives` to all three `aiInterviewPrep` query selections and add mutation document
  - File: `src/graphql/applications.graphql`
  - Action: In all three `requirements { ... }` blocks (lines 29–33, 99–104, 116–121), add `studyTopicDeepDives { topic deepDive }` after `deepDive`.
    After the `GenerateTopicDeepDive` mutation document (line 126), add:
    ```graphql
    mutation GenerateStudyTopicDeepDive($applicationId: Int!, $requirement: String!, $studyTopic: String!, $force: Boolean) {
      generateStudyTopicDeepDive(applicationId: $applicationId, requirement: $requirement, studyTopic: $studyTopic, force: $force) {
        id
        aiInterviewPrep {
          summary
          requirements {
            requirement
            questions
            studyTopics
            studyTopicDeepDives { topic deepDive }
            sourceQuote
            deepDive
          }
          generatedAt
        }
      }
    }
    ```

- [x] **Task 3**: Run codegen to regenerate types and hooks
  - Command: `pnpm codegen`
  - Notes: Must complete before Tasks 4 and 5 — resolver and page code depend on the generated `MutationGenerateStudyTopicDeepDiveArgs` type and `useGenerateStudyTopicDeepDiveMutation` hook.

- [x] **Task 4**: Add `AIInterviewPrepRequirement` field resolver for `studyTopicDeepDives`
  - File: `src/apollo/resolvers/application.ts`
  - Action: Add a new top-level key to the `applicationResolvers` object, after the existing `Application` resolver block (after line 57, before `Query:`):
    ```ts
    AIInterviewPrepRequirement: {
      studyTopicDeepDives(parent: any) {
        return parent.studyTopicDeepDives ?? [];
      },
    },
    ```

- [x] **Task 5**: Add `generateStudyTopicDeepDive` mutation resolver
  - File: `src/apollo/resolvers/application.ts`
  - Action: Insert before the closing `},` of the `Mutation` block at line 469 (after `generateInterviewPrep` ends at line 468):
    ```ts
    async generateStudyTopicDeepDive(
      _parent: any,
      args: { applicationId: number; requirement: string; studyTopic: string; force?: boolean },
      context: GraphQLContext,
    ) {
      const whereClause = context.userEmail
        ? and(eq(applications.id, args.applicationId), eq(applications.user_email, context.userEmail))
        : eq(applications.id, args.applicationId);

      const [row] = await context.db
        .select({ app: applications, jobDescription: jobs.description })
        .from(applications)
        .leftJoin(jobs, eq(jobs.url, applications.job_id))
        .where(whereClause);

      if (!row) throw new Error("Application not found or access denied");

      let prepData: any;
      try {
        prepData = row.app.ai_interview_prep ? JSON.parse(row.app.ai_interview_prep) : null;
      } catch {
        throw new Error("Could not parse existing interview prep data");
      }
      if (!prepData) throw new Error("No interview prep data found. Generate interview prep first.");

      const reqEntry = prepData.requirements?.find(
        (r: any) => r.requirement === args.requirement,
      );
      if (!reqEntry) throw new Error("Requirement not found in interview prep data");

      reqEntry.studyTopicDeepDives = reqEntry.studyTopicDeepDives ?? [];
      const existing = reqEntry.studyTopicDeepDives.find((d: any) => d.topic === args.studyTopic);
      if (existing?.deepDive && !args.force) return mapApplication(row.app, row.jobDescription);

      const plainJobDesc = (row.jobDescription ?? "")
        .replace(/(<([^>]+)>)/gi, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 4000);

      const client = createDeepSeekClient();
      const response = await client.chat({
        model: DEEPSEEK_MODELS.REASONER,
        messages: [
          {
            role: "user",
            content: `You are a senior staff engineer and technical interview coach. The candidate is preparing for a technical interview at ${(row.app as any).company_name ?? "a tech company"} for the role of ${(row.app as any).job_title ?? "software engineer"}.

    Job description context:
    ${plainJobDesc}

    Parent topic: "${args.requirement}"
    Focused subtopic: "${args.studyTopic}"

    Write a technically rigorous, focused deep-dive on "${args.studyTopic}" in markdown. This is for a senior engineer — go beyond definitions into mechanisms, trade-offs, and concrete examples.

    ## What It Actually Is
    The precise technical definition and mechanism. No hand-waving. Include how it works internally where relevant.

    ## When It Matters (and When It Doesn't)
    Concrete scenarios where this concept is load-bearing. Name real systems (PostgreSQL, Cassandra, Redis, Kafka, etc.) and explain how they handle this. Include a trade-off table if applicable.

    ## How to Talk About It in an Interview
    The exact reasoning pattern a senior engineer uses: state your constraints, name the trade-offs, give a concrete recommendation with justification. Show, don't tell.

    ## The Trap Answers
    What mid-level engineers say that reveals shallow understanding. Be blunt.

    ## One Concrete Example
    A real production scenario (incident, design decision, or architectural choice) where this subtopic was the crux. What happened, why, and what to learn from it.`,
          },
        ],
        max_tokens: 2500,
      });

      const deepDive = response.choices[0]?.message?.content;
      if (!deepDive) throw new Error("Empty response from AI");

      if (existing) {
        existing.deepDive = deepDive;
      } else {
        reqEntry.studyTopicDeepDives.push({ topic: args.studyTopic, deepDive });
      }

      const [updated] = await context.db
        .update(applications)
        .set({
          ai_interview_prep: JSON.stringify(prepData),
          updated_at: new Date().toISOString(),
        } as any)
        .where(whereClause)
        .returning();

      if (!updated) throw new Error("Failed to save study topic deep dive");

      return mapApplication(updated, row.jobDescription);
    },
    ```

- [x] **Task 6**: Update page state, handler, and badges
  - File: `src/app/applications/[id]/page.tsx`
  - Action A — Add imports: add `useGenerateStudyTopicDeepDiveMutation` to the existing destructured import from `@/__generated__/hooks` (line 36).
  - Action B — Add state (after `deepDiveError` state on line 97):
    ```ts
    const [selectedStudyTopic, setSelectedStudyTopic] = useState<{ req: AiInterviewPrepRequirement; topic: string } | null>(null);
    const [studyTopicLoading, setStudyTopicLoading] = useState(false);
    const [studyTopicError, setStudyTopicError] = useState<string | null>(null);
    ```
  - Action C — Add mutation hook (after `generateTopicDeepDive` hook on line 87):
    ```ts
    const [generateStudyTopicDeepDive] = useGenerateStudyTopicDeepDiveMutation();
    ```
  - Action D — Add handler (after `handleOpenTopic` handler, around line 132):
    ```ts
    const handleOpenStudyTopic = async (e: React.MouseEvent, req: AiInterviewPrepRequirement, topic: string) => {
      e.stopPropagation();
      const existing = req.studyTopicDeepDives?.find((d) => d.topic === topic);
      setSelectedStudyTopic({ req, topic });
      setStudyTopicError(null);
      if (!existing?.deepDive) {
        setStudyTopicLoading(true);
        try {
          const result = await generateStudyTopicDeepDive({
            variables: { applicationId: app!.id, requirement: req.requirement, studyTopic: topic },
            refetchQueries: ["GetApplication"],
          });
          const updatedReqs = result.data?.generateStudyTopicDeepDive?.aiInterviewPrep?.requirements;
          const updatedReq = updatedReqs?.find((r) => r.requirement === req.requirement);
          if (updatedReq) setSelectedStudyTopic({ req: updatedReq as AiInterviewPrepRequirement, topic });
        } catch (e) {
          setStudyTopicError(e instanceof Error ? e.message : "Generation failed");
        } finally {
          setStudyTopicLoading(false);
        }
      }
    };
    ```
  - Action E — Replace the study topic badge `Text` elements (around line 519) to be clickable:
    ```tsx
    {req.studyTopics.map((t: string) => {
      const hasDeepDive = req.studyTopicDeepDives?.some((d) => d.topic === t && d.deepDive);
      return (
        <Text
          key={t}
          size="1"
          role="button"
          tabIndex={0}
          onClick={(e) => handleOpenStudyTopic(e, req, t)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") handleOpenStudyTopic(e as any, req, t);
          }}
          style={{
            padding: "2px 8px",
            backgroundColor: hasDeepDive ? "var(--violet-5)" : "var(--violet-3)",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          {t}
        </Text>
      );
    })}
    ```

- [x] **Task 7**: Add sub-deep-dive dialog to page
  - File: `src/app/applications/[id]/page.tsx`
  - Action: Add a second `Dialog.Root` immediately after the existing topic `Dialog.Root` closing tag (after line 698):
    ```tsx
    <Dialog.Root
      open={!!selectedStudyTopic}
      onOpenChange={(o) => {
        if (!o) {
          setSelectedStudyTopic(null);
          setStudyTopicError(null);
        }
      }}
    >
      <Dialog.Content maxWidth="680px" style={{ maxHeight: "85vh", overflowY: "auto" }}>
        {selectedStudyTopic && (
          <>
            <Dialog.Title>{selectedStudyTopic.topic}</Dialog.Title>
            <Text size="1" color="gray" mb="4" as="div">
              Part of: {selectedStudyTopic.req.requirement}
            </Text>
            <Box pt="2">
              {studyTopicLoading ? (
                <Flex direction="column" gap="3" py="4" align="center">
                  <Text size="2" color="gray">
                    Generating focused deep-dive with DeepSeek Reasoner…
                  </Text>
                  <Flex gap="2">
                    {[0, 1, 2].map((i) => (
                      <Box
                        key={i}
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          backgroundColor: "var(--accent-9)",
                          animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                        }}
                      />
                    ))}
                  </Flex>
                </Flex>
              ) : studyTopicError ? (
                <Text size="2" color="red">
                  {studyTopicError}
                </Text>
              ) : (() => {
                const d = selectedStudyTopic.req.studyTopicDeepDives?.find(
                  (d) => d.topic === selectedStudyTopic.topic,
                );
                return d?.deepDive ? (
                  <Box className="deep-dive-content">
                    <ReactMarkdown>{d.deepDive}</ReactMarkdown>
                  </Box>
                ) : null;
              })()}
            </Box>
            <Flex justify="end" mt="4">
              <Dialog.Close>
                <Button variant="soft" color="gray" size="2">
                  Close
                </Button>
              </Dialog.Close>
            </Flex>
          </>
        )}
      </Dialog.Content>
    </Dialog.Root>
    ```

### Acceptance Criteria

- [x] **AC 1**: Given a requirement card with study topics is visible, when the user hovers over a study topic badge, then the cursor changes to pointer
- [x] **AC 2**: Given no sub-deep-dive exists for a study topic, when the user clicks the badge, then a dialog opens immediately and triggers generation (loading dots visible), and the result is displayed and persisted
- [x] **AC 3**: Given a sub-deep-dive already exists for a study topic, when the user clicks the badge, then the dialog opens immediately showing the stored content with no API call made
- [x] **AC 4**: Given a badge with an existing sub-deep-dive, then it renders in a darker violet (`var(--violet-5)`) vs. a pending badge (`var(--violet-3)`)
- [x] **AC 5**: Given a study topic badge is clicked, then the parent requirement card's click handler does NOT fire (topic deep dive dialog does not open simultaneously)
- [x] **AC 6**: Given the DeepSeek call fails, then the dialog shows a red error message and no data is persisted
- [x] **AC 7**: Given an application created before this feature (no `studyTopicDeepDives` in JSON), then `aiInterviewPrep.requirements[n].studyTopicDeepDives` resolves to `[]` with no runtime error

---

## Additional Context

### Dependencies

- No new npm packages
- Tasks 1 → 2 → 3 must complete in order before Tasks 4 and 5 (codegen must run before resolver code references generated types)
- Task 6 and 7 depend on Task 3 (need generated hook)

### Testing Strategy

Manual only (no automated tests for this feature):
1. Navigate to `http://localhost:3000/applications/9`
2. In AI-Generated Prep, click a study topic badge (e.g. "Stateless vs. stateful services") — verify dialog opens with loading dots, then deep-dive renders
3. Click the same badge again — verify dialog opens instantly with stored content (no loading)
4. Click a different study topic badge on the same requirement — verify its own dialog + generation
5. Click the requirement card title area — verify the topic dialog opens (propagation stopped correctly for badge clicks)
6. Check badge color — done topics should be darker violet
7. Check `http://localhost:3000/api/graphql` Playground: query `aiInterviewPrep { requirements { studyTopicDeepDives { topic deepDive } } }` on application 9 — should return populated entries

### Notes

**Pre-mortem risks:**
- `studyTopicDeepDives` field is `[AIStudyTopicDeepDive!]!` (non-nullable list) — if the `AIInterviewPrepRequirement` resolver is missing or misconfigured, Apollo will throw on every existing application. Task 4 is the critical safety net — verify it before testing in browser.
- Two `Dialog.Root` components on one page: Radix UI handles this fine (portaled to body), but ensure the `open` states are independent — closing one must not affect the other.
- `e.stopPropagation()` only stops bubbling — the parent `Box[role=button]` uses `onClick`, so stop propagation on the badge click is sufficient.

## Review Notes

- Adversarial review completed 2026-02-23
- Findings: 11 total, 0 fixed, 11 skipped
- Resolution approach: skip
