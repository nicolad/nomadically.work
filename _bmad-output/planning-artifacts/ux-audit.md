# UX Audit: UI/UX Inconsistencies in nomadically.work

**Date:** 2026-02-24
**Author:** UX Researcher (Agent Teams)
**Scope:** `src/app/page.tsx`, `src/app/layout.tsx`, `src/app/globals.css`, all files in `src/components/`

---

## Styling Approach Inconsistencies

### Three competing styling systems

The codebase uses three distinct approaches to styling, often within the same component:

1. **Custom CSS classes** (`globals.css`) -- `.yc-*` namespace: `yc-nav`, `yc-row`, `yc-cta`, `yc-cta-ghost`, `yc-badge`, `yc-panel`, `yc-search`, `yc-row-title`, `yc-row-meta`, `job-row`, `job-row-*`, `job-list-card`
2. **Radix Themes components** -- `<Button>`, `<Badge>`, `<Card>`, `<TextField>`, `<IconButton>`, `<Callout>`, `<Dialog>`, `<Tabs>`, `<Table>`, etc.
3. **Inline `style={{}}` objects** -- scattered heavily throughout every component

**Priority: HIGH** -- This is the root cause of most other inconsistencies. There is no single source of truth for visual patterns.

### Specific clashes

| Pattern | Custom CSS | Radix | Inline | Files |
|---|---|---|---|---|
| Primary button | `.yc-cta` | `<Button variant="solid">` | -- | auth-header.tsx, jobs-list.tsx, companies-list.tsx vs. delete-all-jobs-button.tsx, process-all-jobs-button.tsx |
| Ghost button | `.yc-cta-ghost` | `<Button variant="soft/ghost">` | -- | auth-header.tsx, jobs-list.tsx vs. user-preferences.tsx, exercise-timer.tsx |
| Badge/tag | `.yc-badge`, `.yc-badge--orange/green` | `<Badge>` | -- | globals.css (defined but barely used) vs. unified-jobs-provider.tsx, company-detail.tsx |
| Card/panel | `.yc-panel` | `<Card>` | `style={{ border: "1px solid var(--gray-6)", borderRadius: 8 }}` | globals.css vs. company-detail.tsx, chats-provider.tsx vs. page.tsx skeleton |
| Search input | `.yc-search input` | `<TextField.Root>` | -- | companies-list.tsx vs. JobsSearchBar.tsx |
| Row/list item | `.yc-row`, `.job-row` | -- | `style={{ display: "flex", ... }}` | companies-list.tsx vs. jobs-list.tsx vs. company-detail.tsx |
| Text meta | `.yc-row-meta` | `<Text size="1" color="gray">` | `style={{ color: "var(--gray-9)" }}` | companies-list.tsx, admin-bar.tsx, auth-header.tsx vs. jobs-list.tsx, unified-jobs-provider.tsx |

**Priority: HIGH**

### Radix Themes overrides in globals.css fight against Radix's own API

Lines 345-401 of `globals.css` use `!important` to forcefully override Radix Themes internals:

- `.rt-Card` -- removes border-radius, box-shadow, forces gray background
- `.rt-Button` -- removes border-radius, forces lowercase
- `.rt-Badge` -- removes border-radius
- `.rt-TextFieldRoot` / `.rt-TextFieldInput` -- removes border-radius

This creates a situation where Radix component props like `radius="full"` or `variant="surface"` are partially overridden by global CSS, making behavior unpredictable. For example, `<IconButton radius="full">` in JobsSearchBar.tsx may not actually render as round because `.rt-Button { border-radius: 0 !important; }` fights it.

**Priority: HIGH**

---

## Button Pattern Inventory

Every button instance across all audited files:

### Raw `<button>` with `.yc-cta` class (primary action)

