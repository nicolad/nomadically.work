# Remote EU Evaluation Module

Centralized module for Remote EU job classification evaluation.

## Structure

```
src/lib/evals/remote-eu/
├── index.ts          # Main exports
├── schema.ts         # Zod schemas and TypeScript types
├── test-data.ts      # Labeled test cases
└── scorers.ts        # Scoring functions for Mastra/Langfuse
```

## Usage

### Import Everything

```typescript
import {
  // Types
  RemoteEUClassification,
  RemoteEUTestCase,

  // Test Data
  remoteEUTestCases,

  // Scorers
  scoreRemoteEUClassification,
  remoteEUScorer,
} from "@/lib/evals/remote-eu";
```

### Run Evaluations

**Vitest Tests:**

```bash
pnpm test:eval
```

**Live Evaluation with Mastra:**

Scorers automatically track evaluations in Langfuse when used with agents.

### Use in Code

**With Mastra:**

```typescript
import { remoteEUScorer } from "@/lib/evals/remote-eu";

const agent = new Agent({
  scorers: {
    remoteEU: {
      scorer: remoteEUScorer,
      sampling: { type: "ratio", rate: 0.25 },
    },
  },
});
```

**Standalone Scoring:**

```typescript
import { scoreRemoteEUClassification } from "@/lib/evals/remote-eu";

const result = scoreRemoteEUClassification({
  jobPosting: { title: "...", location: "...", description: "..." },
  expectedClassification: {
    isRemoteEU: true,
    confidence: "high",
    reason: "...",
  },
  actualClassification: { isRemoteEU: true, confidence: "high", reason: "..." },
});

console.log(result.score); // 0-1
console.log(result.metadata); // Detailed breakdown
```

## Test Cases

12 labeled test cases covering edge cases:

- ✅ Clear Remote EU positions
- ✅ EMEA vs EU distinction
- ✅ UK post-Brexit status
- ✅ Switzerland (not in EU)
- ✅ EEA vs EU differences
- ✅ Timezone-based ambiguity
- ✅ Work authorization requirements
- ✅ Schengen area nuances

## Scoring Logic

**scoreRemoteEUClassification:**

- Correct + matching confidence = 1.0
- Correct + mismatched confidence = 0.5
- Incorrect = 0.0

**remoteEUScorer (Mastra/Langfuse):**

- High confidence = 1.0
- Medium confidence = 0.7
- Low confidence = 0.4

All scores are automatically tracked in Langfuse when the scorer is attached to an agent.
