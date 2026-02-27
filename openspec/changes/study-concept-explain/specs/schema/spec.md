# Delta for Study Schema

## ADDED Requirements

### Requirement: study_concept_explanations Table

The system MUST store concept explanations in a `study_concept_explanations` table with columns: `id` (integer primary key autoincrement), `study_topic_id` (integer, foreign key to `study_topics.id`), `selected_text` (text, not null), `text_hash` (text, not null — hex SHA-256 of `selected_text`), `explanation` (text, not null), `created_at` (text, not null, default current timestamp).

The system MUST enforce a unique index on `(study_topic_id, text_hash)` to prevent duplicate explanations for the same selection on the same topic.

#### Scenario: Table created via Drizzle migration

- GIVEN the `study_concept_explanations` table does not exist
- WHEN `pnpm db:generate` and `pnpm db:migrate` are run
- THEN the table is created with all specified columns and the unique index

#### Scenario: Duplicate insert prevented by unique index

- GIVEN an explanation for topic 42 with text_hash "abc123" already exists
- WHEN an INSERT is attempted with the same `(study_topic_id, text_hash)` pair
- THEN the insert is rejected (UNIQUE constraint violation)

---

### Requirement: StudyConceptExplanation GraphQL Type

The system MUST expose a `StudyConceptExplanation` type in `schema/study/schema.graphql` with fields: `id: ID!`, `selectedText: String!`, `explanation: String!`, `createdAt: DateTime!`.

#### Scenario: Type included in codegen output

- GIVEN the `StudyConceptExplanation` type is defined in `schema/study/schema.graphql`
- WHEN `pnpm codegen` is run
- THEN `src/__generated__/resolvers-types.ts` contains a `StudyConceptExplanation` interface with typed fields

---

### Requirement: generateStudyConceptExplanation Mutation

The system MUST expose a mutation `generateStudyConceptExplanation(studyTopicId: ID!, selectedText: String!, context: String): StudyConceptExplanation` as an extension of `Mutation` in `schema/study/schema.graphql`.

#### Scenario: Mutation generates a new explanation

- GIVEN the user is authenticated (valid `context.userId`)
- AND no cached explanation exists for the given `(studyTopicId, sha256(selectedText))` pair
- WHEN `generateStudyConceptExplanation` is called with `studyTopicId: "7"`, `selectedText: "PRAGMA foreign_keys = ON"`
- THEN the resolver calls Vercel AI SDK `generateText` with Anthropic Haiku
- AND the system prompt includes the topic's title, category, and difficulty
- AND the user message includes the selected text (and optional `context` if provided)
- AND the explanation is inserted into `study_concept_explanations`
- AND the mutation returns the `StudyConceptExplanation` row

#### Scenario: Mutation returns cached explanation

- GIVEN the user is authenticated
- AND a cached explanation exists for `(studyTopicId, sha256(selectedText))`
- WHEN `generateStudyConceptExplanation` is called with the same arguments
- THEN no LLM call is made
- AND the existing row is returned

#### Scenario: Unauthenticated request rejected

- GIVEN `context.userId` is null or undefined
- WHEN `generateStudyConceptExplanation` is called
- THEN a GraphQL error with message "Forbidden" is thrown
- AND no DB write or LLM call occurs

#### Scenario: Empty selectedText rejected

- GIVEN the user is authenticated
- WHEN `generateStudyConceptExplanation` is called with `selectedText: ""`
- THEN a GraphQL error with message indicating invalid input is thrown

#### Scenario: Non-existent studyTopicId

- GIVEN the user is authenticated
- AND no study topic exists with the given `studyTopicId`
- WHEN `generateStudyConceptExplanation` is called
- THEN a GraphQL error with message "Study topic not found" is thrown

---

### Requirement: Resolver Uses Topic Context in LLM Prompt

The resolver MUST fetch the study topic's `title`, `category`, and `difficulty` from the database and include them in the system prompt so the explanation is domain-scoped and difficulty-appropriate.

#### Scenario: System prompt includes topic metadata

- GIVEN a study topic with title "SQLite Pragmas", category "databases", difficulty "intermediate"
- WHEN an explanation is generated for selected text "PRAGMA foreign_keys = ON"
- THEN the LLM system prompt references "SQLite Pragmas", "databases", and "intermediate"

---

### Requirement: Text Hash Computed Client-Side

The resolver MUST compute the SHA-256 hash of `selectedText` using Node.js `crypto.subtle.digest` (or `crypto.createHash`) and store it as a lowercase hex string in the `text_hash` column.

#### Scenario: Hash is deterministic

- GIVEN the selected text "PRAGMA foreign_keys = ON"
- WHEN the hash is computed twice
- THEN both produce the identical lowercase hex SHA-256 string
