# Delta for Study Topic Page

## MODIFIED Requirements

### Requirement: Study Topic Page Supports Concept Explanation

The study topic page (`src/app/study/[category]/[topic]/page.tsx`) MUST integrate the text selection toolbar and explanation dialog to allow users to get LLM-generated explanations of selected content.

(Previously: The page renders study topic content as read-only markdown with no interactive text selection features.)

#### Scenario: Full explain flow — select, click, view

- GIVEN the user is on `/study/databases/sqlite-pragmas` and is authenticated
- WHEN the user selects "PRAGMA foreign_keys = ON" in the markdown body
- AND clicks "Explain this" on the toolbar
- THEN the toolbar shows a loading state
- AND the `generateStudyConceptExplanation` mutation is fired with `studyTopicId`, `selectedText`, and surrounding context
- AND when the mutation completes, the `ConceptExplanationDialog` opens with the explanation rendered as markdown

#### Scenario: Cached explanation returned instantly

- GIVEN the user previously received an explanation for "PRAGMA foreign_keys = ON" on this topic
- WHEN the user selects the same text again and clicks "Explain this"
- THEN the dialog opens with the cached explanation (no visible loading delay)

#### Scenario: Unauthenticated user sees error

- GIVEN the user is not signed in
- WHEN the user selects text and clicks "Explain this"
- THEN the mutation returns a GraphQL error
- AND the dialog shows an error message

---

### Requirement: Container Ref for useTextSelection

The page MUST wrap the markdown content area in a container element with a `ref` passed to `useTextSelection`, so selections outside the content area (e.g., in the heading or navigation) do not trigger the toolbar.

#### Scenario: Selection outside content ignored

- GIVEN the user selects the page heading text
- WHEN the selection is outside the content container ref
- THEN the toolbar does not appear

#### Scenario: Selection inside content triggers toolbar

- GIVEN the user selects text within the markdown body
- WHEN the selection is inside the content container ref
- THEN the toolbar appears above the selection

---

### Requirement: Mutation Wiring

The page MUST call the `generateStudyConceptExplanation` mutation using the generated Apollo hook (from `pnpm codegen`). The `studyTopicId` MUST come from the `studyTopic.id` field returned by the existing `useStudyTopicQuery`.

#### Scenario: Mutation variables populated correctly

- GIVEN the study topic query returned `{ id: "7", title: "SQLite Pragmas", category: "databases" }`
- WHEN the user triggers an explanation for "PRAGMA foreign_keys = ON"
- THEN the mutation is called with `{ studyTopicId: "7", selectedText: "PRAGMA foreign_keys = ON" }`

---

### Requirement: Dialog State Management

The page MUST manage the dialog open/close state locally. The dialog opens when a mutation result arrives (success) and can be closed by the user. Closing the dialog SHOULD also clear the text selection.

#### Scenario: Dialog opens on mutation success

- GIVEN the mutation completes with an explanation
- WHEN the result arrives
- THEN the dialog opens automatically with the explanation

#### Scenario: Closing dialog clears selection

- GIVEN the dialog is open
- WHEN the user closes the dialog
- THEN `clearSelection()` from `useTextSelection` is called
- AND the toolbar disappears
