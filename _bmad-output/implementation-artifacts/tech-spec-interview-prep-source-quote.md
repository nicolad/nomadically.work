---
title: 'Interview Prep Source Quote References'
slug: 'interview-prep-source-quote'
created: '2026-02-23'
status: 'completed'
stepsCompleted: [1, 2, 3, 4]
tech_stack: [Next.js 16, Apollo Server 5, GraphQL Codegen, Radix UI, DeepSeek]
files_to_modify:
  - schema/applications/schema.graphql
  - src/apollo/resolvers/application.ts
  - src/graphql/applications.graphql
  - src/app/applications/[id]/page.tsx
code_patterns: [mapApplication-mapping, dangerouslySetInnerHTML-jd, deepseek-json-object-response]
test_patterns: [no-unit-tests-for-applications]
---

# Tech-Spec: Interview Prep Source Quote References

**Created:** 2026-02-23

## Overview

### Problem Statement

Each AI-generated interview prep requirement is extracted from the job description but has no traceable link back to the exact text that triggered it. Users can't tell *why* a requirement was included or cross-reference it against the original JD.

### Solution

Add a nullable `sourceQuote` field to `AIInterviewPrepRequirement`. The DeepSeek prompt extracts a verbatim short quote (≤20 words) from the JD for each requirement. The UI renders it as a left-bordered italic blockquote inside each requirement card; clicking it smooth-scrolls to the Job Description section.

### Scope

**In Scope:**
- Add `sourceQuote: String` (nullable) to `AIInterviewPrepRequirement` GraphQL type
- Update DeepSeek system prompt JSON shape to include `sourceQuote` per requirement
- Run `pnpm codegen` to regenerate types
- Add `sourceQuote` to both `ApplicationFields` fragment and `GenerateInterviewPrep` mutation inline selection in `src/graphql/applications.graphql`
- Add `id="job-description"` anchor to the JD `<Card>`
- Render blockquote in each requirement card when `sourceQuote` is present; silently omit when absent

**Out of Scope:**
- Highlighting the specific matched text within the JD HTML
- Auto-regenerating existing prep records
- Two-way anchoring (JD → prep card)

## Context for Development

### Codebase Patterns

- `AIInterviewPrepRequirement` is defined in `schema/applications/schema.graphql` lines 14-18 and stored as a JSON text blob in `applications.ai_interview_prep` (D1). No DB migration needed — adding a field is backward-compatible.
- The DeepSeek call is in `src/apollo/resolvers/application.ts` at line 295, using `response_format: { type: "json_object" }` and `temperature: 0.1`. The JSON shape is a single string literal in the `system` message (lines 300–311). `max_tokens: 2000` is sufficient — ~120 extra tokens for 6 quotes.
- The JD card (`src/app/applications/[id]/page.tsx` line 309) renders raw HTML via `dangerouslySetInnerHTML`. Adding `id="job-description"` to the `<Card>` is the full extent of the anchor change.
- Requirements are mapped at line 450. Each is a Radix UI `<Box p="3">` with `backgroundColor: var(--gray-2)`. The blockquote inserts between the `req.requirement` `<Text weight="bold">` and the `"Interview questions:"` label.
- `src/graphql/applications.graphql` has **two** places that list requirement fields: the `ApplicationFields` fragment (lines 28–33) and the `GenerateInterviewPrep` mutation inline selection (lines 97–103). Both need `sourceQuote` added.
- `pnpm codegen` regenerates `src/__generated__/types.ts`, `resolvers-types.ts`, and `hooks.tsx` from `schema/**/*.graphql`.

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `schema/applications/schema.graphql` | Add `sourceQuote: String` to `AIInterviewPrepRequirement` type |
| `src/apollo/resolvers/application.ts` | Extend DeepSeek system prompt JSON shape |
| `src/graphql/applications.graphql` | Add `sourceQuote` to both fragment locations |
| `src/app/applications/[id]/page.tsx` | Add JD anchor id; render blockquote in requirements map |

### Technical Decisions

- `sourceQuote: String` is nullable so existing records without it render cleanly with no fallback logic needed beyond `req.sourceQuote && (...)`.
- Scroll target uses `document.getElementById("job-description")?.scrollIntoView({ behavior: "smooth" })` — the optional chain silently no-ops if the JD card is absent.
- Quote length instruction to DeepSeek: "≤20 words, verbatim" keeps quotes scannable and within token budget.

## Implementation Plan

### Tasks

- [x] T1: Add `sourceQuote` field to GraphQL schema type
  - File: `schema/applications/schema.graphql`
  - Action: Add `sourceQuote: String` as the last field of `AIInterviewPrepRequirement` (after `studyTopics`)
  - Result:
    ```graphql
    type AIInterviewPrepRequirement {
      requirement: String!
      questions: [String!]!
      studyTopics: [String!]!
      sourceQuote: String
    }
    ```

