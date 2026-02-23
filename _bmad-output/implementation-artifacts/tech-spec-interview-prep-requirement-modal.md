---
title: 'Interview Prep Requirement Deep Dive Modal'
slug: 'interview-prep-requirement-modal'
created: '2026-02-23'
status: 'Completed'
stepsCompleted: [1, 2, 3, 4]
tech_stack: [Next.js 16, React 19, Radix UI Themes, TypeScript]
files_to_modify:
  - src/app/applications/[id]/page.tsx
code_patterns: [radix-dialog, requirements-map, aiInterviewPrep-json]
test_patterns: [no-unit-tests-for-applications]
---

# Tech-Spec: Interview Prep Requirement Deep Dive Modal

**Created:** 2026-02-23

## Overview

### Problem Statement

Each AI-generated requirement card on `/applications/[id]` shows a compact summary of questions and study topics alongside 5 other requirements. Users cannot focus on a single requirement to study it without visual noise from surrounding cards.

### Solution

Clicking a requirement card title opens a Radix UI `Dialog` modal that renders the full requirement data — name, `sourceQuote` blockquote, all interview questions as a numbered list, and all study topics as chips — in a large, focused layout. No AI calls, no new routes; purely a UI expansion of existing data.

### Scope

**In Scope:**
- Clicking the bold requirement `<Text>` title on any requirement card triggers a `Dialog` modal
- Modal body shows: requirement name (heading), `sourceQuote` blockquote (if present), numbered interview questions, study topic chips
- `Dialog` close via button, ESC key, or click-outside (Radix default behaviour)
- Single shared modal state: `selectedReq` (`AiInterviewPrepRequirement | null`) stored in component state; one `Dialog.Root` for all requirements
- Add `Dialog` to the existing `@radix-ui/themes` import in the file

**Out of Scope:**
- Additional AI generation inside the modal
- Shareable URL / query-param routing for modal state
- Navigation to `/prep/[slug]`
- Editing or saving requirement data from the modal

## Context for Development

### Codebase Patterns

- `Dialog` is already used in `src/app/applications/page.tsx` (same import pattern from `@radix-ui/themes`) — use the same controlled `open`/`onOpenChange` pattern.
- The requirements map lives in `src/app/applications/[id]/page.tsx` starting at line ~450. Each card is a `<Box p="3">` with `backgroundColor: var(--gray-2)`. The bold `<Text size="2" weight="bold">` is the requirement title — this becomes the click trigger.
- `AiInterviewPrepRequirement` type is generated in `src/__generated__/types.ts` (has `requirement`, `questions`, `studyTopics`, `sourceQuote`). Use this type for `selectedReq` state.
- Study topic chip style: `padding: "2px 8px"`, `backgroundColor: "var(--violet-3)"`, `borderRadius: "4px"` — reuse exactly.
- Source quote blockquote style: `borderLeft: "3px solid var(--accent-6)"`, `pl="3"`, italic text — reuse exactly.
- `scrollToJobDescription` stable handler already exists in the component (line ~100) — reuse inside modal's blockquote `onClick`.

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `src/app/applications/[id]/page.tsx` | Only file to modify — add Dialog import, selectedReq state, modal component, click trigger on title |
| `src/app/applications/page.tsx` | Reference for Dialog usage pattern (controlled open/onOpenChange) |
| `src/__generated__/types.ts` | `AiInterviewPrepRequirement` type for selectedReq state |

### Technical Decisions

- **Single shared `Dialog.Root`**: one `selectedReq` state drives one `Dialog` outside the `.map()`. Avoids mounting N Dialogs for N requirements.
- **Trigger on requirement title**: clicking the bold `<Text>` sets `selectedReq`. The card itself stays non-interactive so the sourceQuote blockquote scroll-click is unaffected.
- **`Dialog.Root` controlled**: `open={!!selectedReq}` / `onOpenChange={(o) => { if (!o) setSelectedReq(null); }}`.
- **`Dialog.Content maxWidth="560px"`** — matches the existing `AddApplicationDialog` pattern.

## Implementation Plan

### Tasks

- [x] T1: Add `Dialog` to `@radix-ui/themes` import and add `selectedReq` state
  - File: `src/app/applications/[id]/page.tsx`
  - Action A: Add `Dialog` to the existing Radix import block (line 3–17)
  - Action B: ~~Import `AiInterviewPrepRequirement`~~ — **already imported** at line 35: `import type { ApplicationStatus, AiInterviewPrepRequirement } from "@/__generated__/hooks"`. No action needed.
  - Action C: Add state inside `ApplicationDetailPage` component (after line 86, after the existing `useState` declarations):
    ```ts
    const [selectedReq, setSelectedReq] = useState<AiInterviewPrepRequirement | null>(null);
    ```

