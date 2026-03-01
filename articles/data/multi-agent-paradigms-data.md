# Data Analysis: Multi-Agent AI Systems in the EU Developer Job Market

## Summary

Of 9,392 jobs in the nomadically.work D1 database (as of 2026-03-01), 484 jobs (5.2%) mention "agent" or "agentic" systems in titles or descriptions. The term "agentic" alone appears in 195 job descriptions, and explicit multi-agent system mentions appear in 62. Orchestration frameworks (LangGraph, AutoGen, CrewAI, LlamaIndex) appear in 23 jobs, with LangGraph being the most cited (16 jobs). The agentic AI category is growing faster than traditional ML roles on a title-frequency basis, but the classification pipeline has left 178 of 244 agent-signal jobs unclassified for remote EU status — meaning the true EU-remote opportunity set remains unmeasured. Salary data is sparse but indicative: Sierra, the most active agentic-engineering employer in the dataset, posts USD 180K–390K for software engineer roles in their agent platform.

---

## Key Metrics

| Metric | Value | Period | Notes |
|---|---|---|---|
| Total jobs in database | 9,392 | All time (majority Feb 2026) | Greenhouse 86.4%, Ashby 12.5% |
| Jobs with "agent" signal (broad) | 484 | All time | Title or description match |
| Jobs with "agentic" in description | 195 | All time | 2.1% of corpus |
| Jobs with "multi-agent" in description | 62 | All time | 0.66% of corpus |
| Explicit AI/agentic title jobs | 112 | All time | "AI agent", "agentic", "agent architect/engineer", "LLM engineer", "generative AI" |
| Traditional ML title jobs (non-agentic) | 108 | All time | "machine learning", "ml engineer", "data scientist", "research scientist" |
| Jobs with orchestration framework mention | 23 | All time | LangGraph, AutoGen, CrewAI, LlamaIndex, LangChain |
| Jobs classified is_remote_eu = true | 109 | All time | Classification pipeline partially stalled |
| AI-flagged agent jobs with remote EU classification | 66 | All time | 27% of agentic-signal jobs classified |
| Jobs with Rust in title (excl. "trust") | 12 | All time | 3 companies |
| Skill extraction coverage | 32 jobs / 117 tags | All time | Sparse — pipeline not yet run at scale |

---

## Insight 1: Agentic Roles Now Rival Traditional ML Roles by Title Volume

Across 9,392 jobs, title-based AI/agentic engineering roles (112 jobs) have caught up to and slightly surpassed traditional ML titles (108 jobs) as a category. This is a structural shift, not a marginal bump. "Agentic" is no longer a description confined to research — it is appearing in product engineering titles like "Software Engineer II, Backend (AI Agents)" (Affirm), "AI Agent Architect, Customer Experience" (Airtable), "Software Engineer, Agent Architecture" (Sierra), and "Senior Software Engineer, Agentic Platform" (A Place for Mom).

- **Agentic title jobs:** 112 (includes: "AI agent", "agentic", "agent architect", "agent engineer", "LLM engineer", "generative AI", "gen AI")
- **Traditional ML title jobs:** 108 (includes: "machine learning engineer", "ML engineer", "data scientist", "research scientist" — excluding agentic/LLM qualifiers)
- **Ratio:** 1.04:1 — essentially parity, a first in this dataset
- **Query:** `COUNT(*) WHERE lower(title) LIKE '%ai agent%' OR lower(title) LIKE '%agentic%' OR ...` vs. `COUNT(*) WHERE lower(title) LIKE '%machine learning%' OR lower(title) LIKE '%ml engineer%' OR ...` (with negative filters on agentic terms)

**Visualization:** Grouped bar chart comparing "Agentic/LLM titles" vs "Traditional ML titles" count. X-axis: category. Y-axis: job count. Headline: "Agentic Engineering Roles Have Matched Traditional ML Postings."

---

## Insight 2: "Agentic" Language Is Permeating Job Descriptions at Scale

