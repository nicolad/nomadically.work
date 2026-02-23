"use client";

import { useState } from "react";
import {
  Container,
  Heading,
  Text,
  Flex,
  Card,
  Box,
  Button,
  Badge,
} from "@radix-ui/themes";
import { ExerciseTimer } from "@/components/exercise-timer";
import { MarkdownContent } from "@/components/markdown-content";

// ── Exercise data ────────────────────────────────────────────────────

interface Exercise {
  id: string;
  title: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  scenario: string;
  hints: string[];
  revealContent: string;
}

const PROMPT_CRAFTING: Exercise[] = [
  {
    id: "pc-1",
    title: "Debug a Race Condition in a Distributed Cache",
    difficulty: "advanced",
    scenario:
      "You're working with an AI coding assistant. A production service intermittently returns stale data from a Redis cluster after a recent deploy that added write-behind caching. Write a prompt that would help the AI identify the root cause and suggest a fix.",
    hints: [
      "Specify the caching strategy (write-behind vs write-through)",
      "Mention the symptoms: intermittent staleness, correlated with deploy",
      "Ask about TTL, cache invalidation, and read-after-write consistency",
    ],
    revealContent: `A strong prompt would include:

1. **Context**: "We have a write-behind cache in front of a PostgreSQL database, using Redis Cluster with 3 shards."
2. **Symptoms**: "After deploying a change to the cache layer, ~5% of reads return data that's 30-60 seconds stale."
3. **Constraints**: "We need sub-10ms p99 read latency, so switching to write-through isn't acceptable."
4. **Specific ask**: "Identify possible race conditions between the async write path and read path, especially around cache key hashing and shard routing."

This works because it gives the AI enough technical context to reason about distributed state, narrows the problem space, and sets clear performance constraints.`,
  },
  {
    id: "pc-2",
    title: "Review a Microservice for N+1 Query Problems",
    difficulty: "intermediate",
    scenario:
      "You need the AI to review a GraphQL resolver that fetches a list of jobs, each with related company and skill data. The resolver is causing high database load. Write a prompt that guides the AI to find and fix N+1 issues.",
    hints: [
      "Describe the data model relationships (jobs -> company, jobs -> skills)",
      "Mention the observable symptom: high query count per request",
      "Ask about DataLoader or batching patterns",
    ],
    revealContent: `A strong prompt would include:

1. **Code context**: "Here's a GraphQL resolver that returns jobs with nested company and skills fields. Each field resolver makes a separate DB query."
2. **Observable problem**: "A single \`jobs(limit: 50)\` query generates 100+ SQL statements (1 for jobs + 50 for companies + 50 for skills)."
3. **Pattern request**: "Suggest a DataLoader-based solution that batches the company and skills lookups. Show the loader factory and how to integrate it into the GraphQL context."

The key is providing the structural relationship so the AI can reason about the query multiplication pattern.`,
  },
  {
    id: "pc-3",
    title: "Design a Classification Pipeline with Confidence Scoring",
    difficulty: "advanced",
    scenario:
      "You want the AI to help design a pipeline that classifies job postings as 'remote EU eligible' or not, using an LLM with a confidence score. The system should escalate low-confidence results for human review. Write the prompt.",
    hints: [
      "Define what 'remote EU eligible' means (specific criteria)",
      "Specify the desired output format (boolean + confidence 0-1)",
      "Mention edge cases: UK post-Brexit, 'worldwide' listings, EMEA ambiguity",
    ],
    revealContent: `A strong prompt would include:

1. **Task definition**: "Classify whether a job posting allows remote work from EU member states. Output: { is_remote_eu: boolean, confidence: number (0-1), reasoning: string }."
2. **Criteria**: "EU = current 27 member states. UK is NOT EU. 'Worldwide' roles qualify. 'EMEA' roles qualify only if the posting doesn't restrict to specific non-EU countries."
3. **Edge cases to handle**: "UK-only remote, 'Europe' without specifying EU, Switzerland (not EU but often included), 'EMEA headquarters in Dubai'."
4. **Pipeline design**: "Route confidence < 0.7 to human review queue. Log all decisions to Langfuse for evaluation."

This mirrors real production classification — grounding the AI with specific criteria prevents vague or overly broad outputs.`,
  },
];

