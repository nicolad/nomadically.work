# Delta for Homepage

## ADDED Requirements

### Requirement: Single Authoritative Container

The homepage MUST use exactly one `<Container>` element to define the page width. Child components (including `UnifiedJobsProvider`) SHALL NOT render their own `<Container>` elements.

#### Scenario: UnifiedJobsProvider renders without a Container

- GIVEN the homepage is loaded at `/`
- WHEN `UnifiedJobsProvider` renders its content
- THEN no `<Container>` element SHALL appear inside the provider's render tree
- AND all content MUST inherit the page-level `<Container size="4">` from `page.tsx`

#### Scenario: Nested container does not shift spacing

- GIVEN a developer inspects the homepage DOM
- WHEN they look at the container hierarchy
- THEN there MUST be exactly one Radix `Container` element wrapping the page content

---

### Requirement: Search Bar Border Radius Consistency

The `JobsSearchBar` `TextField.Root` MUST use `radius="large"` to match the border-radius of the job list card and other interactive elements on the page. The search bar SHALL NOT use `radius="none"`.

#### Scenario: Search bar renders with rounded corners

- GIVEN the homepage is loaded
- WHEN the `JobsSearchBar` is rendered
- THEN the `TextField.Root` MUST have `radius="large"`
- AND the visual border-radius MUST match the job list card border-radius

#### Scenario: Search bar radius matches job list card

- GIVEN the search bar and job list card are both visible
- WHEN a user views the page
- THEN the corner radius on both elements MUST appear visually identical

---

### Requirement: Job List Card Uses Design System Spacing

The `jobListCard` style MUST NOT use pixel-based margin values outside the Radix spacing scale. Horizontal alignment between the job list card, search bar, and source filter MUST be achieved through the parent layout container alone.

#### Scenario: Job list card has no custom horizontal margin

- GIVEN the homepage job list is rendered
- WHEN the `jobListCard` styles are applied
- THEN no `margin: "0 4px"` or equivalent pixel-based horizontal margin SHALL appear
- AND the card MUST align flush with the search bar and source filter above it

#### Scenario: Card aligns with sibling components

- GIVEN the search bar, source filter, and job list card are rendered
- WHEN a user views the page
- THEN all three components MUST share the same left and right edges

---

### Requirement: Unified Border Color Token

All border colors within the job list area (card border, row dividers, search bar border) MUST use a single semantic gray token. Components SHALL NOT mix `--gray-4`, `--gray-5`, `--gray-6`, and `--gray-a5` for borders within the same visual group.

#### Scenario: Job list card border uses unified token

- GIVEN the job list card is rendered
- WHEN the card border is applied
- THEN the border color MUST use `var(--gray-6)`

#### Scenario: Job row dividers use the same token as the card border

- GIVEN job rows are rendered inside the job list card
- WHEN row dividers are displayed
- THEN the divider color MUST use `var(--gray-6)`
- AND no other gray token SHALL be used for dividers

#### Scenario: Search bar border uses the same token

- GIVEN the search bar is rendered
- WHEN the search bar border is displayed
- THEN the border color MUST use `var(--gray-6)`
- AND no inline `style` SHALL override the border color with a different gray token

---

### Requirement: Source Kind Badge Uses Radix Badge Component

The source kind indicator in job rows MUST be rendered as a Radix `<Badge>` component. It SHALL NOT use a custom vanilla-extract class (`jobRowMetaBadge`) with manually specified border-radius, border, and color values.

#### Scenario: Source kind renders as a Radix Badge

- GIVEN a job row is rendered with a source kind value
- WHEN the source kind indicator is displayed
- THEN it MUST use `<Badge size="1" variant="outline" color="gray">`
- AND no custom `<span>` with the `jobRowMetaBadge` class SHALL be used

#### Scenario: Source kind badge matches apply badge styling

- GIVEN a job row has both a source kind indicator and an apply badge
- WHEN both badges are rendered
- THEN they MUST use the same Radix Badge component with matching `variant` and `color` props

---

### Requirement: Skeleton Border Matches Loaded State

The `PageSkeleton` border color and border-radius MUST match the values used by the loaded `jobListCard` component. The skeleton SHALL NOT use different token values that cause a visible jump on hydration.

#### Scenario: Skeleton border color matches job list card

- GIVEN the page is loading and PageSkeleton is rendered
- WHEN the skeleton job list area is displayed
- THEN the border color MUST be `var(--gray-6)`
- AND the `borderRadius` MUST match the `jobListCard` border-radius value

#### Scenario: No visible border change on hydration

- GIVEN the page transitions from loading to loaded state
- WHEN the skeleton is replaced by the real job list
- THEN there MUST be no visible change in border color or border-radius between the skeleton and the loaded card

---

### Requirement: Visual Separation Between Identity and Controls

The homepage MUST have clear visual separation between the identity section (heading and subtitle) and the interaction section (search bar, filters, preferences). This separation SHOULD be achieved through a `<Separator />` component or through sufficient spacing differentiation.

#### Scenario: Separator or spacing distinguishes heading from controls

- GIVEN the homepage is loaded
- WHEN the heading block and controls block are rendered
- THEN there MUST be a visible boundary between the two sections
- AND this boundary MUST be implemented using either a Radix `<Separator />` or a margin value that is at least 2 scale steps larger than the spacing within each section

#### Scenario: Heading and controls are not visually blurred

- GIVEN a user scans the homepage
- WHEN they view the area between the heading and the search bar
- THEN the identity section and interaction section MUST be perceived as distinct visual groups

---

### Requirement: Conditional User Preferences Wrapper

The wrapping `Box` around the `UserPreferences` component MUST only be rendered when the user is signed in. When the user is signed out, no empty spacing element SHALL remain in the layout where the preferences strip would appear.

#### Scenario: Signed-in user sees preferences with spacing

- GIVEN the user is signed in
- WHEN the homepage is rendered
- THEN the `UserPreferences` component MUST be rendered inside a `Box` with appropriate bottom margin

#### Scenario: Signed-out user sees no empty space for preferences

- GIVEN the user is not signed in
- WHEN the homepage is rendered
- THEN no `Box` with bottom margin for preferences SHALL be rendered
- AND the layout MUST flow directly from the heading/controls to the job list without a gap

## MODIFIED Requirements

### Requirement: Filter Chip Size Uses Radix Badge Size Prop

Source filter chip Badge components MUST use the Radix `size` prop to control their dimensions. They SHALL NOT use inline `style` for `padding` or `minHeight` overrides. The chip appearance MUST be visually consistent with other Badge instances on the page (e.g., the source kind badge in job rows).

(Previously: Only required size="2" and no inline padding/minHeight. Did not address cross-component visual consistency with job row badges.)

#### Scenario: Filter chips use size="2"

- GIVEN source filter chips are rendered
- WHEN a chip Badge is displayed
- THEN `size="2"` MUST be set on the Badge component
- AND no `style={{ padding: ..., minHeight: ... }}` SHALL appear on the Badge

#### Scenario: Filter chips and job row source kind badges share visual language

- GIVEN both source filter chips and job row source kind badges are visible
- WHEN a user views the page
- THEN both MUST use Radix Badge components
- AND the border-radius and border style MUST come from the Radix Badge defaults, not custom CSS

## REMOVED Requirements

(None)
