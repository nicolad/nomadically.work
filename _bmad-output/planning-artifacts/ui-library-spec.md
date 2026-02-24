# UI Library Component Spec

## Overview

Radix-based component library at `src/components/ui/` that replaces raw `.yc-*` CSS classes with typed React components. All components use `@radix-ui/themes@^3.3.0` primitives and the existing dark-mode design tokens from `globals.css`.

Design language: flat (border-radius: 0), dark, dense, lowercase CTAs, no shadows.

---

## Component Inventory

### 1. Button (`Button.tsx`)

**Replaces:** `.yc-cta`, `.yc-cta-ghost`, raw `<button>` elements

**Wraps:** `<Button>` from `@radix-ui/themes`

| Prop | Type | Default | Notes |
|------|------|---------|-------|
| `variant` | `"primary" \| "ghost" \| "danger"` | `"primary"` | Maps to Radix `variant="solid"` (primary/danger) or `variant="ghost"` |
| `size` | `"sm" \| "md"` | `"md"` | `sm` = Radix size `"1"`, `md` = Radix size `"2"` |
| `children` | `React.ReactNode` | required | Button label |
| `...rest` | `ComponentPropsWithoutRef<typeof RadixButton>` | - | Passthrough (onClick, disabled, etc.) |

**Variant mapping:**
- `primary` -> `<Button variant="solid" color="indigo">` (accent-9 bg, accent-contrast text)
- `ghost` -> `<Button variant="ghost" color="gray">` (transparent bg, gray-11 text, gray-6 border)
- `danger` -> `<Button variant="solid" color="red">` (red solid)

**Style contract:** All variants get `border-radius: 0`, `text-transform: lowercase`, `font-weight: 700` via existing `.rt-Button` overrides in `globals.css`.

---

### 2. Badge (`Badge.tsx`)

**Replaces:** `.yc-badge`, `.yc-badge--orange`, `.yc-badge--green`

**Wraps:** `<Badge>` from `@radix-ui/themes`

| Prop | Type | Default | Notes |
|------|------|---------|-------|
| `variant` | `"default" \| "orange" \| "green"` | `"default"` | Color scheme |
| `children` | `React.ReactNode` | required | Badge text |
| `...rest` | `ComponentPropsWithoutRef<typeof RadixBadge>` | - | Passthrough |

**Variant mapping:**
- `default` -> `<Badge variant="outline" color="gray">` (gray-6 border, gray-11 text)
- `orange` -> `<Badge variant="outline" color="orange">` (accent-9 border/text via existing `.yc-badge--orange`)
- `green` -> `<Badge variant="outline" color="green">` (green-9 border/text)

**Style contract:** `border-radius: 0`, `font-size: 11px` via existing `.rt-Badge` overrides.

---

### 3. NavLink (`NavLink.tsx`)

**Replaces:** Raw `<Link>` elements in `.yc-nav`

**Wraps:** Next.js `<Link>` with `.yc-nav a` styling

| Prop | Type | Default | Notes |
|------|------|---------|-------|
| `href` | `string` | required | Route path |
| `active` | `boolean` | `false` | When true, uses `--gray-12` color |
| `children` | `React.ReactNode` | required | Link text |

**Style:** `color: var(--gray-11)`, `text-transform: lowercase`, `text-decoration: none`. On hover: `color: var(--gray-12)`. When `active`: `color: var(--gray-12)`.

---

### 4. Card (`Card.tsx`)

**Replaces:** `.yc-panel`, inline `style={{ background: "var(--gray-2)", border: "1px solid var(--gray-6)", ... }}`

**Wraps:** `<Card>` from `@radix-ui/themes`

| Prop | Type | Default | Notes |
|------|------|---------|-------|
| `children` | `React.ReactNode` | required | Card content |
| `padding` | `string` | `"3"` | Radix spacing token |
| `...rest` | `ComponentPropsWithoutRef<typeof RadixCard>` | - | Passthrough |

**Style contract:** `border-radius: 0`, `box-shadow: none`, `border: 1px solid var(--gray-6)`, `background: var(--gray-2)` via existing `.rt-Card` overrides.

---

### 5. SearchInput (`SearchInput.tsx`)

**Replaces:** `.yc-search input`

**Wraps:** `<TextField.Root>` from `@radix-ui/themes`

| Prop | Type | Default | Notes |
|------|------|---------|-------|
| `placeholder` | `string` | `"search..."` | Input placeholder |
| `value` | `string` | - | Controlled value |
| `onChange` | `(e: ChangeEvent<HTMLInputElement>) => void` | - | Change handler |
| `...rest` | `ComponentPropsWithoutRef<typeof TextField.Root>` | - | Passthrough |

**Slots:** Search icon (`MagnifyingGlassIcon`) in the prefix slot.

**Style contract:** `border-radius: 0` via existing `.rt-TextFieldRoot` overrides. Focus: `border-color: var(--accent-9)`.

---

### 6. Barrel Export (`index.ts`)

```ts
export { Button } from "./Button";
export { Badge } from "./Badge";
export { NavLink } from "./NavLink";
export { Card } from "./Card";
export { SearchInput } from "./SearchInput";
```

---

## Migration Plan

### `auth-header.tsx`
- `<button className="yc-cta">` -> `<Button variant="primary">`
- `<button className="yc-cta-ghost">` -> `<Button variant="ghost">`

### `admin-bar.tsx`
- Inline-styled admin `<div>` -> `<Card>`
- Inline-styled admin `<span>` (the "admin" label) -> `<Badge variant="orange">`

### `layout.tsx`
- `<Link href="/">jobs</Link>` -> `<NavLink href="/">jobs</NavLink>`
- Repeat for all nav links (applications, companies, prep, resume, prompts, query)

---

## Design Tokens Reference

All components rely on these existing Radix Themes CSS custom properties (set by `<Theme appearance="dark">`):

| Token | Usage |
|-------|-------|
| `--accent-9` | Primary action backgrounds |
| `--accent-10` | Primary hover state |
| `--accent-contrast` | Text on accent backgrounds |
| `--gray-2` | Card/surface background |
| `--gray-3` | Hover tint |
| `--gray-6` | Borders (1px hairline) |
| `--gray-9` | Tertiary text, placeholders |
| `--gray-11` | Secondary text, meta |
| `--gray-12` | Primary text |
| `--green-9` | Positive/success status |

No new CSS variables or theme extensions required.