const CODE_EVALUATION: Exercise[] = [
  {
    id: "ce-1",
    title: "Spot the Security Vulnerability",
    difficulty: "intermediate",
    scenario: `Review this AI-generated GraphQL mutation resolver and identify all issues:

\`\`\`typescript
async function enhanceJobFromATS(
  _parent: unknown,
  args: { jobId: string },
  context: GraphQLContext
) {
  const allJobs = await context.db.select().from(jobs);
  const job = allJobs.find(j => j.external_id === args.jobId);
  if (!job) throw new Error("Job not found");

  const atsData = await fetch(
    \`https://api.greenhouse.io/v1/jobs/\${args.jobId}\`
  );
  const enhanced = await atsData.json();

  await context.db.execute(
    sql\`UPDATE jobs SET title = '\${enhanced.title}',
         description = '\${enhanced.description}'
         WHERE id = \${job.id}\`
  );

  return { ...job, ...enhanced };
}
\`\`\``,
    hints: [
      "Check for authentication/authorization",
      "Look at how the job is found (performance)",
      "Examine the SQL update statement carefully",
    ],
    revealContent: `Issues found:

1. **Missing auth guard** — No \`isAdminEmail()\` check. Any user can trigger job enhancement. This is a real known issue from the codebase.

2. **Full table scan** — \`select().from(jobs)\` fetches ALL jobs into memory just to find one by \`external_id\`. Should use \`where(eq(jobs.external_id, args.jobId))\`. Also a real known issue.

3. **SQL injection** — String interpolation in the SQL template (\`'\${enhanced.title}'\`) allows injection via malicious ATS data. Should use parameterized queries or Drizzle's typed builder.

4. **No input validation** — \`args.jobId\` is passed directly to an external API URL without validation.

5. **No error handling** — If the ATS API returns non-200 or invalid JSON, the resolver crashes.

6. **Mixing raw SQL with Drizzle** — The codebase convention is to use Drizzle ORM methods, never raw SQL strings.`,
  },
  {
    id: "ce-2",
    title: "Evaluate the Architecture Decision",
    difficulty: "advanced",
    scenario: `An AI suggested this approach for caching job search results:

\`\`\`typescript
// In-memory cache at module level
const searchCache = new Map<string, { data: Job[]; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function searchJobs(query: string): Promise<Job[]> {
  const cached = searchCache.get(query);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  const results = await db.select().from(jobs)
    .where(like(jobs.title, \`%\${query}%\`))
    .limit(100);

  searchCache.set(query, { data: results, timestamp: Date.now() });
  return results;
}
\`\`\`

What's wrong with this approach for a Vercel-deployed Next.js app?`,
    hints: [
      "Think about how serverless functions work (cold starts, instances)",
      "Consider memory limits and cache size growth",
      "Think about cache invalidation across instances",
    ],
    revealContent: `Problems with this approach:

1. **Serverless ephemeral memory** — Vercel functions are stateless. The in-memory Map is lost between invocations and cold starts. Different function instances have different caches, leading to inconsistent results.

2. **Unbounded cache growth** — No size limit or eviction. In a long-running instance, the Map grows until hitting the memory limit (typically 1024MB on Vercel).

3. **No cache invalidation** — When jobs are updated/added, cached results become stale with no way to invalidate specific entries.

4. **SQL injection via LIKE** — \`%\${query}%\` should use parameterized queries. A query containing \`%\` or \`_\` would produce unexpected results.

5. **Cache key collision** — Using raw query string as key means "React" and "react" are cached separately.

**Better approach**: Use Vercel KV (Redis), CDN cache headers, or stale-while-revalidate patterns that work across serverless instances.`,
  },
  {
    id: "ce-3",
    title: "Find the Subtle Bug",
    difficulty: "beginner",
    scenario: `An AI generated this pagination helper. Find the bug:

\`\`\`typescript
function paginate<T>(items: T[], page: number, pageSize: number) {
  const totalPages = Math.ceil(items.length / pageSize);
  const start = page * pageSize;
  const end = start + pageSize;

  return {
    data: items.slice(start, end),
    pagination: {
      page,
      pageSize,
      totalPages,
      totalItems: items.length,
      hasNext: page < totalPages,
      hasPrev: page > 0,
    },
  };
}

// Usage: paginate(jobs, 1, 20) — expected: items 1-20
\`\`\``,
    hints: [
      "What does page=1 return? What about page=0?",
      "Check the hasNext boundary condition",
      "Is the pagination 0-indexed or 1-indexed?",
    ],
    revealContent: `Bugs found:

1. **Off-by-one on hasNext** — When \`page = totalPages - 1\` (last page, 0-indexed), \`page < totalPages\` is true, incorrectly reporting there's a next page. Fix: \`hasNext: page < totalPages - 1\` (for 0-indexed) or check if \`end < items.length\`.

2. **Ambiguous indexing** — The code is 0-indexed (\`page * pageSize\`), but the usage comment says "page 1 = items 1-20", implying 1-indexed. If callers pass page=1 expecting the first page, they'll actually get the second page (items 21-40).

3. **No bounds checking** — Negative page numbers or page numbers beyond totalPages aren't handled. \`paginate(items, -1, 20)\` would produce \`items.slice(-20, 0)\` which returns an empty array silently.

The fix depends on the indexing convention. For 1-indexed (more common in APIs):
\`\`\`typescript
const start = (page - 1) * pageSize;
hasNext: page < totalPages
hasPrev: page > 1
\`\`\``,
  },
];

