# Remote EU Evaluation Module

Centralized module for Remote EU job classification evaluation.
Evaluations run via Langfuse Datasets for experiment tracking.

## Structure

```
src/evals/remote-eu/
├── index.ts          # Main exports
├── schema.ts         # Zod schemas and TypeScript types
├── test-data.ts      # Labeled test cases (source of truth)
├── scorers.ts        # Scoring functions
└── classifier.ts     # Shared LLM classifier (DeepSeek)
```

## Running Evals

```bash
pnpm eval:langfuse
```

This will:
1. Seed test cases as Langfuse dataset items
2. Run LLM classification against each case
3. Score results and link traces to a named dataset run
4. Print summary and exit(1) if accuracy < 80%

View results: Langfuse UI → Datasets → "remote-eu-classification"

## Usage

```typescript
import {
  RemoteEUClassification,
  RemoteEUTestCase,
  remoteEUTestCases,
  scoreRemoteEUClassification,
} from "@/evals/remote-eu";
```

## Test Cases

38 labeled test cases covering edge cases:

- Clear Remote EU positions
- EMEA vs EU distinction
- UK post-Brexit status
- Switzerland (not in EU)
- EEA vs EU differences
- Timezone-based ambiguity (CET ± N hours)
- Work authorization requirements
- Schengen area nuances
- Worldwide + exclusion signals
- Conflicting signals

## Scoring Logic

- Correct classification + matching confidence = 1.0
- Correct classification + mismatched confidence = 0.5
- Incorrect classification = 0.0
