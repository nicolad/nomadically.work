# Remote AI Jobs - Promptfoo Eval Suite

Comprehensive evaluation suite for the remote AI jobs workflow using Promptfoo with Cloudflare integration.

## Overview

This eval suite tests the **"two buckets (worldwide/europe), strict fully-remote + region + ≤24h freshness + dedupe"** invariants using:

1. **Deterministic CI checks** (no network): Run filter-only workflow against fixtures
2. **Optional live checks**: Call live Mastra workflow + optional LLM-rubric grading via Cloudflare

## Structure

```
src/promptfoo/
├── remote-jobs.promptfooconfig.yaml    # Main config
├── providers/
│   └── mastra-remote-jobs-provider.ts  # Custom provider (fixture + live modes)
├── assertions/
│   ├── twoBucketsOnly.js               # Exactly 2 keys (worldwide + europe)
│   ├── strictInvariants.js             # Remote/region/freshness/dedupe checks
│   └── excludesBadUrls.js              # Fixture regression test
├── schemas/
│   └── remoteJobsOutput.schema.json    # JSON Schema validation
└── fixtures/
    ├── filterInput.json                # Test input data
    └── expectedOutput.json             # Expected filter output
```

## Installation

```bash
pnpm add -D promptfoo
```

## Usage

### CI-Safe Fixture Test (Recommended)

Runs the filter-only workflow with deterministic fixtures:

```bash
npx promptfoo eval -c src/promptfoo/remote-jobs.promptfooconfig.yaml
```

**This test:**

- ✅ Validates JSON schema
- ✅ Checks exactly 2 buckets (worldwide + europe)
- ✅ Verifies all items pass strict invariants
- ✅ Confirms bad URLs are excluded
- ✅ No network calls, no API keys needed

### Live Test (Optional)

Requires API keys and runs the full workflow:

```bash
# Set API keys
export BRAVE_SEARCH_API_KEY=...
export DEEPSEEK_API_KEY=...

# Run live test
npx promptfoo eval -c src/promptfoo/remote-jobs.promptfooconfig.yaml
```

### With Model-Graded Rubric (Advanced)

Enable optional LLM-rubric grading using Cloudflare as judge:

```bash
# Option A: Cloudflare Workers AI
export CLOUDFLARE_ACCOUNT_ID=...
export CLOUDFLARE_API_KEY=...
export PROMPTFOO_JUDGE_PROVIDER="cloudflare-ai:chat:@cf/openai/gpt-oss-120b"
export PROMPTFOO_ENABLE_RUBRIC=1

# Option B: Cloudflare AI Gateway
export CLOUDFLARE_ACCOUNT_ID=...
export CLOUDFLARE_GATEWAY_ID=...
export CF_AIG_TOKEN=...  # if authenticated
export PROMPTFOO_JUDGE_PROVIDER="cloudflare-gateway:workers-ai:@cf/openai/gpt-oss-120b"
export PROMPTFOO_ENABLE_RUBRIC=1

# Run with rubric
npx promptfoo eval -c src/promptfoo/remote-jobs.promptfooconfig.yaml
```

## Test Modes

### Fixture Mode (CI)

```yaml
vars:
  mode: "fixture"
  fixtureName: "default"
  nowMs: 1771070400000  # Fixed timestamp for determinism
  excludedUrls:
    - "https://example.com/jobs/genai-hybrid"   # Should be filtered (hybrid)
    - "https://example.com/jobs/us-only"        # Should be filtered (US-only)
    - "https://example.com/jobs/nofresh"        # Should be filtered (no freshness)
```

### Live Mode

```yaml
vars:
  mode: "live"
  queryHint: "agentic"
  maxCandidatesPerMode: 25
  verifyTopNWithContext: 8
  minConfidence: 0.6
```

## Assertions

### 1. JSON Schema (`is-json`)

Validates output structure matches [remoteJobsOutput.schema.json](schemas/remoteJobsOutput.schema.json):

- Required: `worldwide`, `europe` keys
- Each job requires: `title`, `company`, `isFullyRemote`, `remoteRegion`, `sourceUrl`, `confidence`, `evidence`
- Type validation for all fields

### 2. Two Buckets Only (`twoBucketsOnly.js`)

Returns `true` only if:

- Object has exactly 2 keys
- Keys are `europe` and `worldwide`

### 3. Strict Invariants (`strictInvariants.js`)

Returns score in [0, 1] where 1.0 means all items pass:

**Remote Check:**

- ✅ `isFullyRemote === true`
- ✅ Has remote-positive signal (fully remote, 100% remote, remote-first, distributed, WFH)
- ✅ Does NOT have hybrid/onsite/in-office signals

**Region Check (worldwide):**

- ✅ `remoteRegion === "worldwide"`
- ✅ Has explicit worldwide/global/anywhere/location-agnostic signal
- ✅ Does NOT have region locks (US-only, work authorization, etc.)

**Region Check (europe):**

