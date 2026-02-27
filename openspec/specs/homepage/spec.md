# Homepage Specification

## Purpose

Defines the required UI behaviour and visual consistency of the homepage — the job listing page served at `/`. Covers the page skeleton, job list, source filter chips, admin bar, and user preferences strip.

---

## Requirements

### Requirement: Spacing via Design System Tokens

All spacing between components on the homepage MUST be expressed using Radix UI layout props (`mt`, `mb`, `py`, `px`, `gap`). Components SHALL NOT use `style={{ marginTop: N }}` or `style={{ marginBottom: N }}` when an equivalent Radix prop is available.

#### Scenario: Skeleton spacing uses Radix props

- GIVEN the page is loading and the PageSkeleton is rendered
- WHEN a Skeleton element needs vertical spacing relative to its sibling
- THEN the spacing MUST be expressed with `mt` or `mb` props on the Radix Skeleton component
- AND no `style={{ marginTop }}` or `style={{ marginBottom }}` attribute SHALL appear on Skeleton elements

#### Scenario: CSS-only properties remain inline

- GIVEN a component requires CSS properties with no Radix prop equivalent (e.g., `borderRadius`, `overflow`, `flexShrink`, `cursor`, `userSelect`)
- WHEN the component is rendered
- THEN those properties MAY be expressed as inline `style` attributes

---

### Requirement: Text Color via Radix Color Prop

Secondary or muted text on the homepage MUST use the Radix `color` prop on `<Text>` components. Components SHALL NOT use `style={{ color: "var(--gray-N)" }}` for standard gray text variations.

#### Scenario: Muted label text uses color prop

- GIVEN a Text element is used for a secondary label (job count, "sources" label, "no jobs found", footer footers)
- WHEN the component is rendered
- THEN the text color MUST be set via `color="gray"` on the Radix Text component
- AND no `style={{ color: "var(--gray-..." }}` attribute SHALL appear

#### Scenario: CSS variables for non-standard colors remain inline

- GIVEN a text element requires a specific design token not representable by a Radix color name
- WHEN the component is rendered
- THEN inline `style={{ color: "var(--...)" }}` MAY be used

---

### Requirement: Interactive Controls Use Semantic Radix Components

Interactive elements (buttons, toggles) on the homepage MUST use Radix interactive components (`Button`, `IconButton`). Presentational Radix components (e.g., `Badge`) SHALL NOT be used as the sole wrapper for click handlers requiring button semantics.

#### Scenario: Error retry is a Radix Button

- GIVEN the job list has failed to load
- WHEN the error state is rendered
- THEN a `<Button>` from `@radix-ui/themes` MUST be used for the retry action
- AND no `<button className="...">` raw HTML element SHALL be used

#### Scenario: Source filter chips retain interactive Badge pattern

- GIVEN source filter chips render as toggleable Badge elements
- WHEN a chip is rendered
- THEN `role="checkbox"`, `aria-checked`, `tabIndex={0}`, and `onKeyDown` handlers MUST be present
- AND the `cursor` and `userSelect` CSS properties MAY be expressed as inline styles since Radix Badge has no prop equivalent

---

### Requirement: Decorative Apply Indicator Uses Badge

The "apply" indicator shown in job rows to signal an external application URL MUST be rendered as a Radix `<Badge>` component. It SHALL NOT use a raw `<span>` or custom CSS class that mimics button appearance.

#### Scenario: Apply badge renders for jobs with a URL

- GIVEN a job row has a non-null `url` field
- WHEN the job row is rendered
- THEN a `<Badge variant="outline" color="gray">apply</Badge>` MUST be displayed in the actions area
- AND it MUST NOT be wrapped in a `<button>` or `<a>` element (the parent `<Link>` handles navigation)

#### Scenario: Apply badge absent for jobs without a URL

- GIVEN a job row has a null or missing `url` field
- WHEN the job row is rendered
- THEN no apply indicator SHALL be rendered

---

### Requirement: Admin Bar Uses Radix Layout Components

The admin bar MUST use Radix layout and typography components exclusively. It SHALL NOT use global CSS class names (`yc-row-meta`) for text display or raw inline `marginBottom` styles for its container.

#### Scenario: Admin email uses Radix Text

- GIVEN the user is an admin and the admin bar is visible
- WHEN the admin bar is rendered
- THEN the admin email address MUST be displayed using `<Text size="1" color="gray">`
- AND no `<span className="yc-row-meta">` SHALL be used

#### Scenario: Admin bar container spacing uses Radix prop

- GIVEN the admin bar is rendered above the main content
- WHEN the Card container is rendered
- THEN bottom spacing MUST be expressed via the `mb` prop on the Card component
- AND no `style={{ marginBottom: N }}` SHALL appear on the Card

---

### Requirement: Source Filter Label Uses Radix Color Prop

The "sources" label in the source filter MUST use the Radix `color` prop on `<Text>`. It SHALL NOT use a `style={{ color: "var(--gray-N)" }}` attribute.

#### Scenario: Sources label renders with gray color prop

- GIVEN the source filter is rendered on the homepage
- WHEN the "sources" label is displayed
- THEN it MUST use `<Text size="1" color="gray">sources</Text>`

---

### Requirement: Filter Chip Size Uses Radix Badge Size Prop

Source filter chip Badge components MUST use the Radix `size` prop to control their dimensions. They SHALL NOT use inline `style` for `padding` or `minHeight` overrides.

#### Scenario: Filter chips use size="2"

- GIVEN source filter chips are rendered
- WHEN a chip Badge is displayed
- THEN `size="2"` MUST be set on the Badge component
- AND no `style={{ padding: ..., minHeight: ... }}` SHALL appear on the Badge

---

### Requirement: User Preferences Secondary Text Uses Radix Color Prop

Empty-state helper text in the user preferences strip MUST use the Radix `color` prop on `<Text>`. It SHALL NOT use `style={{ color: "var(--gray-N)" }}`.

#### Scenario: No-preferences helper text uses color prop

- GIVEN the user has no preferences set
- WHEN the user preferences strip is rendered
- THEN the helper message MUST use `<Text size="1" color="gray">`
- AND no inline color style SHALL appear

---

### Requirement: Admin IconButton Cursor Delegated to Radix

Admin action `IconButton` components MUST NOT set `style={{ cursor: ... }}` manually. The Radix `disabled` prop MUST be used to signal disabled state, and cursor styling SHALL be delegated to the Radix component.

#### Scenario: Reported job report button shows as disabled

- GIVEN a job has `status === "reported"`
- WHEN the report IconButton is rendered
- THEN `disabled={true}` MUST be set on the Radix IconButton
- AND no `style={{ cursor: ... }}` SHALL appear on the IconButton

#### Scenario: Active report button has no manual cursor style

- GIVEN a job has a status other than "reported"
- WHEN the report IconButton is rendered
- THEN no `style={{ cursor: "pointer" }}` SHALL appear on the IconButton