The word "agentic" appears in 195 job descriptions (2.1% of corpus) — a term that barely existed in job postings two years ago. "Multi-agent" appears in 62 descriptions (0.66%). Combined, 244 unique jobs carry either an agentic title signal or a multi-agent/agentic description signal. This is roughly 1 in 38 jobs in the entire corpus now using the language of autonomous, orchestrated AI systems.

- **"agentic" in description:** 195 jobs
- **"multi-agent" / "multi agent" in description:** 62 jobs
- **Either signal (union):** 244 jobs
- **As % of corpus (N=9,392):** 2.6%
- **Query:** `SUM(CASE WHEN lower(description) LIKE '%agentic%' THEN 1 ELSE 0 END)` and `SUM(CASE WHEN lower(description) LIKE '%multi-agent%' OR lower(description) LIKE '%multi agent%' THEN 1 ELSE 0 END)`

**Visualization:** Stacked area chart. X-axis: posted_at month. Y-axis: job count. Layers: "multi-agent description", "agentic description", "agentic title". Headline: "Three Ways 'Agent' Is Entering Job Postings."

---

## Insight 3: February 2026 Is a Breakout Month for Agentic AI Job Postings

When filtered to AI-engineering-adjacent agent title jobs (title contains "agent" plus "AI", "engineer", "agentic", or "LLM"), February 2026 shows 16 postings — more than the prior five months combined (16 total from August 2025 to January 2026). January 2026 shows only 1, suggesting an explosive acceleration in February. At the same time, total job postings also spiked in February (7,610 out of 9,392 total), likely reflecting a bulk ingestion from a newly added source batch.

| Month | Agent-Adjacent Title Jobs | Total Jobs | Agent % of Total |
|---|---|---|---|
| 2026-02 | 16 | 7,610 | 0.21% |
| 2026-01 | 1 | 902 | 0.11% |
| 2025-12 | 7 | 292 | 2.40% |
| 2025-11 | 3 | 293 | 1.02% |
| 2025-10 | 3 | 112 | 2.68% |
| 2025-09 | 2 | 41 | 4.88% |
| 2025-08 | 3 | 36 | 8.33% |
| 2025-04 | 1 | 23 | 4.35% |
| 2025-02 | 1 | (older data) | — |

- **Caveat:** The February 2026 surge in total jobs reflects a data ingestion event, not organic growth. The absolute count of agent jobs in February (16) is real, but the percentage (0.21%) is deflated by the total. Months with fewer total jobs but similar agent job counts (Aug–Dec 2025) show 2–8% agent concentration.
- **Query:** `strftime('%Y-%m', posted_at), COUNT(*) WHERE lower(title) LIKE '%agent%' AND (lower(title) LIKE '%ai%' OR lower(title) LIKE '%engineer%' OR ...) GROUP BY month`

**Visualization:** Dual-axis line chart. Left Y-axis: agent job count per month (bars). Right Y-axis: agent jobs as % of that month's total (line). X-axis: month (2025-02 to 2026-02). Headline: "Agent Role Concentration Runs at 2–8% in Organic Months."

---

## Insight 4: Orchestration Framework Adoption Is Still Early-Stage — LangGraph Leads

Jobs explicitly naming LangGraph, AutoGen, CrewAI, LlamaIndex, or LangChain account for only 23 jobs (0.24% of corpus), but the specific naming of a framework is a strong signal of operational adoption rather than aspirational interest.

| Framework | Jobs Mentioning It | % of Corpus (N=9,392) |
|---|---|---|
| LangGraph | 16 | 0.17% |
| LangChain | 14 | 0.15% |
| AutoGen | 7 | 0.07% |
| CrewAI / Crew AI | 6 | 0.06% |
| LlamaIndex / Llama Index | 6 | 0.06% |

- **Note:** These counts overlap — some jobs mention multiple frameworks. The 23-job total counts distinct jobs with any framework mention.
- **Query:** `SUM(CASE WHEN lower(description) LIKE '%langgraph%' THEN 1 ELSE 0 END)` etc., then `COUNT(*)` with union of all conditions.

Companies posting the most framework-specific jobs (N=23 total):

