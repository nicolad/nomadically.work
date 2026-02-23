---
title: 'Job-Specific AI Interview Prep via DeepSeek'
slug: 'ai-interview-prep-deepseek'
created: '2026-02-23'
status: 'Completed'
stepsCompleted: [1, 2, 3, 4]
tech_stack: ['Next.js 16', 'React 19', 'Apollo Server 5', 'Apollo Client', 'Drizzle ORM', 'Cloudflare D1 (SQLite)', 'DeepSeek API (src/deepseek/client.ts)', 'Radix UI Themes', 'GraphQL codegen']
files_to_modify:
  - src/db/schema.ts
  - schema/applications/schema.graphql
  - src/graphql/applications.graphql
  - src/apollo/resolvers/application.ts
  - src/app/applications/[id]/page.tsx
files_to_create:
  - migrations/0009_add_ai_interview_prep.sql
code_patterns:
  - 'Auth guard: if (!context.userEmail || !context.userId) throw new Error("...")'
  - 'Ownership via getApplicationById(id, email, db) helper already in application.ts'
  - 'DB update: db.update(applications).set({} as any).where(and(eq(id), eq(email))).returning()'
  - 'mapApplication() maps DB row to GQL shape — add aiInterviewPrep here with JSON.parse'
  - 'DeepSeek: createDeepSeekClient() from @/deepseek, chat() with response_format json_object'
  - 'Resolvers merged via lodash merge in src/apollo/resolvers.ts — no changes needed there'
  - 'GQL documents in src/graphql/*.graphql — run pnpm codegen after schema + document changes'
test_patterns: []
---

# Tech-Spec: Job-Specific AI Interview Prep via DeepSeek

**Created:** 2026-02-23

## Overview

### Problem Statement

The Interview Prep card on `/applications/[id]` only lets users manually link generic prep tracks. There is no way to generate job-specific preparation guidance derived from the actual job description stored on the application. Users must figure out what to study on their own.

### Solution

Add a `generateInterviewPrep(applicationId: Int!)` GraphQL mutation that reads the application's `jobDescription` (from the `jobs.description` LEFT JOIN already in the resolver), sends it to DeepSeek with a structured JSON prompt, and receives back a breakdown covering: (1) key requirements extracted from the JD, (2) tailored interview questions per requirement, and (3) study topics. The result is stored as JSON in a new `ai_interview_prep` TEXT column on the `applications` table and surfaced as `aiInterviewPrep: AIInterviewPrep` on the `Application` type. A "Generate with AI" button in the existing Interview Prep card triggers the mutation and renders the breakdown inline.

### Scope

**In Scope:**
- New `ai_interview_prep TEXT` column on `applications` table (Drizzle schema + raw migration SQL)
- New `AIInterviewPrep` + `AIInterviewPrepRequirement` GraphQL types
- New `aiInterviewPrep: AIInterviewPrep` nullable field on `Application` type
- New `generateInterviewPrep(applicationId: Int!): Application!` mutation
- Updated `ApplicationFields` fragment + new `GenerateInterviewPrep` mutation document
- Resolver: auth guard → ownership check → null jobDescription guard → DeepSeek call → JSON parse → DB persist → return updated Application
- UI: "Generate with AI" button (disabled when no jobDescription); loading state; rendered breakdown; button hidden once prep exists
- `pnpm codegen` after schema/document changes

**Out of Scope:**
- Streaming output
- Re-generation or editing of existing AI output
- Auto-linking AI output to existing prep tracks
- Any other application fields or pages

---

## Context for Development

### Codebase Patterns

