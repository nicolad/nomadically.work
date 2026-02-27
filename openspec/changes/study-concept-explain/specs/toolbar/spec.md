# Study Concept Toolbar Specification

## Purpose

A minimal floating toolbar that appears above selected text on study topic pages, offering a single "Explain this" action. This is a simplified version of the `TextSelectionToolbar` used on application detail pages — no link/match/dive features.

## Requirements

### Requirement: Toolbar Visibility

The `StudyConceptToolbar` component MUST render only when both `selectedText` is non-empty and `selectionRect` is non-null (values provided by `useTextSelection`).

#### Scenario: Toolbar appears on text selection

- GIVEN the user is on a study topic page
- WHEN the user selects text within the markdown content area
- THEN the toolbar appears floating above the selection

#### Scenario: Toolbar hidden when no selection

- GIVEN no text is selected (or selection is collapsed)
- WHEN the component renders
- THEN nothing is rendered (returns null)

---

### Requirement: Toolbar Positioning

The toolbar MUST be positioned absolutely, centered horizontally above the selection using the same floating-above pattern as `TextSelectionToolbar`: `top = selectionRect.top + window.scrollY - offset`, `left = selectionRect.left + selectionRect.width / 2`, `transform: translateX(-50%)`.

#### Scenario: Toolbar floats above selection

- GIVEN the user selects text in the middle of the content area
- WHEN the toolbar renders
- THEN it appears centered above the selected range, not overlapping the text

---

### Requirement: Explain This Button

The toolbar MUST contain a single "Explain this" button using Radix UI `Button` component.

#### Scenario: Button triggers explanation

- GIVEN the toolbar is visible with selected text "PRAGMA foreign_keys"
- WHEN the user clicks the "Explain this" button
- THEN the `onExplain` callback is invoked with the selected text string

#### Scenario: Button disabled while loading

- GIVEN an explanation request is in progress (`isLoading` is true)
- WHEN the toolbar renders
- THEN the "Explain this" button is disabled

---

### Requirement: Loading State

The toolbar MUST show a loading indicator when `isLoading` is true, replacing the button text with "Explaining..." or a spinner.

#### Scenario: Loading indicator displayed

- GIVEN the user has clicked "Explain this"
- WHEN the mutation is in flight
- THEN the toolbar shows "Explaining..." text instead of the button

---

### Requirement: Props Interface

The component MUST accept the following props: `selectedText: string`, `selectionRect: DOMRect | null`, `isLoading: boolean`, `onExplain: (text: string) => void`.

#### Scenario: Component renders with required props

- GIVEN valid props with selectedText and selectionRect
- WHEN the component mounts
- THEN it renders without errors

---

### Requirement: Selection Text Captured Before Click

The parent component MUST capture the selected text into state before the toolbar renders or processes a click event. The `onExplain` callback MUST NOT read from `window.getSelection()` — it receives the text as an argument.

#### Scenario: Selection preserved across click

- GIVEN the user selects "foreign key constraint"
- AND the toolbar renders with that text in props
- WHEN the user clicks "Explain this" (which may clear the browser selection)
- THEN `onExplain` is called with "foreign key constraint" (from props, not live selection)