const TRICKY_EXAMPLES: Exercise[] = [
  {
    id: "te-1",
    title: "Craft an Edge Case for Remote EU Classification",
    difficulty: "intermediate",
    scenario:
      'Design a job posting snippet that would likely trip up an AI classifier trying to determine if a role is "remote EU eligible". Think about ambiguous geographic signals, misleading keywords, or contradictory information.',
    hints: [
      "UK is no longer in the EU but many classifiers confuse this",
      "'Worldwide' and 'global' have different implications",
      "Consider timezone requirements that effectively exclude EU",
    ],
    revealContent: `Strong tricky examples:

1. **UK post-Brexit trap**:
"Remote role, open to candidates across Europe including the United Kingdom"
— The word "Europe" includes non-EU countries. UK is explicitly mentioned. Classifier must know UK left the EU.

2. **Timezone exclusion**:
"Fully remote, worldwide. Must overlap 6 hours with PST (UTC-8)."
— "Worldwide" suggests EU-eligible, but the timezone requirement (overlap until 2am CET) effectively excludes EU workers.

3. **EMEA HQ misdirect**:
"Remote position, EMEA region. Based in our Dubai office with flexibility to work from anywhere in the region."
— "EMEA" includes EU countries, but "the region" might mean UAE/Middle East. Ambiguous.

4. **Switzerland confusion**:
"Remote across the European Economic Area and Switzerland"
— EEA includes EU + Norway/Iceland/Liechtenstein. Switzerland is neither EU nor EEA but has bilateral agreements. Is this "remote EU"?

5. **"European company" vs EU-eligible**:
"Join our London-based European fintech. Remote within the UK."
— "European" describes the company identity, not the remote work eligibility. Remote is UK-only.`,
  },
  {
    id: "te-2",
    title: "Design an Input to Expose Code Generation Bias",
    difficulty: "advanced",
    scenario:
      "Create a coding prompt that would likely cause an AI to generate code with a subtle but common anti-pattern. The goal is to test whether the AI produces production-ready code or falls into common traps.",
    hints: [
      "Think about error handling patterns that look correct but aren't",
      "Consider async/await pitfalls",
      "Think about patterns that work in tutorials but fail at scale",
    ],
    revealContent: `Strong examples that expose AI biases:

1. **The swallowed error trap**:
"Write a function that fetches user data from an API and returns a default user if the request fails."
— Most AIs will write a try/catch that silently swallows all errors, including network timeouts, auth failures, and 500s. Production code should distinguish retriable vs terminal errors.

2. **The sequential async trap**:
"Fetch data from three independent API endpoints and combine the results."
— Many AIs will write three sequential awaits instead of \`Promise.all()\`, tripling latency unnecessarily.

3. **The floating point trap**:
"Write a function to calculate the total price of items in a shopping cart with tax."
— AIs often use floating point arithmetic (\`price * 1.19\`) which produces rounding errors. Production code should use integer cents or a decimal library.

4. **The regex validation trap**:
"Write an email validation function."
— AIs love writing complex regexes that are either too permissive or too restrictive. The correct answer is: use a well-tested library, or just check for \`@\` and send a verification email.`,
  },
  {
    id: "te-3",
    title: "Write a Prompt Pair That Reveals Inconsistency",
    difficulty: "intermediate",
    scenario:
      "Design two similar prompts — with a subtle difference — where an AI is likely to give contradictory or inconsistent responses. This tests whether the AI applies consistent reasoning or is sensitive to surface-level framing.",
    hints: [
      "Try the same question with different framing (positive vs negative)",
      "Try asking about the same concept with different domain contexts",
      "Consider order effects — does presenting options A-then-B vs B-then-A change the recommendation?",
    ],
    revealContent: `Strong prompt pairs:

1. **Framing effect**:
Prompt A: "Should we use microservices for our new e-commerce platform?"
Prompt B: "Should we use a monolith for our new e-commerce platform?"
— AIs tend to argue in favor of whatever architecture is named in the question. Consistent reasoning should consider the same trade-offs regardless of framing.

2. **Scale anchoring**:
Prompt A: "We have 100 users. Should we add caching?"
Prompt B: "We have 100 users but expect to grow to 10M. Should we add caching?"
— The "expect to grow" framing often causes AIs to over-engineer, even though YAGNI applies. Good reasoning would note that caching for 100 users is premature optimization regardless of future plans.

3. **Authority bias**:
Prompt A: "Is it a good idea to store sessions in JWTs?"
Prompt B: "Our CTO decided to store sessions in JWTs. How should we implement this?"
— AIs often critique JWTs for sessions in prompt A but uncritically help implement it in prompt B, showing inconsistent security reasoning.`,
  },
];