- ✅ `remoteRegion === "europe"`
- ✅ Has explicit Europe/EU/EEA/UK/EMEA or CET/CEST/EET/EEST/UTC±0..3 signal
- ✅ Does NOT have region locks

**Freshness Check:**

- ✅ `postedHoursAgo ≤ 24` OR
- ✅ `postedAtIso` within 24h OR
- ✅ Evidence contains "X hours ago" pattern ≤ 24

**Deduplication:**

- ✅ No duplicate URLs across or within buckets (canonical URL normalization)

### 4. Excludes Bad URLs (`excludesBadUrls.js`)

For fixture tests, verifies that known-bad URLs are NOT in the output.

### 5. LLM Rubric (Optional)

Uses Cloudflare model to grade output quality:

- Threshold: 0.9
- Validates all invariants via natural language rubric
- Only runs when `PROMPTFOO_ENABLE_RUBRIC=1`

## Environment Variables

### Required for Live Tests

```bash
BRAVE_SEARCH_API_KEY=...
DEEPSEEK_API_KEY=...
```

### Optional for Model-Graded Rubric

**Cloudflare Workers AI:**

```bash
CLOUDFLARE_ACCOUNT_ID=...
CLOUDFLARE_API_KEY=...
PROMPTFOO_JUDGE_PROVIDER="cloudflare-ai:chat:@cf/openai/gpt-oss-120b"
PROMPTFOO_ENABLE_RUBRIC=1
```

**Cloudflare AI Gateway:**

```bash
CLOUDFLARE_ACCOUNT_ID=...
CLOUDFLARE_GATEWAY_ID=...
CF_AIG_TOKEN=...  # Optional, for authenticated gateways
PROMPTFOO_JUDGE_PROVIDER="cloudflare-gateway:workers-ai:@cf/openai/gpt-oss-120b"
PROMPTFOO_ENABLE_RUBRIC=1
```

## Example Output

```
✓ Fixture: filters out hybrid/US-only/no-freshness; keeps 2 valid jobs
  ✓ is-json (schema validation)
  ✓ twoBucketsOnly
  ✓ strictInvariants (score: 1.0)
  ✓ excludesBadUrls

✓ Live: last-24h worldwide+europe, strict filters, dedupe
  ✓ is-json (schema validation)
  ✓ twoBucketsOnly
  ✓ strictInvariants (score: 0.95)
  ✓ excludesBadUrls
  ✓ llm-rubric (score: 0.92)

2/2 tests passed
```

## CI Integration

Add to your CI pipeline:

```yaml
# .github/workflows/test.yml
- name: Run Promptfoo Evals
  run: |
    pnpm add -D promptfoo
    npx promptfoo eval -c src/promptfoo/remote-jobs.promptfooconfig.yaml
  env:
    # Fixture mode doesn't need API keys
    NODE_ENV: test
```

## Advanced: Custom Judge Models

You can use any Cloudflare-supported model as judge:

**Workers AI models:**

- `@cf/openai/gpt-oss-120b` (recommended)
- `@cf/deepseek-ai/deepseek-r1-distill-qwen-32b`
- `@cf/meta/llama-3.3-70b-instruct-fp8-fast`

**AI Gateway providers:**

- `openai:gpt-4o`
- `anthropic:claude-3-7-sonnet-20250219`
- `groq:llama-3.3-70b-versatile`

## Extending

### Add New Assertion

Create `src/promptfoo/assertions/yourAssertion.js`:

```js
module.exports = (output, context) => {
  const obj = JSON.parse(output);
  // Your validation logic
  return true; // or false, or score 0-1
};
```

Add to config:

```yaml
assert:
  - type: javascript
    value: file://./src/promptfoo/assertions/yourAssertion.js
```

### Add New Test Case

Add to `remote-jobs.promptfooconfig.yaml`:

```yaml
tests:
  - description: "Your test case"
    vars:
      mode: "fixture"
      # ... your vars
```

## References

- [Promptfoo Custom Providers](https://www.promptfoo.dev/docs/providers/custom-api/)
- [Promptfoo JavaScript Assertions](https://www.promptfoo.dev/docs/configuration/expected-outputs/javascript/)
- [Promptfoo JSON Evaluation](https://www.promptfoo.dev/docs/guides/evaluate-json/)
- [Promptfoo LLM Rubric](https://www.promptfoo.dev/docs/configuration/expected-outputs/model-graded/llm-rubric/)
- [Cloudflare Workers AI](https://www.promptfoo.dev/docs/providers/cloudflare-ai/)
- [Cloudflare AI Gateway](https://www.promptfoo.dev/docs/providers/cloudflare-gateway/)

## Next Steps

1. **Run fixture test**: `npx promptfoo eval -c src/promptfoo/remote-jobs.promptfooconfig.yaml`
2. **Add to CI**: Include in your GitHub Actions workflow
3. **Try live mode**: Set API keys and test full workflow
4. **Enable rubric**: Use Cloudflare judge for model-graded checks
5. **Customize**: Add domain-specific assertions for your use case