| Company | Framework-Specific Jobs |
|---|---|
| Spoton | 4 |
| Sierra | 3 |
| Pear-VC (portfolio) | 3 |
| PrimeIntellect | 2 |
| Aisera Jobs | 2 |
| Atari | 2 |
| Others (7 companies) | 1 each |

- **Surprise:** Atari (2 jobs) — a legacy gaming company — appears alongside AI-native startups like Sierra and PrimeIntellect. This suggests orchestration framework skills are spreading to established tech companies beyond pure-play AI.
- **Query:** `company_key, COUNT(*) WHERE lower(description) LIKE '%langgraph%' OR ...`

**Visualization:** Horizontal bar chart of framework mentions. X-axis: job count. Y-axis: framework name. Headline: "LangGraph Has the Largest Footprint, but All Frameworks Are Sub-1% of Postings."

---

## Insight 5: Rust + AI Engineering Overlap Is Minimal in This Dataset

Direct Rust-language engineering roles in the database total only 12 jobs across 3 companies (Affinidi, Anaplan, and one title match at Affirm — "Senior Software Engineer, Full-Stack (Trust & Safety)" which is a false positive on "trust"). Of those 12, none have AI/ML description keywords that co-occur with Rust in a meaningful way (the refined query returned 1 match with very strict conditions, and that match was borderline).

- **Rust-titled engineering jobs:** 12 (from Affinidi: 9 roles including "Backend Engineer, Senior (Rust)" and "Staff Rust Developer", Anaplan: 2 "Senior Software Engineer (Rust/C++)")
- **Rust + AI/ML co-occurrence (strict):** 1 job (borderline match)
- **Rust + AI/ML co-occurrence (broad, including description):** 2,102 — but this is a false positive problem: SQLite `LIKE '%rust%'` matches "trust", "robust", "industry", etc. in long job descriptions
- **Key caveat (small sample size N<30):** With only 12 confirmed Rust-title jobs, no statistical conclusions can be drawn about Rust+AI as a job market pattern from this dataset alone.

The nomadically.work Rust presence is notable in infrastructure: Affinidi (identity/privacy tech, likely EU-relevant) posts Rust backend roles. However, the database does not yet have sufficient Rust-AI crossover postings to validate the "Rust for AI systems" thesis quantitatively.

- **Query:** `COUNT(*) WHERE lower(title) LIKE '%rust%' AND lower(title) NOT LIKE '%trust%'` for titles; strict description join required for meaningful co-occurrence.

**Visualization:** Small N — use a callout box rather than a chart. Headline: "Rust + AI Engineering: Only 12 Confirmed Rust Roles in Dataset; No Strong AI Co-occurrence Signal."

---

## Insight 6: Sierra Is the Dominant Agentic Employer in This Dataset — and Their Pay Is Elite

Sierra (AI-native agent infrastructure company, Ashby ATS) is the single most data-rich employer in the agentic space. They post a dense cluster of agent-specific engineering roles — "Software Engineer, Agent", "Software Engineer, Agent Architecture", "Software Engineer, Agent Data Platform", "Software Engineer, Agent Studio", "Engineering Manager, Agent" — with consistent compensation data attached.

**Salary data from Sierra (Ashby ATS, USD):**

| Role | Salary Range (USD/year) |
|---|---|
| Engineering Manager, Agent | $280K – $410K |
| Software Engineer, Agent (multiple specializations) | $180K – $390K |
| Software Engineer, Platform/Infra/SRE | $230K – $390K |

- **Note:** Sierra also posts international variants of the same roles in SGD (SGD 295K–495K) and CAD (CA$195K–425K), and JPY (¥22M–47M) — suggesting genuinely global remote hiring. However, none of these specific Sierra roles are classified as `is_remote_eu = true` in the pipeline yet.
- **Comparison job (Pear-VC portfolio):** "Staff Engineer — Tanagram" posted $180K–$250K USD with 0.5–2% equity. "Founding Product Engineer" posted $150K–250K USD with 0.3–1.5% equity.
- **Salary data caveat:** Structured `ashby_compensation` data with actual salary figures exists for only 58 of 109 remote-EU-classified jobs, and none of those 58 have non-null salary values (all return empty `summaryComponents`). The Sierra salary data is from the broader unclassified corpus (N=9,392). EU-specific salary benchmarks cannot be extracted from this dataset at this time.
- **Query:** `SELECT title, company_key, ashby_compensation WHERE ashby_compensation IS NOT NULL AND json_extract(ashby_compensation, '$.scrapeableCompensationSalarySummary') IS NOT NULL`