// ── Components ───────────────────────────────────────────────────────

function ExerciseCard({ exercise }: { exercise: Exercise }) {
  const [revealed, setRevealed] = useState(false);
  const [showHints, setShowHints] = useState(false);

  const difficultyColor: Record<string, "green" | "orange" | "red"> = {
    beginner: "green",
    intermediate: "orange",
    advanced: "red",
  };

  return (
    <Card mb="4">
      <Flex direction="column" gap="3">
        <Flex justify="between" align="center">
          <Heading size="4">{exercise.title}</Heading>
          <Badge color={difficultyColor[exercise.difficulty]}>
            {exercise.difficulty}
          </Badge>
        </Flex>

        <MarkdownContent content={exercise.scenario} />

        <Flex gap="2">
          <Button
            size="1"
            variant="soft"
            onClick={() => setShowHints(!showHints)}
          >
            {showHints ? "Hide Hints" : "Show Hints"}
          </Button>
          <Button
            size="1"
            variant={revealed ? "soft" : "solid"}
            onClick={() => setRevealed(!revealed)}
          >
            {revealed ? "Hide Answer" : "Reveal Answer"}
          </Button>
        </Flex>

        {showHints && (
          <Box
            p="3"
            style={{
              backgroundColor: "var(--accent-3)",
              borderRadius: "var(--radius-2)",
            }}
          >
            <Text size="2" weight="bold" mb="2">
              Hints:
            </Text>
            {exercise.hints.map((hint, i) => (
              <Text as="p" size="2" key={i}>
                {i + 1}. {hint}
              </Text>
            ))}
          </Box>
        )}

        {revealed && (
          <Box
            p="3"
            style={{
              backgroundColor: "var(--green-3)",
              borderRadius: "var(--radius-2)",
            }}
          >
            <MarkdownContent content={exercise.revealContent} />
          </Box>
        )}
      </Flex>
    </Card>
  );
}

// ── Page ──────────────────────────────────────────────────────────────

export default function ExercisesPage() {
  const [activeTab, setActiveTab] = useState<
    "prompt" | "code-eval" | "tricky"
  >("prompt");

  const tabs: { key: typeof activeTab; label: string; count: number }[] = [
    { key: "prompt", label: "Prompt Crafting", count: PROMPT_CRAFTING.length },
    {
      key: "code-eval",
      label: "AI Code Evaluation",
      count: CODE_EVALUATION.length,
    },
    {
      key: "tricky",
      label: "Tricky Example Creation",
      count: TRICKY_EXAMPLES.length,
    },
  ];

  const exercises =
    activeTab === "prompt"
      ? PROMPT_CRAFTING
      : activeTab === "code-eval"
        ? CODE_EVALUATION
        : TRICKY_EXAMPLES;

  return (
    <Container size="3" p="8">
      <Flex direction="column" gap="6">
        {/* Header */}
        <Box>
          <Heading size="8" mb="2">
            RLHF Practice Exercises
          </Heading>
          <Text size="4" color="gray">
            Timed practice exercises that mirror real RLHF practical
            evaluations. Start the timer, work through the scenario, then reveal
            the answer.
          </Text>
        </Box>

        {/* Timer */}
        <Card>
          <Flex align="center" justify="between">
            <Text size="3" weight="medium">
              Exercise Timer (10 min)
            </Text>
            <ExerciseTimer durationMinutes={10} />
          </Flex>
        </Card>

        {/* Tab navigation */}
        <Flex gap="2">
          {tabs.map((tab) => (
            <Button
              key={tab.key}
              variant={activeTab === tab.key ? "solid" : "outline"}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label} ({tab.count})
            </Button>
          ))}
        </Flex>

        {/* Exercise descriptions */}
        {activeTab === "prompt" && (
          <Text size="3" color="gray">
            Write prompts for real engineering scenarios, then compare against
            expert examples. Focus on providing context, constraints, and
            specific asks.
          </Text>
        )}
        {activeTab === "code-eval" && (
          <Text size="3" color="gray">
            Review AI-generated code snippets and identify bugs, security
            issues, and architectural anti-patterns. These exercises use real
            patterns from production codebases.
          </Text>
        )}
        {activeTab === "tricky" && (
          <Text size="3" color="gray">
            Design inputs that would trip up an AI model. This tests your
            understanding of where LLMs struggle with ambiguity, edge cases, and
            consistency.
          </Text>
        )}

        {/* Exercises */}
        {exercises.map((exercise) => (
          <ExerciseCard key={exercise.id} exercise={exercise} />
        ))}
      </Flex>
    </Container>
  );
}