| File | Line | Code | Notes |
|---|---|---|---|
| `auth-header.tsx` | 27 | `<button className="yc-cta">sign up</button>` | Wrapped in `<Link>` |
| `jobs-list.tsx` | 192-197 | `<button className="yc-cta" onClick={() => refetch()} style={{ marginTop: 12 }}>retry</button>` | Error state retry |
| `companies-list.tsx` | 119-124 | `<button className="yc-cta" onClick={() => refetch()} style={{ marginTop: 12 }}>retry</button>` | Error state retry |

### Raw `<button>` with `.yc-cta-ghost` class (secondary action)

| File | Line | Code | Notes |
|---|---|---|---|
| `auth-header.tsx` | 23 | `<button className="yc-cta-ghost">sign in</button>` | Wrapped in `<Link>` |
| `auth-header.tsx` | 47 | `<button className="yc-cta-ghost" onClick={...}>sign out</button>` | Direct handler |

### `<span>` styled as button (not a real button)

| File | Line | Code | Notes |
|---|---|---|---|
| `jobs-list.tsx` | 347-350 | `<span className="yc-cta-ghost" style={{ fontSize: 12, padding: "4px 12px" }}>apply</span>` | Not focusable, no keyboard interaction |
| `companies-list.tsx` | 233-238 | `<span className="yc-cta" style={{ fontSize: 11, padding: "2px 8px" }}>website</span>` | Not focusable, no keyboard interaction |

### Radix `<Button>` component

| File | Line | Variant/Color | Notes |
|---|---|---|---|
| `delete-all-jobs-button.tsx` | 30 | `size="2" color="red" variant="soft"` | Trigger |
| `delete-all-jobs-button.tsx` | 43 | `variant="soft" color="gray"` | Cancel |
| `delete-all-jobs-button.tsx` | 48-53 | `variant="solid" color="red"` | Confirm delete |
| `process-all-jobs-button.tsx` | 47-52 | `variant="solid" color="blue"` | Primary action |
| `user-preferences.tsx` | 217 | `variant="ghost" size="1" color="gray"` | Edit trigger |
| `user-preferences.tsx` | 249-254 | `size="2"` (default) | Add location |
| `user-preferences.tsx` | 296-299 | `size="2"` (default) | Add skill |
| `user-preferences.tsx` | 324 | `variant="soft" color="gray"` | Done |
| `company-detail.tsx` | 145-151 | `size="2" variant="ghost" color="gray"` | Show more/less |
| `company-detail.tsx` | 197-200 | `size="2" variant="ghost" color="gray"` | Show more/less |
| `company-detail.tsx` | 787-794 | `color="orange" variant="solid"` | Enhance (admin) |
| `chats-provider.tsx` | 288 | `size="3"` (default) | New Chat |
| `chats-provider.tsx` | 314 | `size="3" variant="soft"` | Sign In |
| `chats-provider.tsx` | 318 | `size="3"` (default) | Sign Up |
| `chats-provider.tsx` | 347-362 | `size="3"` (default) | Query |
| `chats-provider.tsx` | 641-645 | `size="3"` (default) | Send |
| `exercise-timer.tsx` | 62-69 | `size="1" variant="soft"` | Start/Resume |
| `exercise-timer.tsx` | 72-78 | `size="1" variant="soft" color="orange"` | Pause |
| `exercise-timer.tsx` | 81-90 | `size="1" variant="ghost"` | Reset |
| `SqlQueryModal.tsx` | 281-288 | default (solid) | Run |
| `SqlQueryModal.tsx` | 290-294 | `variant="soft"` | Clear |
| `SqlQueryModal.tsx` | 301 | `variant="soft"` | Copy SQL |
| `SqlQueryModal.tsx` | 305-313 | `variant="soft"` | Show matching jobs |
| `UnifiedQueryBar.tsx` | 400-406 | `variant="soft"` | Copy SQL |
| `UnifiedQueryBar.tsx` | 410-419 | `variant="soft"` | Show matching jobs |

### Radix `<IconButton>` component