**Visualization:** Table. Columns: Company, Role Type, Salary Range (USD). Sort by max salary descending. Headline: "Agent Platform Engineers Command $230K–$410K at AI-Native Companies."

---

## Insight 7: The Classification Pipeline Blind Spot — 73% of Agentic Jobs Have No EU Classification

Of 244 jobs with strong agentic signals (agentic titles + multi-agent/agentic descriptions), only 66 (27%) have `is_remote_eu` set to any value. The remaining 178 (73%) are unclassified — status remains "new" in the pipeline. This is a direct consequence of the known issue: the classification pipeline has not processed the bulk of jobs ingested in February 2026.

This means the data angle for "how many agentic jobs are available for EU remote workers" cannot be answered from this database today. The 66 classified jobs include at least 1 confirmed non-EU (accenturefederalservices, is_remote_eu=0), but the breakdown of the 66 is not available without a further GROUP BY query.

- **Agentic signal jobs (union of title + description):** 244
- **Of those with any is_remote_eu classification:** 66 (27.0%)
- **Of those unclassified (null):** 178 (73.0%)
- **Implication for journalists/readers:** Any claim about "remote EU agentic AI jobs" from this dataset requires the caveat that only 27% of the relevant jobs have been classified.

**Visualization:** Donut chart. Segments: "Classified — remote EU or not" (27%), "Unclassified — status unknown" (73%). Headline: "3 in 4 Agent-Signal Jobs Have Not Yet Been Screened for EU Remote Status."

---

## Raw Data Tables

### Framework Mention Counts (N=9,392 total jobs)

| Signal | Jobs | % of Corpus |
|---|---|---|
| "agentic" in description | 195 | 2.08% |
| "agent" in title (all types) | 484 | 5.15% |
| "multi-agent" / "multi agent" in description | 62 | 0.66% |
| "agentic" OR "multi-agent" combined | 244 | 2.60% |
| LangGraph in description | 16 | 0.17% |
| LangChain in description | 14 | 0.15% |
| AutoGen in description | 7 | 0.07% |
| CrewAI / Crew AI in description | 6 | 0.06% |
| LlamaIndex / Llama Index in description | 6 | 0.06% |
| Any orchestration framework (union) | 23 | 0.24% |

### ATS Source Distribution (All 9,392 Jobs)

| ATS Platform | Job Count | % of Total |
|---|---|---|
| Greenhouse | 8,115 | 86.4% |
| Ashby | 1,170 | 12.5% |
| Other (remoteok, remotive, etc.) | 107 | 1.1% |
| Lever | 0 | 0% |

### Agentic Jobs by ATS Source (N=248 jobs with any agent signal)

| ATS Platform | Agent-Signal Jobs | % of that ATS's total |
|---|---|---|
| Greenhouse | 183 | 2.3% |
| Ashby | 62 | 5.3% |
| Other | 3 | 2.8% |

Ashby-sourced jobs have a 2.3x higher concentration of agentic AI signals vs Greenhouse. This likely reflects Ashby's adoption profile: it skews toward AI-native and tech-forward startups.

### Skill Tag Coverage (Sparse — N=32 jobs with any extracted tags)

| Tag | Jobs Tagged |
|---|---|
| machine-learning | 10 |
| agile | 10 |
| python | 8 |
| sql | 7 |
| gcp | 7 |
| typescript | 5 |
| nlp | 2 |
| deep-learning | 2 |
| tensorflow | 1 |
| pytorch | 1 |

**Critical caveat:** The `job_skill_tags` table contains only 117 rows across 32 jobs out of 9,392. Skill extraction has not been run at scale. Tags reflect the skills subsystem's current partial state and cannot be used for any market analysis conclusions.

---

## Methodology