- **Auth guard** — every mutation in `application.ts` opens with: `if (!context.userEmail || !context.userId) throw new Error("User must be authenticated")`
- **Ownership check** — `getApplicationById(id, context.userEmail, context.db)` helper already exists in `src/apollo/resolvers/application.ts`; returns null if not found or wrong owner. Reuse it to validate before writing.
- **DB update pattern** — `context.db.update(applications).set({...} as any).where(and(eq(applications.id, id), eq(applications.user_email, email))).returning()` — same as `updateApplication`.
- **mapApplication()** — central row-to-GQL mapping function in `application.ts`. All new fields go here. Add `aiInterviewPrep` by parsing `(app as any).ai_interview_prep` JSON.
- **jobDescription source** — comes from `jobs.description` via LEFT JOIN on `jobs.url = applications.job_id`. Will be null if the application's `job_id` doesn't match any `jobs.url`. Must guard with null check before calling DeepSeek.
- **jobDescription is HTML** — strip tags with `replace(/(<([^>]+)>)/gi, " ").replace(/\s+/g, " ").trim()` before sending to model.
- **DeepSeek import** — `import { createDeepSeekClient, DEEPSEEK_MODELS } from "@/deepseek"`. Use `.chat({ ..., response_format: { type: "json_object" } })` for guaranteed JSON.
- **Resolvers registration** — `src/apollo/resolvers.ts` already merges `applicationResolvers`. No change needed.
- **GQL documents** — `src/graphql/applications.graphql` contains `ApplicationFields` fragment and all operation documents. Add new mutation document here and update fragment.

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `src/apollo/resolvers/application.ts` | All application resolvers, `mapApplication()`, `getApplicationById()` |
| `src/db/schema.ts` lines 459–483 | `applications` sqliteTable definition to extend |
| `schema/applications/schema.graphql` | Application GraphQL schema — types and mutations to add |
| `src/graphql/applications.graphql` | GQL documents — fragment + operation to update/add |
| `src/deepseek/client.ts` | DeepSeek client: `chat()`, `chatCompletion()`, `getDefaultClient()` |
| `src/deepseek/index.ts` | Re-exports: `createDeepSeekClient`, `DEEPSEEK_MODELS` |
| `src/app/applications/[id]/page.tsx` line 317 | Interview Prep card — button + breakdown render go here |
| `migrations/0008_add_application_tracks.sql` | Migration file pattern to follow |

### Technical Decisions

- **JSON storage** — single TEXT column `ai_interview_prep` on `applications` table, JSON matching `AIInterviewPrep` shape. Parsed in `mapApplication()`.
- **DeepSeek model** — `DEEPSEEK_MODELS.CHAT` (`deepseek-chat`). Fast, cost-effective, sufficient for structured extraction. `temperature: 0.1`, `max_tokens: 2000`.
- **Structured output** — `response_format: { type: "json_object" }` enforces valid JSON. System prompt defines exact schema with 4–6 requirements, 2–3 questions and 2–3 study topics each.
- **HTML stripping** — regex strip before prompt. No external library.
- **Error handling** — DeepSeek failure or JSON parse error throws a GraphQL error. DB only updated after successful parse.
- **Re-generation** — not in scope. Button hidden once `aiInterviewPrep` is non-null.

---

## Implementation Plan

### Tasks

- [x] Task 1: Add `ai_interview_prep` column to Drizzle schema
  - File: `src/db/schema.ts`
  - Action: Inside `applications` sqliteTable, after `company_name` field, add:
    ```ts
    ai_interview_prep: text("ai_interview_prep"), // JSON: AIInterviewPrep shape
    ```
  - Notes: No default needed (nullable). This ensures Drizzle types are up to date — no `@ts-expect-error` required in the resolver.

- [x] Task 2: Create migration SQL file
  - File: `migrations/0009_add_ai_interview_prep.sql` (new file)
  - Action: Create with content:
    ```sql
    ALTER TABLE `applications` ADD COLUMN `ai_interview_prep` text;
    ```
  - Notes: Follow the same single-statement pattern as `0008_add_application_tracks.sql`. Run `pnpm db:migrate` then `pnpm db:push` after.

- [x] Task 3: Add GraphQL types and mutation to schema
  - File: `schema/applications/schema.graphql`
  - Action 3a: Add two new types before the `Application` type:
    ```graphql
    type AIInterviewPrepRequirement {
      requirement: String!
      questions: [String!]!
      studyTopics: [String!]!
    }

    type AIInterviewPrep {
      summary: String!
      requirements: [AIInterviewPrepRequirement!]!
      generatedAt: String!
    }
    ```
  - Action 3b: Add `aiInterviewPrep: AIInterviewPrep` as a nullable field on the `Application` type (after `interviewPrep`).
  - Action 3c: Add to `extend type Mutation`:
    ```graphql
    generateInterviewPrep(applicationId: Int!): Application!
    ```

- [x] Task 4: Update GraphQL documents
  - File: `src/graphql/applications.graphql`
  - Action 4a: Add to `ApplicationFields` fragment (after `interviewPrep { ... }`):
    ```graphql
    aiInterviewPrep {
      summary
      requirements {
        requirement
        questions
        studyTopics
      }
      generatedAt
    }
    ```
  - Action 4b: Add new mutation document at the end of the file:
    ```graphql
    mutation GenerateInterviewPrep($applicationId: Int!) {
      generateInterviewPrep(applicationId: $applicationId) {
        id
        aiInterviewPrep {
          summary
          requirements {
            requirement
            questions
            studyTopics
          }
          generatedAt
        }
      }
    }
    ```
  - Notes: After saving, run `pnpm codegen` — this generates `useGenerateInterviewPrepMutation` hook in `src/__generated__/hooks.tsx` and updates all types.