- [x] T2: Add the `Dialog` modal JSX (single instance, outside the `.map()`)
  - File: `src/app/applications/[id]/page.tsx`
  - Action: Insert the following block immediately before the closing `</Container>` tag at line 551 of the component's return:
    ```tsx
    <Dialog.Root open={!!selectedReq} onOpenChange={(o) => { if (!o) setSelectedReq(null); }}>
      <Dialog.Content maxWidth="560px">
        {selectedReq && (
          <>
            <Dialog.Title>{selectedReq.requirement}</Dialog.Title>
            {selectedReq.sourceQuote && (
              <Box
                mb="4"
                pl="3"
                role="button"
                tabIndex={0}
                style={{ borderLeft: "3px solid var(--accent-6)", cursor: "pointer" }}
                onClick={scrollToJobDescription}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") scrollToJobDescription(); }}
              >
                <Text size="2" color="gray" as="div" style={{ fontStyle: "italic" }}>
                  &ldquo;{selectedReq.sourceQuote}&rdquo;
                </Text>
              </Box>
            )}
            <Text size="1" color="gray" weight="medium" mb="2" as="div">
              INTERVIEW QUESTIONS
            </Text>
            <Flex direction="column" gap="2" mb="4">
              {selectedReq.questions.map((q, i) => (
                <Text key={q} size="2" as="div">
                  {i + 1}. {q}
                </Text>
              ))}
            </Flex>
            <Text size="1" color="gray" weight="medium" mb="2" as="div">
              STUDY TOPICS
            </Text>
            <Flex gap="2" wrap="wrap" mb="4">
              {selectedReq.studyTopics.map((t) => (
                <Text
                  key={t}
                  size="1"
                  style={{ padding: "2px 8px", backgroundColor: "var(--violet-3)", borderRadius: "4px" }}
                >
                  {t}
                </Text>
              ))}
            </Flex>
            <Flex justify="end">
              <Dialog.Close>
                <Button variant="soft" color="gray" size="2">Close</Button>
              </Dialog.Close>
            </Flex>
          </>
        )}
      </Dialog.Content>
    </Dialog.Root>
    ```

- [x] T3: Make the requirement title the click trigger
  - File: `src/app/applications/[id]/page.tsx`
  - Action: In the requirements `.map()`, change the bold requirement `<Text>` (confirmed at line 448) from:
    ```tsx
    <Text size="2" weight="bold" mb="2" as="div">
      {req.requirement}
    </Text>
    ```
    To:
    ```tsx
    <Text
      size="2"
      weight="bold"
      mb="2"
      as="div"
      style={{ cursor: "pointer", textDecoration: "underline dotted" }}
      onClick={() => setSelectedReq(req)}
    >
      {req.requirement}
    </Text>
    ```

### Acceptance Criteria

- [x] AC1: Given an application with `aiInterviewPrep` data, when the user clicks a requirement title (e.g. "AI Model Shaping and RLHF"), then a modal opens showing that requirement's name as the heading

- [x] AC2: Given the modal is open, when `sourceQuote` is present on the requirement, then a left-bordered italic blockquote is rendered; when absent, no blockquote element is rendered

- [x] AC3: Given the modal is open, when the user views interview questions, then they appear as a numbered list (1. 2. 3.)

- [x] AC4: Given the modal is open, when the user presses ESC, clicks outside, or clicks "Close", then the modal dismisses and `selectedReq` resets to null

- [x] AC5: Given the modal is open for requirement A, when the user closes it and clicks requirement B, then the modal reopens with requirement B's data (not A's)

- [x] AC6: Given an existing `aiInterviewPrep` record without `sourceQuote`, when the modal is opened for a requirement, then no blockquote renders and no JS error is thrown

## Additional Context

### Dependencies

- T1 must complete before T2 and T3 (state and import needed)
- T2 and T3 are independent of each other

### Testing Strategy

No unit tests (matches `test_patterns: no-unit-tests-for-applications`).

Manual smoke test sequence:
1. Navigate to `/applications/9` (has regenerated prep with sourceQuotes)
2. Click "AI Model Shaping and RLHF" title → modal opens with correct content (AC1, AC2, AC3)
3. Press ESC → modal closes (AC4)
4. Click a different requirement → correct data shown (AC5)
5. Navigate to an application with old prep (no sourceQuote) → modal opens cleanly (AC6)

## Review Notes

- Adversarial review completed
- Findings: 10 total, 0 fixed, 10 skipped
- Resolution approach: skip

### Notes

- `Dialog.Root` with `open` controlled by `selectedReq` means no `Dialog.Trigger` wrapper needed on the title `<Text>` — just a plain `onClick`.
- The `selectedReq` type cast in the `.map()` is `AiInterviewPrepRequirement` (same type already used for the `req` variable at line ~450).
- Dotted underline on the title (`textDecoration: "underline dotted"`) signals interactivity without conflicting with the sourceQuote blockquote's own pointer cursor.