| File | Line | Variant | aria-label? |
|---|---|---|---|
| `jobs-list.tsx` | 355-363 | `size="3" color="gray" variant="soft"` | `title="Hide company"` (no aria-label) |
| `jobs-list.tsx` | 366-375 | `size="3" color="orange" variant="soft"` | `title` only |
| `jobs-list.tsx` | 379-386 | `size="3" color="red" variant="soft"` | No aria-label |
| `companies-list.tsx` | 241-249 | `size="1" color="red" variant="ghost"` | No aria-label |
| `user-preferences.tsx` | 167-175 | `size="1" variant="ghost" color="gray"` | `aria-label="Remove {location}"` |
| `user-preferences.tsx` | 195-203 | `size="1" variant="ghost" color="gray"` | `aria-label="Remove {skill}"` |
| `user-preferences.tsx` | 263-269 | `size="1" variant="ghost"` | `aria-label="Remove {location}"` |
| `user-preferences.tsx` | 307-313 | `size="1" variant="ghost"` | `aria-label="Remove {skill}"` |
| `JobsSearchBar.tsx` | 115-122 | `variant="ghost" radius="full"` | `aria-label="Clear input"` |
| `JobsSearchBar.tsx` | 127-137 | `variant="ghost" radius="full"` | `aria-label="Run search"` |
| `SqlSearchBar.tsx` | 111-118 | `variant="ghost" radius="full"` | `aria-label="Clear input"` |
| `SqlSearchBar.tsx` | 122-130 | `variant="ghost" radius="full"` | `aria-label="Run SQL query"` |
| `SqlQueryInterface.tsx` | 125-132 | `variant="ghost" radius="full"` | `aria-label="Clear input"` |
| `SqlQueryInterface.tsx` | 136-144 | `variant="ghost" radius="full"` | `aria-label="Run SQL query"` |
| `UnifiedQueryBar.tsx` | 316-323 | `variant="ghost" radius="full"` | `aria-label="Clear input"` |
| `UnifiedQueryBar.tsx` | 328-338 | `variant="ghost" radius="full"` | `aria-label` present |
| `SqlQueryModal.tsx` | 236-242 | `variant="ghost" radius="full"` | `aria-label="Close"` |

### Summary

- **5 instances** of raw `<button>` with custom CSS classes
- **2 instances** of `<span>` pretending to be a button
- **~25 instances** of Radix `<Button>`
- **~18 instances** of Radix `<IconButton>`
- Text casing inconsistency: `.yc-cta`/`.yc-cta-ghost` force lowercase; some Radix Buttons use TitleCase ("Delete All Jobs"), others lowercase ("retry")

**Priority: HIGH**

---

## Hardcoded Values to Replace

### Hardcoded pixel values in inline styles