- [x] Task 5: Update resolver — `mapApplication()` and add `generateInterviewPrep` mutation
  - File: `src/apollo/resolvers/application.ts`
  - Action 5a: Add import at top:
    ```ts
    import { createDeepSeekClient, DEEPSEEK_MODELS } from "@/deepseek";
    ```
  - Action 5b: In `mapApplication()`, add `aiInterviewPrep` to the returned object:
    ```ts
    aiInterviewPrep: (app as any).ai_interview_prep
      ? (() => {
          try { return JSON.parse((app as any).ai_interview_prep); }
          catch { return null; }
        })()
      : null,
    ```
  - Action 5c: Add `generateInterviewPrep` inside `Mutation: { ... }`, after `unlinkTrackFromApplication`:
    ```ts
    async generateInterviewPrep(
      _parent: any,
      args: { applicationId: number },
      context: GraphQLContext,
    ) {
      if (!context.userEmail || !context.userId) {
        throw new Error("User must be authenticated");
      }

      // Fetch application with jobDescription (LEFT JOIN on jobs.url)
      const [row] = await context.db
        .select({ app: applications, jobDescription: jobs.description })
        .from(applications)
        .leftJoin(jobs, eq(jobs.url, applications.job_id))
        .where(
          and(
            eq(applications.id, args.applicationId),
            eq(applications.user_email, context.userEmail),
          ),
        );

      if (!row) throw new Error("Application not found or access denied");
      if (!row.jobDescription) {
        throw new Error("No job description available for this application");
      }

      // Strip HTML tags before sending to model
      const plainText = row.jobDescription
        .replace(/(<([^>]+)>)/gi, " ")
        .replace(/\s+/g, " ")
        .trim();

      // Call DeepSeek with structured JSON prompt
      const client = createDeepSeekClient();
      const response = await client.chat({
        model: DEEPSEEK_MODELS.CHAT,
        messages: [
          {
            role: "system",
            content: `You are an expert interview coach. Analyze the job description and return ONLY a JSON object with this exact shape:
{
  "summary": "2-3 sentence overview of the role and what to focus on for the interview",
  "requirements": [
    {
      "requirement": "Requirement name (e.g. React expertise)",
      "questions": ["Tailored interview question 1", "Tailored interview question 2"],
      "studyTopics": ["Study topic 1", "Study topic 2"]
    }
  ],
  "generatedAt": ""
}
Extract 4-6 key requirements from the job description. For each: 2-3 tailored interview questions specific to the role, and 2-3 concrete study topics.`,
          },
          {
            role: "user",
            content: `Job description:\n\n${plainText}`,
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.1,
        max_tokens: 2000,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) throw new Error("Empty response from AI");

      let parsed: any;
      try {
        parsed = JSON.parse(content);
      } catch {
        throw new Error("Failed to parse AI response as JSON");
      }

      parsed.generatedAt = new Date().toISOString();

      // Persist to DB
      const [updated] = await context.db
        .update(applications)
        .set({ ai_interview_prep: JSON.stringify(parsed) } as any)
        .where(
          and(
            eq(applications.id, args.applicationId),
            eq(applications.user_email, context.userEmail),
          ),
        )
        .returning();

      if (!updated) throw new Error("Failed to save interview prep");

      return mapApplication(updated, row.jobDescription);
    },
    ```