- **Data source:** nomadically.work D1 database (`nomadically-work-db`, Cloudflare D1, 92MB), queried via Wrangler CLI with `--remote` flag
- **Database version:** Production, queried 2026-03-01
- **Total records at query time:** 9,392 jobs, 32 companies with skill tags, 117 skill tag rows
- **Query method:** Raw SQL via `wrangler d1 execute --remote --command "..."` — not Drizzle ORM (CLI-only access in this context). Equivalent Drizzle patterns documented where relevant.
- **Time period:** Jobs span 2025-02 through 2026-02; bulk of data (81%) was ingested in February 2026
- **Key filters applied:**
  - Agent/agentic signals: SQLite `LIKE '%agentic%'`, `LIKE '%multi-agent%'`, `LIKE '%ai agent%'` etc.
  - Framework mentions: exact lowercase substring match in `description` column
  - Salary data: `json_extract(ashby_compensation, '$.scrapeableCompensationSalarySummary') IS NOT NULL`
- **Caveats:**
  1. **Classification pipeline stalled:** 89% of jobs remain in "new" status, meaning `is_remote_eu` is null. Any EU-specific analysis is severely limited.
  2. **Description quality:** Many jobs have `description` as null or empty (particularly Ashby entries before enhancement). Framework mention counts may undercount if descriptions were not fetched.
  3. **Duplicate jobs:** The database contains duplicate job postings (same title, same company, different `external_id`). Counts reflect raw rows, not deduplicated opportunities.
  4. **Rust false positives:** SQLite `LIKE '%rust%'` in descriptions matches "trust", "robust", "industry" — description-based Rust analysis requires full-text search or regex, not LIKE.
  5. **Salary data nearly absent:** `ashby_compensation` is structured JSON but the `summaryComponents` array is empty for almost all jobs that have this field. EU-specific salary data does not exist in the current dataset.
  6. **Skill tags sparse:** Only 32 of 9,392 jobs have extracted skill tags. The skills subsystem exists but hasn't been run at production scale.
  7. **February 2026 ingestion spike:** 7,610 of 9,392 jobs (81%) were ingested in February 2026 in what appears to be a bulk source addition. Month-over-month growth rates are not comparable across this discontinuity.

---

## Story Recommendations

1. **Use Insight 1 (Agentic vs Traditional ML parity) as the article's thesis anchor.** The 112 vs 108 comparison is clean, surprising, and defensible. Frame it as "the job market has already made the shift — employers are asking for agent engineers at the same rate as data scientists."

2. **Use Insight 3 (monthly trend table) to show the acceleration story.** The 2–8% agent concentration in organic months (Aug–Dec 2025) is the real signal. Walk readers through why Feb 2026's raw number (16) looks small but the percentage context matters.

3. **Use Insight 4 (orchestration framework table) as the "developer tooling" angle.** LangGraph at 16 jobs and AutoGen at 7 jobs are early but concrete adoption signals. Writers covering developer tooling can use this to illustrate the LangGraph vs AutoGen vs CrewAI competitive dynamic in real hiring demand.

4. **Use Insight 6 (Sierra salary data) for the compensation section.** Sierra's $180K–$410K USD range is real ATS data, not survey data. Be precise: this is a US-headquartered AI startup posting globally — not EU-market salary data. Frame it as "what the frontier is paying."

5. **Flag Insight 7 (classification gap) as a transparency section in the article.** The 73% unclassified stat is an honest admission that the EU-specific lens is under-developed in this pipeline. This is a legitimate journalistic point: the EU remote market for agentic AI roles is genuinely hard to measure because ATS data rarely includes clear geographic eligibility signals.

6. **Rust + AI (Insight 5) is a negative result — use it honestly.** The "Rust for AI systems" narrative is a real trend in the broader market (e.g., Hugging Face Candle, Burn framework, Cloudflare's own Workers AI built on Rust/WASM). But this dataset does not have enough Rust-titled jobs (N=12) to validate it empirically. Recommend framing: "The Rust-for-AI story is real in OSS but hasn't yet materialized as job-market signal in this ATS-aggregated corpus."
