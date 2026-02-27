# Routes Specification — Study Topic Pages

## Purpose

Defines the Next.js App Router pages for browsing and reading study topics, providing a user-facing topic library accessible at `/study/[category]/[topic]` and `/study/[category]`.

## Requirements

### Requirement: Topic Detail Page

The system MUST serve a page at `/study/[category]/[topic]` that displays a single study topic's content.

The page MUST render:
- The topic title as a heading
- The difficulty level as a visual badge
- The tags as a list of labels
- The `body_md` content rendered as HTML via `react-markdown` with `remark-gfm`
- A back link to the category index (`/study/[category]`)

#### Scenario: Render existing topic

- GIVEN a study topic exists with category="db" and topic="acid"
- WHEN a user navigates to `/study/db/acid`
- THEN the page MUST return HTTP 200
- AND the page MUST display the topic title, difficulty badge, and rendered Markdown body

#### Scenario: Topic not found

- GIVEN no study topic exists with category="db" and topic="nosql"
- WHEN a user navigates to `/study/db/nosql`
- THEN the page MUST return HTTP 404 (via `notFound()`)

#### Scenario: Markdown rendering includes GFM

- GIVEN a study topic has `body_md` containing a GFM table (`| Col1 | Col2 |`)
- WHEN the topic detail page renders
- THEN the table MUST be rendered as an HTML `<table>` element

### Requirement: Category Index Page

The system MUST serve a page at `/study/[category]` that lists all topics within a category.

The page MUST render:
- A heading indicating the category name
- A list/grid of topic cards, each showing title and summary
- Each card MUST link to `/study/[category]/[topic]`

#### Scenario: Category with topics

- GIVEN two study topics exist in category="db" (acid, normalization)
- WHEN a user navigates to `/study/db`
- THEN the page MUST return HTTP 200
- AND the page MUST display cards for both topics with titles and summaries

#### Scenario: Empty category

- GIVEN no study topics exist in category="networking"
- WHEN a user navigates to `/study/networking`
- THEN the page MUST return HTTP 200
- AND the page MUST display an empty state message (e.g., "No topics in this category yet")

### Requirement: Data Fetching Strategy

The topic detail and category index pages SHOULD fetch data server-side. They MAY use either:
- Direct Drizzle queries in a server component, OR
- Apollo Client queries with SSR

#### Scenario: Page renders with server-fetched data

- GIVEN the study topic exists in D1
- WHEN the page is requested
- THEN the initial HTML response MUST include the topic content (no client-side loading spinner for initial render)

### Requirement: Metadata

Each page SHOULD set appropriate `<title>` and `<meta description>` via Next.js `generateMetadata`.

#### Scenario: Topic detail page metadata

- GIVEN a study topic with title="ACID Properties" and summary="Understanding database ACID guarantees"
- WHEN the topic detail page is rendered
- THEN the page `<title>` SHOULD include "ACID Properties"
- AND the meta description SHOULD include the summary text