| File | Line(s) | Value | Should be |
|---|---|---|---|
| `layout.tsx` | 44 | `marginRight: 24` | Radix spacing token (e.g., `mr="5"`) |
| `layout.tsx` | 63 | `style={{ flex: 1 }}` | Radix `flexGrow="1"` |
| `page.tsx` | 13 | `style={{ marginTop: 6 }}` | Radix `mt="1"` |
| `page.tsx` | 16 | `style={{ borderRadius: 8 }}` | Radix `radius` prop |
| `page.tsx` | 17 | `style={{ borderRadius: 999 }}` | `radius="full"` |
| `page.tsx` | 24 | `style={{ border: "1px solid var(--gray-4)", borderRadius: 8, overflow: "hidden" }}` | Radix Card or custom component |
| `page.tsx` | 26-27 | `borderBottom`, `borderRadius: 6` | Component abstraction |
| `admin-bar.tsx` | 15-23 | `gap: 8, padding: "6px 12px", marginBottom: 8, borderRadius: 0` | Radix Box/Flex props |
| `admin-bar.tsx` | 28-33 | `fontSize: 10, padding: "0 4px", lineHeight: "16px"` | Use shared Badge component |
| `jobs-list.tsx` | 194 | `style={{ marginTop: 12 }}` | Radix `mt="3"` |
| `jobs-list.tsx` | 278 | `style={{ fontSize: 10, textTransform: "lowercase" }}` | Global Badge style or prop |
| `jobs-list.tsx` | 348 | `style={{ fontSize: 12, padding: "4px 12px" }}` | Component abstraction |
| `companies-list.tsx` | 142 | `style={{ marginBottom: 12 }}` | Radix `mb="3"` |
| `companies-list.tsx` | 163-171 | `width: 24, height: 24, objectFit: "contain", marginRight: 10, borderRadius: 0` | Avatar component |
| `companies-list.tsx` | 191-196 | `fontSize: 10, padding: "0 4px", lineHeight: "16px"` | Shared badge pattern |
| `companies-list.tsx` | 225-230 | `gap: 6, marginLeft: 12` | Radix spacing |
| `companies-list.tsx` | 235 | `style={{ fontSize: 11, padding: "2px 8px" }}` | Component abstraction |
| `company-detail.tsx` | 86-87 | `fontWeight: 600, letterSpacing: 0.2` | Typography token |
| `company-detail.tsx` | 104-108 | `maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis"` | Shared truncation util |
| `company-detail.tsx` | 259-266 | Multiple inline style objects | Radix props |
| `company-detail.tsx` | 318-319 | `fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase"` | Typography class |
| `chats-provider.tsx` | 373 | `style={{ height: "calc(100vh - 340px)" }}` | Layout system |
| `chats-provider.tsx` | 377-380 | `width: "300px", borderRight: "1px solid var(--gray-6)"` | Component with Radix tokens |
| `chats-provider.tsx` | 397-399 | `backgroundColor: selectedChatId === chat.id ? "var(--accent-3)" : undefined` | Radix Card `data-state` or variant |
| `chats-provider.tsx` | 464-472 | `alignSelf, maxWidth, backgroundColor` on Card | Chat bubble component abstraction |
| `chats-provider.tsx` | 524-531 | `padding: 8, borderRadius: 8, boxShadow, fontSize: "12px"` | Code block component |
| `SqlQueryInterface.tsx` | 81 | `<h1 style={{ marginBottom: "0.5rem" }}>` | Radix `<Heading>` |
| `SqlQueryInterface.tsx` | 83 | `<p style={{ color: "var(--gray-11)" }}>` | Radix `<Text>` |
| `UnifiedQueryBar.tsx` | 249-252 | `boxShadow: "0 0 0 1px var(--gray-a5) inset"` | Repeated in 4 files |
| `SqlSearchBar.tsx` | 79 | Same boxShadow pattern | Shared TextField wrapper |
| `SqlQueryModal.tsx` | 224 | `style={{ maxWidth: 980 }}` | Radix Dialog `maxWidth` prop |
| `markdown-content.tsx` | 39-44 | `padding: "12px 16px"` | Radix spacing |
| `markdown-content.tsx` | 49-52 | `fontSize: 12` | Radix `size` token |

**Priority: MEDIUM**

### Repeated inline boxShadow pattern

The pattern `boxShadow: "0 0 0 1px var(--gray-a5) inset"` appears in:
- `JobsSearchBar.tsx:105`
- `SqlSearchBar.tsx:79`
- `SqlQueryInterface.tsx:92`
- `UnifiedQueryBar.tsx:251`
- `SqlQueryModal.tsx:360` (similar variant)
- `chats-provider.tsx:531` (similar variant)

This should be a CSS class or a shared TextField wrapper component.

**Priority: MEDIUM**

---

## Accessibility Gaps

### Missing `aria-label` on icon-only interactive elements