- [x] T2: Extend DeepSeek prompt JSON shape
  - File: `src/apollo/resolvers/application.ts`
  - Action: In the `system` message string (lines 300–311), add `"sourceQuote"` to the requirement object shape and append one instruction sentence
  - Replace the requirement object in the shape:
    ```
    {
      "requirement": "Requirement name (e.g. React expertise)",
      "sourceQuote": "≤20 words copied verbatim from the job description that most directly triggered this requirement",
      "questions": ["Tailored interview question 1", "Tailored interview question 2"],
      "studyTopics": ["Study topic 1", "Study topic 2"]
    }
    ```
  - Append to the instruction line: `For sourceQuote: copy ≤20 words verbatim from the job description that most directly triggered this requirement.`

- [x] T3: Run codegen
  - Command: `pnpm codegen`
  - Action: Regenerates `src/__generated__/` from updated schema — must run before T5 to avoid TS errors

- [x] T4: Add `sourceQuote` to both GraphQL query fragment locations
  - File: `src/graphql/applications.graphql`
  - Action A: In `ApplicationFields` fragment, add `sourceQuote` after `studyTopics` (line ~31):
    ```graphql
    requirements {
      requirement
      questions
      studyTopics
      sourceQuote
    }
    ```
  - Action B: In `GenerateInterviewPrep` mutation inline selection, add `sourceQuote` after `studyTopics` (line ~101):
    ```graphql
    requirements {
      requirement
      questions
      studyTopics
      sourceQuote
    }
    ```

- [x] T5a: Add `id="job-description"` anchor to the JD card
  - File: `src/app/applications/[id]/page.tsx`
  - Action: At line 309, change `<Card mb="5">` to `<Card mb="5" id="job-description">`

- [x] T5b: Render blockquote in requirements map
  - File: `src/app/applications/[id]/page.tsx`
  - Action: After the `req.requirement` bold `<Text>` element (line ~460) and before the `"Interview questions:"` label, insert:
    ```tsx
    {req.sourceQuote && (
      <Box
        mb="2"
        pl="3"
        style={{
          borderLeft: "3px solid var(--accent-6)",
          cursor: "pointer",
        }}
        onClick={() =>
          document.getElementById("job-description")?.scrollIntoView({ behavior: "smooth" })
        }
      >
        <Text size="1" color="gray" style={{ fontStyle: "italic" }}>
          &ldquo;{req.sourceQuote}&rdquo;
        </Text>
      </Box>
    )}
    ```

### Acceptance Criteria

- [x] AC1: Given `schema/applications/schema.graphql` is opened, when `AIInterviewPrepRequirement` is inspected, then `sourceQuote: String` is present as a nullable field after `studyTopics`

- [x] AC2: Given an application with a job description, when "Generate with AI" is clicked and generation completes, then each item in `aiInterviewPrep.requirements` has a non-empty `sourceQuote` string of ≤ ~30 words

- [x] AC3: Given `aiInterviewPrep` data with `sourceQuote` populated, when the application detail page loads, then each requirement card shows a left-bordered italic quoted string above the "Interview questions:" label

- [x] AC4: Given the page has both a Job Description card and prep requirements, when the user clicks a blockquote, then the page smoothly scrolls to the Job Description card

- [x] AC5: Given an existing `aiInterviewPrep` record without `sourceQuote` (pre-migration data), when the page loads, then no blockquote element is rendered, no JS error is thrown, and all other requirement fields display normally

## Additional Context

### Dependencies

- T1 must complete before T3 (codegen reads the schema)
- T3 must complete before T5b (UI needs the generated `sourceQuote` type)
- T4 is independent of T3 but should be done before testing the full flow

### Testing Strategy

No unit tests (matches `test_patterns: no-unit-tests-for-applications`).

Manual smoke test sequence:
1. Open an existing application that already has `aiInterviewPrep` → confirm no blockquote renders and no console errors (AC5)
2. Delete or use a fresh application, click "Generate with AI" → confirm each requirement card shows a blockquote (AC2, AC3)
3. Click any blockquote → confirm smooth scroll to Job Description card (AC4)

### Notes

- **Pre-mortem risk:** DeepSeek occasionally returns `sourceQuote` longer than 20 words — the UI renders it fine at any length; optional CSS `text-overflow: ellipsis` can be added later as polish.
- **Pre-mortem risk:** If the JD card is hidden (no `app.jobDescription`), `id="job-description"` won't exist in the DOM — the `?.scrollIntoView` optional chain silently no-ops.
- `max_tokens: 2000` stays unchanged — 6 requirements × ~20 words each adds ~120 tokens, well within budget.
