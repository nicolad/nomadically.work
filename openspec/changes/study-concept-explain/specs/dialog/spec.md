# Concept Explanation Dialog Specification

## Purpose

A Radix UI Dialog that displays an LLM-generated explanation of a selected concept, rendered as markdown. Manages open/close state, loading state, and error display.

## Requirements

### Requirement: Dialog Open State

The `ConceptExplanationDialog` MUST be controlled via an `open: boolean` prop and an `onOpenChange: (open: boolean) => void` callback, following the Radix UI `Dialog.Root` controlled pattern.

#### Scenario: Dialog opens when explanation is ready

- GIVEN an explanation has been returned from the mutation
- WHEN the parent sets `open` to true
- THEN the dialog overlay and content appear

#### Scenario: Dialog closes on dismiss

- GIVEN the dialog is open
- WHEN the user clicks the overlay, presses Escape, or clicks the close button
- THEN `onOpenChange(false)` is called
- AND the dialog closes

---

### Requirement: Explanation Rendered as Markdown

The dialog content MUST render the `explanation` string using `ReactMarkdown` with `remarkGfm` plugin, consistent with how study topic body content is rendered.

#### Scenario: Markdown explanation displayed

- GIVEN the explanation contains markdown with headers, code blocks, and lists
- WHEN the dialog is open
- THEN the explanation is rendered with proper markdown formatting (headers, fenced code, bullet lists, tables)

---

### Requirement: Dialog Title Shows Selected Text

The dialog MUST display the selected text as a title or subtitle so the user knows what concept is being explained. The selected text SHOULD be truncated if longer than 80 characters with an ellipsis.

#### Scenario: Short selected text displayed in full

- GIVEN the selected text is "PRAGMA foreign_keys = ON"
- WHEN the dialog is open
- THEN the dialog title/subtitle shows "PRAGMA foreign_keys = ON"

#### Scenario: Long selected text truncated

- GIVEN the selected text is 120 characters long
- WHEN the dialog is open
- THEN the dialog title/subtitle shows the first 80 characters followed by "..."

---

### Requirement: Loading State

The dialog MUST display a loading state when `loading` is true, showing a skeleton or spinner placeholder instead of explanation content.

#### Scenario: Loading skeleton shown

- GIVEN the mutation is in flight (`loading` is true)
- WHEN the dialog is open
- THEN a loading skeleton/spinner is displayed in the content area
- AND the dialog title still shows the selected text

---

### Requirement: Error State

The dialog MUST display an error message when `error` is provided (non-null string or Error object), instead of explanation content.

#### Scenario: Error message displayed

- GIVEN the mutation returned an error
- WHEN the dialog is open with `error` set
- THEN an error message is displayed (e.g., "Failed to generate explanation. Please try again.")
- AND no markdown content is rendered

---

### Requirement: Props Interface

The component MUST accept: `open: boolean`, `onOpenChange: (open: boolean) => void`, `selectedText: string`, `explanation: string | null`, `loading: boolean`, `error: string | null`.

#### Scenario: All props provided

- GIVEN valid props with explanation content
- WHEN the component renders with `open: true`
- THEN the dialog displays correctly with all sections