| File | Line | Element | Issue | Priority |
|---|---|---|---|---|
| `layout.tsx` | 65-76 | GitHub icon link | No `aria-label` on the link wrapping `GitHubLogoIcon` | HIGH |
| `admin-nav.tsx` | 24-33 | Reported jobs icon link | Has `title` but no `aria-label` | MEDIUM |
| `auth-header.tsx` | 43-44 | Settings gear icon link | No `aria-label` | HIGH |
| `jobs-list.tsx` | 355-363 | Hide company IconButton | `title` only, no `aria-label` | HIGH |
| `jobs-list.tsx` | 366-375 | Report job IconButton | `title` only, no `aria-label` | HIGH |
| `jobs-list.tsx` | 379-386 | Delete job IconButton | No `aria-label`, no `title` | HIGH |
| `companies-list.tsx` | 241-249 | Delete company IconButton | No `aria-label` | HIGH |

### Interactive elements that are not proper buttons

| File | Line | Element | Issue | Priority |
|---|---|---|---|---|
| `jobs-list.tsx` | 347-350 | `<span className="yc-cta-ghost">apply</span>` | Not a button or link, not focusable, no keyboard access | HIGH |
| `companies-list.tsx` | 233-238 | `<span className="yc-cta" ...>website</span>` | Same issue | HIGH |
| `jobs-list.tsx` | 287-296 | `<span className="job-row-company" onClick={...}>` | Clickable span, not a button/link, no role, no keyboard | HIGH |
| `unified-jobs-provider.tsx` | 58-65 | `<Badge onClick={handleRemoteEuToggle}>` | Badge is not intended as a toggle; no `role="switch"` or `aria-pressed` | MEDIUM |

### Missing `aria-live` regions

| File | Issue | Priority |
|---|---|---|
| `jobs-list.tsx` | Job count has `aria-live="polite"` -- good | -- |
| `companies-list.tsx` | Company count uses `<span className="yc-row-meta">` with no `aria-live` | MEDIUM |
| `chats-provider.tsx` | Chat messages area has no `aria-live` for new messages | MEDIUM |

### Color contrast concerns

| File | Token | Usage | Potential Issue | Priority |
|---|---|---|---|---|
| Multiple | `var(--gray-9)` | Meta text, timestamps, secondary info | May fail WCAG AA (4.5:1) on dark background depending on exact theme | MEDIUM |
| `jobs-list.tsx` | Inline SVG `opacity: 0.5` on location pin | Further reduces already-secondary color | LOW |

### Focus management

| File | Issue | Priority |
|---|---|---|
| `layout.tsx` | Nav links have no focus-visible styles (rely on browser default which `.yc-nav a` may override) | MEDIUM |
| `jobs-list.tsx` | Skeleton loading rows have `aria-hidden="true"` -- good | -- |
| `companies-list.tsx` | Raw `<input>` inside `.yc-search` has no visible focus indicator beyond `border-color` | MEDIUM |

---

## Additional Issues

### Duplicate/near-duplicate components

| Components | Overlap | Priority |
|---|---|---|
| `SqlSearchBar.tsx` and `SqlQueryInterface.tsx` | Nearly identical code (~90% overlap). Both wrap `SqlQueryModal`. | MEDIUM |
| `JobsSearchBar.tsx` and search input in `companies-list.tsx` | Same concept, completely different implementations (Radix TextField vs raw `.yc-search input`) | HIGH |
| `UnifiedQueryBar.tsx` | Superset of `SqlSearchBar` + `JobsSearchBar`; appears unused on homepage (replaced by `SearchQueryBar`) | LOW |

### Inconsistent text casing conventions

| Location | Casing | Examples |
|---|---|---|
| Custom CSS buttons (`.yc-cta`) | `text-transform: lowercase` | "sign in", "retry", "apply" |
| Radix Button text in admin components | TitleCase | "Delete All Jobs", "Enhance & Classify All", "Cancel" |
| Radix Button text in preferences | TitleCase | "Add", "Done", "Edit" |
| Radix Button text in exercise-timer | TitleCase | "Start", "Resume", "Pause", "Reset" |
| Page headings | lowercase | "remote EU jobs", "companies" |
| Company detail headings | TitleCase | "Overview", "Contacts", "Jobs", "Key facts" |