- [x] Task 6: Update application detail page UI
  - File: `src/app/applications/[id]/page.tsx`
  - Action 6a: Add `useGenerateInterviewPrepMutation` to the imports from `@/__generated__/hooks`.
  - Action 6b: Add state variable after existing state declarations:
    ```ts
    const [generating, setGenerating] = useState(false);
    ```
  - Action 6c: Instantiate the mutation hook after existing hooks:
    ```ts
    const [generateInterviewPrep] = useGenerateInterviewPrepMutation();
    ```
  - Action 6d: In the Interview Prep card (line ~319), add the "Generate with AI" button inside the `<Flex justify="between" align="center" mb="3">` header — alongside the existing track select. Add it only when `!app.aiInterviewPrep`:
    ```tsx
    {!app.aiInterviewPrep && (
      <Button
        variant="soft"
        size="2"
        disabled={generating || !app.jobDescription}
        onClick={async () => {
          setGenerating(true);
          try {
            await generateInterviewPrep({
              variables: { applicationId: app.id },
              refetchQueries: ["GetApplication"],
            });
          } catch (e) {
            console.error("Failed to generate interview prep:", e);
          } finally {
            setGenerating(false);
          }
        }}
      >
        <PlusIcon />
        {generating ? "Generating..." : "Generate with AI"}
      </Button>
    )}
    ```
  - Action 6e: Below the existing track list (after the `{app.interviewPrep && app.interviewPrep.length > 0 ? ... : ...}` block), add the AI breakdown render:
    ```tsx
    {app.aiInterviewPrep && (
      <Box mt="4" pt="4" style={{ borderTop: "1px solid var(--gray-4)" }}>
        <Text size="1" color="gray" weight="medium" mb="3" as="div">
          AI-GENERATED PREP
        </Text>
        <Text size="2" color="gray" mb="4" as="div">
          {app.aiInterviewPrep.summary}
        </Text>
        <Flex direction="column" gap="3">
          {app.aiInterviewPrep.requirements.map((req: any, i: number) => (
            <Box
              key={i}
              p="3"
              style={{
                backgroundColor: "var(--gray-2)",
                borderRadius: "var(--radius-2)",
              }}
            >
              <Text size="2" weight="bold" mb="2" as="div">
                {req.requirement}
              </Text>
              <Text size="1" color="gray" mb="1" as="div">
                Interview questions:
              </Text>
              <Flex direction="column" gap="1" mb="2">
                {req.questions.map((q: string, j: number) => (
                  <Text key={j} size="2" as="div">
                    • {q}
                  </Text>
                ))}
              </Flex>
              <Text size="1" color="gray" mb="1" as="div">
                Study topics:
              </Text>
              <Flex gap="2" wrap="wrap">
                {req.studyTopics.map((t: string, k: number) => (
                  <Text
                    key={k}
                    size="1"
                    style={{
                      padding: "2px 8px",
                      backgroundColor: "var(--violet-3)",
                      borderRadius: "4px",
                    }}
                  >
                    {t}
                  </Text>
                ))}
              </Flex>
            </Box>
          ))}
        </Flex>
      </Box>
    )}
    ```
  - Notes: `PlusIcon` is already imported in the file. `app.aiInterviewPrep` will be typed after codegen.

### Acceptance Criteria

- [x] AC 1: Given an authenticated user on `/applications/[id]` where the application has a linked job with a description, when they click "Generate with AI", then the button shows "Generating..." during the call and the breakdown (summary + requirements with questions + study topics) renders in the Interview Prep card after completion.

- [x] AC2: Given AI interview prep was previously generated and persisted, when the user refreshes the page, then the breakdown is still visible (served from the `aiInterviewPrep` DB-backed field).

- [x] AC3: Given the application has no linked job description (`app.jobDescription` is null), when viewing the page, then the "Generate with AI" button is rendered but disabled.

- [x] AC4: Given prep has already been generated (`app.aiInterviewPrep` is non-null), when viewing the page, then the "Generate with AI" button is not rendered.

- [x] AC5: Given a DeepSeek API error or malformed JSON response, when the mutation runs, then a GraphQL error is returned, the DB is not updated, and the `generating` state resets to false.

- [x] AC6: Given an unauthenticated request to `generateInterviewPrep`, when the mutation is called, then a "User must be authenticated" error is thrown.

- [x] AC7: Given an authenticated user attempting to generate prep for another user's application, when the mutation runs, then an "Application not found or access denied" error is thrown.

---

## Additional Context

### Dependencies

- `DEEPSEEK_API_KEY` env var must be set (already required by the classifier — check `.env.local`)
- No new npm packages required — `src/deepseek/client.ts` uses native `fetch`
- `pnpm codegen` must run after Task 3 + Task 4 to generate `useGenerateInterviewPrepMutation` hook
- `pnpm db:migrate` then `pnpm db:push` to apply the migration locally and to remote D1

### Testing Strategy

Manual verification steps:
1. Run `pnpm db:migrate` to apply `0009_add_ai_interview_prep.sql` locally
2. Run `pnpm dev`, navigate to `/applications/9`
3. Click "Generate with AI" — verify loading state and breakdown render
4. Refresh the page — verify breakdown persists (served from DB)
5. Check an application with `jobDescription: null` — verify button is disabled
6. Check an application where prep already exists — verify button is absent
7. Temporarily break `DEEPSEEK_API_KEY` — verify error is caught and state resets

### Notes

- **High-risk**: `jobDescription` is HTML from ATS APIs — regex strip may leave artifacts (e.g., `&amp;`, `&nbsp;`). If output quality suffers, add HTML entity decode step before sending to model.
- **Cost**: Each generation call uses ~1,000–2,000 tokens. With `temperature: 0.1` and `deepseek-chat`, cost is negligible per call.
- **Future**: Re-generation button (currently out of scope) would just need to remove the `!app.aiInterviewPrep` condition on the button and always allow triggering.
- **Future**: Could auto-suggest relevant existing prep tracks based on `studyTopics` from the AI output — not in scope now.
