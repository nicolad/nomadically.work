# Optimization Strategy — nomadically.work

> Based on the Two-Layer Model: Meta Approaches (what you optimize for) + X-Driven Methods (how you iterate).
> See: [The Two-Layer Model That Separates AI Teams That Ship from Those That Demo](https://vadimnicolai.com/blog/two-layer-model-ai-teams)

---

## Our Biggest Failure Modes (ranked)

1. **Regressions when changing prompts/models** — silent accuracy drops
2. **Factual accuracy / hallucination** — false remote-EU classifications, hallucinated skills
3. **Cost too high / latency too slow** — multi-model pipeline costs compound
4. **Can't debug what happened in prod** — classification decisions are opaque
5. **High-stakes outputs need human sign-off** — batch reprocessing, SQL execution

---

## Layer 1 — Meta Approaches We Optimize For

### 🟣 Eval-First (PRIMARY)

**Core Guarantee:** Every change is tested against a defined correctness bar before shipping.

**Status: STRONG — actively enforced**

| Component | Threshold | Location |
|---|---|---|
| Vitest regression suite | >= 80% overall accuracy | `src/evals/remote-eu-eval.test.ts` |
| Per-test minimum | >= 0.5 score | `src/evals/remote-eu/scorers.ts` |
| High-confidence match | = 1.0 exact | `src/evals/remote-eu/scorers.ts` |
| Langfuse eval script | >= 80% accuracy or exit(1) | `scripts/eval-remote-eu-langfuse.ts:284` |
| Promptfoo strict invariants | = 1.0 (all pass) | `src/promptfoo/assertions/strictInvariants.js` |
| Promptfoo LLM rubric | >= 0.9 | `src/promptfoo/remote-jobs.promptfooconfig.yaml` |
| Freshness invariant | <= 24 hours | `src/promptfoo/assertions/strictInvariants.js` |
| Deduplication | 0 duplicates | `src/promptfoo/assertions/strictInvariants.js` |

**X-driven methods activated:**
- Evaluation-Driven (EDD): 5-layer Promptfoo assertion pipeline
- Example-Driven: 21 hand-crafted golden test cases + auto-exported DB cases
- Metric-Driven: Langfuse score tracking (remote-eu-accuracy, confidence-match)

**Run commands:**
```bash
pnpm test:eval              # Vitest regression (offline, deterministic)
pnpm eval:promptfoo          # Promptfoo 5-layer assertion pipeline
tsx scripts/eval-remote-eu-langfuse.ts  # Langfuse-traced evaluation
```

**Gap:** No CI gate yet — evals run locally but don't block deployment.

---

### 🟢 Grounding-First (PRIMARY)

**Core Guarantee:** Answers are backed by evidence or the system abstains.

**Status: STRONG — architecturally enforced**

| Pattern | Mechanism | Location |
|---|---|---|
| Hallucination blocking | Skill tags validated against vector-retrieved candidates only | `src/lib/skills/extraction-workflow.ts:131` |
| Evidence enforcement | Min 8-char evidence snippets required | `src/lib/skills/extraction-workflow.ts:132` |
| RAG abstention | "No relevant resume information found" when context empty | `workers/resume-rag/src/entry.py:692` |
| Confidence routing | Three-tier (high/medium/low) with escalation to stronger model | `workers/process-jobs/src/entry.py:936-979` |
| Fail-open pipeline | Uncertain jobs proceed (false positive < false negative cost) | `workers/process-jobs/src/entry.py:1040-1042` |
| Schema-constrained output | Zod schemas enforce structured LLM responses | `src/lib/skills/schema.ts`, `src/evals/remote-eu/schema.ts` |

**X-driven methods activated:**
- Retrieval-Driven (RAG): Resume RAG with Vectorize + Workers AI embeddings
- Schema-Driven: Zod + Pydantic enforce grounding contracts
- Eval-Driven: Groundedness checked in eval suite (evidence field validation)

**Grounding policy:**
1. Skill extraction: LLM may ONLY output tags from the top-50 vector-retrieved taxonomy candidates
2. Job classification: every decision carries `confidence` + `reason` + `source` provenance
3. Resume Q&A: grounded in retrieved chunks only; explicit abstention on no-match
4. Company facts: tracked with `source_type`, `extract_method`, and content hash

---

### 🟡 Multi-Model / Routing-First (SECONDARY)

**Core Guarantee:** Tasks route to the right model by difficulty, cost, and capability.

**Status: STRONG — cost-optimized pipeline**

| Task | Primary Model | Fallback | Cost Rationale |
|---|---|---|---|
| Job role tagging | Workers AI (free) | DeepSeek Chat | Only escalate if medium/low confidence |
| EU remote classification | Workers AI (free) | DeepSeek Chat | Same cascading pattern |
| Skill extraction | DeepSeek Chat | — | Cost-effective structured output |
| Resume RAG | Workers AI (BGE embeddings) | — | Free via Cloudflare |
| Complex reasoning | Claude Opus 4.6 | — | Only for architect/deep reasoning |
| Code review / research | Claude Sonnet 4.5 | — | Balanced cost/capability |
| Simple/fast tasks | Claude Haiku 3.5 | — | 1/19th cost of Opus |
| Web search grounding | Google Gemini 2.5 Flash | Brave Search API | Search-native grounding |

**X-driven methods activated:**
- Schema/Contract-Driven: Router contracts per task type
- Metric-Driven: Cost per route tracked (token estimates in reprocessing tool)
- Observability-Driven: Model source recorded in `remote_eu_source` field

**Routing architecture:**
```
Workers AI (free, fast) ──[high confidence]──> Accept
         │
    [medium/low]
         │
         v
DeepSeek Chat (cheap) ──[any confidence]──> Accept with score mapping
         │
    [error/timeout]
         │
         v
Low-confidence default ──> Persist with score=0.3
```

---

### ⚪ Spec-Driven (CROSS-CUTTING)

**Core Guarantee:** Target behavior is explicit, checkable, and enforceable at every phase.

**Status: MODERATE — strong in Build/Verify, weak in Discover/Operate**

| Spec Level | Status | Artifacts |
|---|---|---|
| Narrative Spec (Discover) | ✅ Strong | `CLAUDE.md`, `SKILLS-REMOTE-WORK-EU.md`, this document |
| Behavioral Spec (Discover→Build) | ✅ Strong | 21 golden test cases, scoring rubrics |
| Formal Spec (Build) | ✅ Strong | GraphQL schema, Drizzle ORM schema, Zod schemas, JSON Schema |
| Executable Spec (Verify) | ⚠️ Partial | Eval suites exist but no CI gate |
| Operational Spec (Operate) | ❌ Weak | No SLOs, no rollback triggers, no monitoring rules |

**X-driven methods activated:**
- Prompt-Driven: Versioned prompts in Langfuse with A/B labels
- Schema/Contract-Driven: GraphQL codegen, Drizzle types, Zod validation
- Workflow/Graph-Driven: Three-phase classification pipeline with state machine
- Evaluation-Driven: Promptfoo assertions as executable specs

---

### 🔵 Observability-First (EMERGING)

**Core Guarantee:** Every production failure is reproducible from traces.

**Status: PARTIAL — infrastructure present, tracing disabled**

| Component | Status | Location |
|---|---|---|
| Langfuse fetch API | ✅ Active | `src/langfuse/index.ts` — prompts, scores, usage |
| LangSmith integration | ✅ Active | `src/langsmith/index.ts` — prompt engineering |
| Mastra scorers | ✅ Active | `src/evals/remote-eu/scorers.ts` — 0.25 sampling |
| Langfuse exporter (Mastra) | ❌ Disabled | Edge Runtime zlib incompatibility |
| OpenTelemetry | ❌ Disabled | `src/otel/initOtel.ts` — stub only |
| Production tracing | ❌ Missing | No automatic trace capture in resolvers |

**Gap:** Can run evaluation traces manually but cannot replay production decisions.

---

### 🩷 Human-Validation-First (EMERGING)

**Core Guarantee:** High-stakes outputs require human sign-off before reaching users.

**Status: EMERGING — approval gates designed but not fully active**

| Decision | Approval Required | Location |
|---|---|---|
| Batch reprocessing | ✅ Yes — "queued (requires approval)" | `src/workspace/ops-skills.ts:152` |
| SQL query execution | ✅ Yes — human approve/modify | `src/workflows/database-query.ts:335` |
| Destructive file ops | ✅ Yes — requireApproval: true | `src/workspace/index.ts:47` |
| Command execution | ✅ Yes — requireApproval: true | `src/workspace/index.ts:56` |
| Job classification | ❌ No — automated pipeline | `workers/process-jobs/` |
| Skill extraction | ❌ No — automated pipeline | `src/lib/skills/extraction-workflow.ts` |

---

## Layer 2 — X-Driven Methods Active

| # | Method | Phase | Primary Artifact | Status |
|---|---|---|---|---|
| 1 | Prompt-Driven | Discover | Langfuse versioned prompts | ✅ Active |
| 2 | Example-Driven | Discover | 21 golden test cases + DB export | ✅ Active |
| 3 | Contract/Schema-Driven | Build | GraphQL + Drizzle + Zod schemas | ✅ Active |
| 4 | Tool/API-Driven | Build | Mastra tool definitions with Zod | ✅ Active |
| 5 | Workflow/Graph-Driven | Build | 3-phase job pipeline (Python) | ✅ Active |
| 6 | Retrieval-Driven (RAG) | Build | Resume RAG + Skill taxonomy vectors | ✅ Active |
| 7 | Data & Training-Driven | Build | DB-exported eval cases | ⚠️ Partial |
| 8 | Evaluation-Driven (EDD) | Verify | Vitest + Promptfoo + Langfuse | ✅ Active |
| 9 | Metric-Driven | Verify | Langfuse scores, confidence tracking | ⚠️ Partial |
| 10 | Trace/Observability-Driven | Operate | Manual eval traces only | ❌ Weak |

---

## Enforcement Rules

These rules are machine-checkable and enforced by the strategy enforcer agent (`src/agents/strategy-enforcer.ts`).

### Rule 1: Eval-First — No prompt/model change without eval
**Trigger:** Any change to files matching `**/prompt*`, `**/classifier*`, `**/extraction*`, `**/process-jobs/**`, `**/schema.ts` (Zod)
**Check:** `pnpm test:eval` must pass with >= 80% accuracy
**Severity:** BLOCKING

### Rule 2: Grounding-First — LLM outputs must be schema-constrained
**Trigger:** Any new LLM `.generate()` or `.chat()` call
**Check:** Must use `structuredOutput` with a Zod/JSON schema, OR validate output post-hoc
**Severity:** BLOCKING

### Rule 3: Grounding-First — Skill extraction must validate against taxonomy
**Trigger:** Changes to `src/lib/skills/extraction-workflow.ts`
**Check:** `filter((s) => allowed.has(s.tag))` must remain in validation step
**Severity:** BLOCKING

### Rule 4: Multi-Model — Cost-aware routing
**Trigger:** New model integration or routing change
**Check:** Cheaper model must be tried first; escalation only on low/medium confidence
**Severity:** WARNING

### Rule 5: Spec-Driven — Schema changes require codegen
**Trigger:** Changes to `schema/**/*.graphql`
**Check:** `pnpm codegen` must run and generated files must be committed
**Severity:** BLOCKING

### Rule 6: Observability — Classification decisions must carry provenance
**Trigger:** Any new classification or scoring output
**Check:** Output must include `confidence`, `reason`, and `source` fields
**Severity:** BLOCKING

### Rule 7: HITL — Batch operations require approval gates
**Trigger:** New batch processing tool or mutation affecting > 10 records
**Check:** Must have `requireApproval: true` or equivalent gate
**Severity:** WARNING

### Rule 8: Evidence — Every persisted AI decision must have evidence
**Trigger:** INSERT/UPDATE to `job_skill_tags`, `company_facts`, or classification fields
**Check:** `evidence`/`reason` field must be non-empty
**Severity:** BLOCKING

---

## Ecosystem Tools

| Meta Approach | Tools We Use |
|---|---|
| 🟣 Eval-First | Vitest, Promptfoo, Langfuse Scores, Mastra Scorers |
| 🟢 Grounding-First | Cloudflare Vectorize, Workers AI (BGE), Zod, Pydantic |
| 🟡 Multi-Model | OpenRouter, Anthropic SDK, DeepSeek API, Google ADK, Workers AI |
| ⚪ Spec-Driven | GraphQL Codegen, Drizzle ORM, Zod, JSON Schema |
| 🔵 Observability | Langfuse (fetch API), LangSmith |
| 🩷 Human-Validation | Mastra workspace approval gates |

---

## Priority Action Items

### P0 — Must Fix
- [ ] Add CI gate: `pnpm test:eval` blocks deployment if accuracy < 80%
- [ ] Enable production tracing: replace `@mastra/langfuse` with fetch-based span capture
- [ ] Add `isAdminEmail()` guard to `enhanceJobFromATS` mutation

### P1 — Should Fix
- [ ] Add GraphQL query complexity/depth limiting
- [ ] Remove `ignoreBuildErrors: true` from `next.config.ts`
- [ ] Create Pydantic output models for Python Workers
- [ ] Add operational SLOs (classification latency p99, ingestion freshness)

### P2 — Nice to Have
- [ ] Formalize skill taxonomy as versioned JSON Schema
- [ ] Add `@deprecated` directives to GraphQL schema
- [ ] Build cost dashboard per model route
- [ ] Implement automatic trace-to-eval-case pipeline

---

## How to Use This Document

1. **Before changing prompts/models:** Check Rule 1. Run `pnpm test:eval` before and after.
2. **Before adding LLM calls:** Check Rules 2, 6. Use structured output with provenance.
3. **Before adding new models:** Check Rule 4. Justify cost vs. existing routing.
4. **Before modifying schemas:** Check Rule 5. Run `pnpm codegen` after changes.
5. **Before batch operations:** Check Rule 7. Add approval gates.
6. **The strategy enforcer agent validates these rules automatically.**