The design system comment in `globals.css` says "CTAs: lowercase, no '!' or 'Now'" but this is only enforced in `.yc-cta` classes, not in Radix Buttons.

**Priority: MEDIUM**

### Typography inconsistencies

| Property | Values found | Files |
|---|---|---|
| Font size for titles | `13px` (`.yc-row-title`), `17px` (`.job-row-title`), `15px` (responsive), `14px` (inline override in companies-list) | globals.css, companies-list.tsx |
| Font size for meta | `12px` (`.yc-row-meta`), `13px` (`.job-row-meta-item`), `11px` (`.job-row-meta-badge`), `10px` (admin badge) | globals.css, admin-bar.tsx, companies-list.tsx |
| Letter-spacing | `-0.02em` (heading), `-0.005em` (job title), `0.01em` (nav), `0.02em` (topbar), `0.05em` (avatar), `0.12em` (key facts), `0.2` (section card) | Mixed files |
| Line-height | `1.1`, `1.4`, `1.5`, `1.6`, `1.75` across various text elements | Mixed files |

**Priority: MEDIUM**

### Components bypassing Radix when a Radix equivalent exists

| Custom Element | Radix Equivalent | File | Priority |
|---|---|---|---|
| `<h1 style={{...}}>` | `<Heading>` | SqlQueryInterface.tsx:81 | MEDIUM |
| `<p style={{...}}>` | `<Text as="p">` | SqlQueryInterface.tsx:83 | MEDIUM |
| `<div style={{display:"flex",...}}>` | `<Flex>` | admin-bar.tsx:14, auth-header.tsx:21,33, layout.tsx:41-53 | MEDIUM |
| `<span style={{color:...}}>` | `<Text>` | auth-header.tsx:34-42, admin-bar.tsx:26-36, companies-list.tsx:133-138 | MEDIUM |
| `<div className="yc-search"><input>` | `<TextField.Root>` | companies-list.tsx:142-148 | HIGH |
| `<img src={...}>` | `<Avatar>` | companies-list.tsx:162-173 | MEDIUM |
| `<pre><code>` | `<Code>` (block) | markdown-content.tsx:46-56 | LOW |

---

## Summary of Priorities

### HIGH Priority (address first)

1. **Unify button patterns** -- Eliminate raw `<button className="yc-cta">` and `<span>` pseudo-buttons. Replace with a single Radix `<Button>` wrapper component.
2. **Replace `<span>` pseudo-buttons** with proper `<button>` or `<a>` elements for accessibility.
3. **Add missing `aria-label`** to all icon-only interactive elements (7 instances).
4. **Unify search inputs** -- Replace raw `.yc-search input` in companies-list with Radix `<TextField.Root>`.
5. **Resolve CSS `!important` overrides** vs Radix component props -- pick one approach (either override globally OR use component props, not both).
6. **Make clickable spans into proper interactive elements** -- `job-row-company` span and Badge toggle.

### MEDIUM Priority

7. Standardize text casing (all CTAs lowercase per design system or all TitleCase).
8. Replace hardcoded pixel values with Radix spacing tokens.
9. Extract repeated inline boxShadow pattern into a CSS class.
10. Add `aria-live` to dynamic count displays in companies-list.
11. Consolidate `SqlSearchBar` and `SqlQueryInterface` into one component.
12. Standardize typography scale (font sizes, letter-spacing, line-height).
13. Replace `<h1>`, `<p>`, `<div style=flex>` with Radix equivalents.

### LOW Priority

14. Remove `.yc-badge` CSS class (defined in globals.css but never used in components).
15. Evaluate whether `UnifiedQueryBar.tsx` is dead code.
16. Review color contrast of `var(--gray-9)` text in dark mode.
