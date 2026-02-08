# Nomadically.work - Application Documentation

## Overview

**Nomadically.work** is a Next.js application that **discovers, classifies, and curates remote job opportunities** with a focus on EU-based remote positions. The platform combines web scraping, AI-powered classification, and a Master Data Management (MDM) approach to build a comprehensive database of companies and jobs.

### Key Capabilities

1. **Job Discovery & Ingestion**: Scrapes job postings from ATS platforms (Ashby, Greenhouse, Lever, etc.) and partner APIs
2. **AI-Powered Classification**: Uses DeepSeek AI models to classify jobs as "Remote EU" or not with confidence scoring
3. **Company Discovery**: Leverages Common Crawl data to discover consultancy/agency companies and extract company metadata
4. **Skill Extraction**: Vector-based skill taxonomy with semantic matching for job requirements
5. **Evidence-Based MDM**: Every data point is backed by provenance (source URL, crawl ID, confidence, extraction method)

---

## Architecture Stack

- **Framework**: Next.js 16 (App Router)
- **Database**: Turso (LibSQL/SQLite) with Drizzle ORM
- **AI/LLM**: DeepSeek models via Mastra framework
- **Observability**: Langfuse for prompt management and tracing
- **Data Sources**: Common Crawl, ATS APIs (Ashby, Greenhouse, etc.)
- **Authentication**: Clerk
- **GraphQL**: Apollo Server & Client
- **Vector Store**: Mastra RAG for skills taxonomy

---

## Data Model

### Core Entities

#### Companies

Golden record master data for companies with evidence-based facts:

- **Identity**: ID, key (slug), canonical domain, name
- **Metadata**: Logo, website, description, industry, size, location
- **Classification**: Category (CONSULTANCY, AGENCY, STAFFING, etc.), tags, service taxonomy
- **Scoring**: Confidence score (0-1) with reasons
- **Provenance**: Last seen crawl ID, capture timestamp, source URL

#### Jobs

Job postings linked to companies:

- **Identity**: External ID, source kind, company reference
- **Details**: Title, location, description, URL, posted date
- **Classification**: Remote EU status (boolean), confidence (high/medium/low), reason
- **Skills**: Extracted skill tags with levels (required/preferred/nice)
- **Scoring**: Overall score with reason

#### Company Facts (MDM)

Evidence-based facts about companies:

- **Field**: Name, services, ATS boards, locations, etc.
- **Value**: JSON and text representations
- **Confidence**: 0-1 score
- **Evidence**: Source type, URL, crawl ID, extraction method, WARC pointer

#### Company Snapshots

Historical crawl data for reprocessing/debugging:

- Full HTML snapshots from Common Crawl
- Extracted JSON-LD and metadata
- Content hash for deduplication

#### ATS Boards

Discovered job board integrations:

- **Platform**: Vendor (Greenhouse, Lever, etc.), board type
- **Status**: Active/inactive, first/last seen dates
- **Evidence**: Discovery provenance

---

## Mastra Framework Integration

### Agents

#### Job Classifier Agent

**Purpose**: Classify job postings as "Remote EU" vs not using AI reasoning

**Model**: `deepseek/deepseek-reasoner` (inference), `deepseek/deepseek-chat` (scoring)

**Prompt Management**: Managed via Langfuse with version tracking

**Scorers** (Agent-level, message I/O):

- **Answer Relevancy** (25% sampling): Is output relevant to prompt?
- **Toxicity** (100% sampling): Safety check for toxic content
- **Bias** (25% sampling): Fairness check for biased language
- **Hallucination** (25% sampling): Fact invention detection

**Output Schema**:

```typescript
{
  isRemoteEU: boolean,
  confidence: "high" | "medium" | "low",
  reason: string
}
```

**Classification Rules**:
✅ **Remote EU** requires BOTH:

1. Fully remote (not office-based, not hybrid)
2. Allows work from EU countries

❌ **NOT Remote EU**:

- Specific city location (office-based/hybrid)
- UK-only (post-Brexit)
- EMEA without EU restriction
- Non-EU European countries (Switzerland, Norway)

---

### Workflows

#### 1. Job Classification Workflow

**ID**: `classify-job-workflow`

**Steps**:

1. **classify-job**: Classifies job using agent, updates database

**Scorers** (Step-level, structured I/O):

- **Remote EU Correctness** (100%): Custom LLM judge for domain accuracy
- **Has Reason** (100%): Deterministic check for non-empty explanation
- **Prompt Alignment** (25%): Follows rubric and format?
- **Answer Relevancy** (25%): Output relevant to input?
- **Completeness** (25%): Coverage of key job elements
- **Keyword Coverage** (25%): Job text terms in reason?
- **Tone Consistency** (25%): Explanation matches prompt tone
- **Faithfulness** (25%): Reason supported by job text?
- **Non-Hallucination** (25%): No contradictions/invented facts (inverted)
- **Context Relevance** (25%): Uses job text + rubric appropriately
- **Non-Toxicity** (10%): Safety check (inverted)
- **Non-Bias** (10%): Fairness check (inverted)

**Database Integration**: Automatically updates job record with:

- `status`: "eu-remote" or "non-eu"
- `score`: 0.9 (high), 0.6 (medium), 0.3 (low)
- `is_remote_eu`, `remote_eu_confidence`, `remote_eu_reason`

---

#### 2. Extract Job Skills Workflow

**ID**: `extractJobSkillsWorkflow`

**Purpose**: Extract required/preferred skills from job descriptions using vector similarity

**Vector Store**: Skills taxonomy with canonical names and aliases

- Uses Mastra RAG for semantic matching
- Normalizes skill aliases to canonical tags

---

#### 3. Discover Consultancies Common Crawl Workflow

**ID**: `discover-consultancies-commoncrawl`

**Purpose**: Discover consultancy companies from Common Crawl data

**Input**:

```typescript
{
  domains: string[],           // Seed domains to search
  recentCrawls: 6,             // Number of recent crawls to check
  maxPagesPerDomain: 6,        // Pages to fetch per domain
  concurrency: 6,              // Parallel requests
  minScore: 0.65               // Minimum confidence threshold
}
```

**Steps**:

1. **resolve-crawls**: Fetch recent Common Crawl index IDs
2. **harvest-domains**: For each domain:
   - Query CDX index for key pages (/, /about, /services, /work, etc.)
   - Fetch HTML from WARC archives
   - Extract facts (name, description, services, locations, etc.)
   - Build golden record with scoring

**Extraction Methods**:

- **JSON-LD** (0.95 confidence): Structured schema.org data
- **Meta tags** (0.6-0.7 confidence): OG tags, meta descriptions
- **DOM heuristics** (0.55 confidence): Service links, navigation structure
- **Text patterns** (0.5 confidence): Email addresses, phone numbers

**Scoring Algorithm**:

```
Base scoring (additive, max 1.0):
- JSON-LD org identity: +0.18
- Services/capabilities IA: +0.18
- Work/case studies IA: +0.18
- About/team IA: +0.08
- Contact signals: +0.08
- 3+ consultancy terms: +0.18 (or +0.1 for 1-2 terms)
- 6+ services: +0.12 (or +0.07 for 3-5)
- Locations present: +0.05
- Phone present: +0.03
- Spam penalty: -0.6
```

**Output**:

```typescript
{
  crawlIds: string[],
  results: GoldenRecord[]  // Sorted by score descending
}
```

---

### Tools

#### Common Crawl Tools

##### 1. Get Recent Crawl IDs

**ID**: `ccx_get_recent_crawl_ids`

Fetches newest Common Crawl collection IDs (format: CC-MAIN-YYYY-WW)

**Input**: `{ limit: number }`  
**Output**: `{ crawlIds: string[] }`

##### 2. CDX Latest Capture

**ID**: `ccx_cdx_latest`

Queries CDX index for latest HTML capture of a URL

**Input**: `{ crawlId: string, url: string }`  
**Output**: `{ record: CdxRecord | null }`

**CdxRecord**:

```typescript
{
  timestamp: string,      // YYYYMMDDhhmmss
  url: string,
  length: string,
  offset: string,
  filename: string,
  mime?: string,
  status?: string
}
```

##### 3. Fetch HTML from WARC

**ID**: `ccx_fetch_html_from_warc`

Fetches and extracts HTML from compressed WARC archives

**Input**: `{ filename: string, offset: number, length: number }`  
**Output**: `{ html: string | null }`

**Implementation**:

- HTTP range request to fetch WARC record
- Gunzip decompression
- Parse embedded HTTP response headers
- Handle chunked transfer encoding
- Decompress content-encoding (gzip/brotli/deflate)
- Extract HTML body

---

### Storage & Observability

#### Composite Storage

```typescript
new MastraCompositeStore({
  id: "turso-storage",
  domains: {
    memory: new MemoryLibSQL({ ... }),   // Agent memory
    scores: new ScoresLibSQL({ ... })     // Evaluation scores
  }
})
```

#### Observability (Langfuse)

- Prompt version management
- LLM call tracing
- Cost tracking
- Eval score storage

---

## GraphQL API

### Scalars

- `JSON`: Arbitrary JSON data
- `DateTime`: ISO 8601 timestamp
- `URL`: Valid URL string

### Enums

#### SourceType

```graphql
enum SourceType {
  COMMONCRAWL
  LIVE_FETCH
  MANUAL
  PARTNER
}
```

#### ExtractMethod

```graphql
enum ExtractMethod {
  JSONLD
  META
  DOM
  HEURISTIC
  LLM
}
```

#### CompanyCategory

```graphql
enum CompanyCategory {
  CONSULTANCY
  AGENCY
  STAFFING
  DIRECTORY
  PRODUCT
  OTHER
  UNKNOWN
}
```

#### ATSVendor

```graphql
enum ATSVendor {
  GREENHOUSE
  LEVER
  WORKABLE
  TEAMTAILOR
  ASHBY
  SMARTRECRUITERS
  JAZZHR
  BREEZYHR
  ICIMS
  JOBVITE
  SAP_SUCCESSFACTORS
  ORACLE_TALEO
  OTHER
}
```

---

### Types

#### Evidence

Provenance metadata for all extracted data:

```graphql
type Evidence {
  source_type: SourceType!
  source_url: String!
  crawl_id: String
  capture_timestamp: String
  observed_at: String!
  method: ExtractMethod!
  extractor_version: String
  http_status: Int
  mime: String
  content_hash: String
  warc: WarcPointer
}
```

#### WarcPointer

Reference to Common Crawl WARC record:

```graphql
type WarcPointer {
  filename: String!
  offset: Int!
  length: Int!
  digest: String
}
```

#### Company (Golden Record)

```graphql
type Company {
  id: Int!
  key: String!
  name: String!
  logo_url: String
  website: String
  description: String
  industry: String
  size: String
  location: String

  # Golden record fields
  canonical_domain: String
  category: CompanyCategory!
  tags: [String!]!
  services: [String!]! # Human-readable service phrases
  service_taxonomy: [String!]! # Normalized taxonomy IDs
  industries: [String!]!
  score: Float! # 0-1 confidence
  score_reasons: [String!]!

  # Common Crawl metadata
  last_seen_crawl_id: String
  last_seen_capture_timestamp: String
  last_seen_source_url: String

  # Related data
  ats_boards: [ATSBoard!]!
  facts(limit: Int, offset: Int, field: String): [CompanyFact!]!
  facts_count: Int!
  snapshots(limit: Int, offset: Int): [CompanySnapshot!]!
  snapshots_count: Int!
}
```

#### Job

```graphql
type Job {
  id: Int!
  external_id: String!
  source_id: String
  source_kind: String!
  company_id: Int!
  company_key: String!
  company: Company
  title: String!
  location: String
  url: String!
  description: String
  posted_at: String!

  # Classification
  score: Float
  score_reason: String
  status: String
  is_remote_eu: Boolean
  remote_eu_confidence: String
  remote_eu_reason: String

  # Skills
  skills: [JobSkill!]

  created_at: String!
  updated_at: String!
}
```

#### JobSkill

```graphql
type JobSkill {
  tag: String!
  level: String! # required | preferred | nice
  confidence: Float
  evidence: String
}
```

#### CompanyFact

Evidence-based fact about a company:

```graphql
type CompanyFact {
  id: Int!
  company_id: Int!
  field: String! # e.g., "name", "services", "ats_boards"
  value_json: JSON
  value_text: String
  normalized_value: JSON
  confidence: Float!
  evidence: Evidence!
  created_at: String!
}
```

#### CompanySnapshot

Historical crawl data:

```graphql
type CompanySnapshot {
  id: Int!
  company_id: Int!
  source_url: String!
  crawl_id: String
  capture_timestamp: String
  fetched_at: String!
  http_status: Int
  mime: String
  content_hash: String
  text_sample: String
  jsonld: JSON
  extracted: JSON
  evidence: Evidence!
  created_at: String!
}
```

#### ATSBoard

Discovered ATS integration:

```graphql
type ATSBoard {
  id: Int!
  company_id: Int!
  url: String!
  vendor: ATSVendor!
  board_type: ATSBoardType!
  confidence: Float!
  is_active: Boolean!
  first_seen_at: String!
  last_seen_at: String!
  evidence: Evidence!
  created_at: String!
  updated_at: String!
}
```

#### UserSettings

User preferences:

```graphql
type UserSettings {
  id: Int!
  user_id: String!
  email_notifications: Boolean!
  daily_digest: Boolean!
  new_job_alerts: Boolean!
  preferred_locations: [String!]
  preferred_skills: [String!]
  excluded_companies: [String!]
  dark_mode: Boolean!
  jobs_per_page: Int!
  created_at: String!
  updated_at: String!
}
```

---

### Queries

#### Jobs

```graphql
jobs(
  sourceType: String
  status: String
  search: String
  limit: Int
  offset: Int
  excludedCompanies: [String!]
): JobsResponse!

job(id: String!): Job
```

#### Companies

```graphql
companies(
  filter: CompanyFilterInput
  order_by: CompanyOrderBy
  limit: Int
  offset: Int
): CompaniesResponse!

company(id: Int, key: String): Company

company_facts(
  company_id: Int!
  field: String
  limit: Int
  offset: Int
): [CompanyFact!]!

company_snapshots(
  company_id: Int!
  limit: Int
  offset: Int
): [CompanySnapshot!]!

company_ats_boards(company_id: Int!): [ATSBoard!]!
```

#### User

```graphql
userSettings(userId: String!): UserSettings
```

---

### Mutations

#### Jobs

```graphql
deleteJob(id: Int!): DeleteJobResponse!
```

#### Companies

```graphql
createCompany(input: CreateCompanyInput!): Company!

updateCompany(id: Int!, input: UpdateCompanyInput!): Company!

deleteCompany(id: Int!): DeleteCompanyResponse!

add_company_facts(
  company_id: Int!
  facts: [CompanyFactInput!]!
): [CompanyFact!]!

upsert_company_ats_boards(
  company_id: Int!
  boards: [ATSBoardUpsertInput!]!
): [ATSBoard!]!

ingest_company_snapshot(
  company_id: Int!
  source_url: String!
  crawl_id: String
  capture_timestamp: String
  fetched_at: String!
  http_status: Int
  mime: String
  content_hash: String
  text_sample: String
  jsonld: JSON
  extracted: JSON
  evidence: EvidenceInput!
): CompanySnapshot!
```

#### User

```graphql
updateUserSettings(
  userId: String!
  settings: UserSettingsInput!
): UserSettings!
```

---

### Input Types

#### CompanyFilterInput

```graphql
input CompanyFilterInput {
  text: String
  category_in: [CompanyCategory!]
  min_score: Float
  has_ats_boards: Boolean
  service_taxonomy_any: [String!]
  canonical_domain_in: [String!]
}
```

#### CreateCompanyInput

```graphql
input CreateCompanyInput {
  key: String!
  name: String!
  logo_url: String
  website: String
  description: String
  industry: String
  size: String
  location: String
  canonical_domain: String
  category: CompanyCategory
  tags: [String!]
  services: [String!]
  service_taxonomy: [String!]
  industries: [String!]
}
```

#### EvidenceInput

```graphql
input EvidenceInput {
  source_type: SourceType!
  source_url: String!
  crawl_id: String
  capture_timestamp: String
  observed_at: String!
  method: ExtractMethod!
  extractor_version: String
  http_status: Int
  mime: String
  content_hash: String
  warc: WarcPointerInput
}
```

#### CompanyFactInput

```graphql
input CompanyFactInput {
  field: String!
  value_json: JSON
  value_text: String
  normalized_value: JSON
  confidence: Float!
  evidence: EvidenceInput!
}
```

#### ATSBoardUpsertInput

```graphql
input ATSBoardUpsertInput {
  url: String!
  vendor: ATSVendor!
  board_type: ATSBoardType!
  confidence: Float!
  is_active: Boolean!
  last_seen_at: String!
  evidence: EvidenceInput!
}
```

---

## Key Workflows

### 1. Job Classification Pipeline

```
Ingest Job → Extract Skills → Classify Remote EU → Update Database → Store Eval Scores
```

**Actors**:

- **Cloudflare Workers**: `insert-jobs.ts` (ingestion), `classify-jobs.ts` (classification)
- **Cron**: `cron.ts` (scheduled job fetching)
- **Scripts**: `ingest-jobs.ts`, `extract-job-skills.ts`

### 2. Company Discovery Pipeline

```
Seed Domains → Query CDX → Fetch WARC HTML → Extract Facts → Score → Store Golden Record
```

**Actors**:

- **Script**: `scrape-from-ccx.ts`
- **Workflow**: `discover-consultancies-commoncrawl`

### 3. ATS Board Discovery (Legacy)

```
Query CDX for jobs.ashbyhq.com → Extract board names → Fetch jobs → Store
```

**Script**: `discover-ashby-boards.ts`

---

## Evaluation Strategy

### Multi-Layered Scoring

#### 1. Domain-Specific (100% sampling)

- **Remote EU Correctness**: Custom LLM judge validates classification against rubric
- **Has Reason**: Ensures explanation exists

#### 2. General Quality (25% sampling)

- **Answer Relevancy**: Relevance to prompt
- **Completeness**: Coverage of key elements
- **Keyword Coverage**: Job terms in explanation
- **Prompt Alignment**: Follows format/rubric

#### 3. Grounding (25% sampling)

- **Faithfulness**: Supported by job text
- **Non-Hallucination**: No invented facts
- **Context Relevance**: Uses provided context

#### 4. Safety (10% sampling)

- **Non-Toxicity**: No toxic content
- **Non-Bias**: Fair language

### Score Storage

All scores stored in `mastra_scorers` table (LibSQL) for:

- Performance tracking over time
- Model comparison
- Prompt iteration analysis
- Outlier detection

---

## Scripts & Commands

### Development

```bash
pnpm dev              # Start Next.js dev server
pnpm build            # Production build
pnpm mastra:dev       # Mastra development UI
```

### Jobs

```bash
pnpm jobs:ingest           # Ingest jobs from ATS APIs
pnpm jobs:status           # Check ingestion status
pnpm jobs:extract-skills   # Extract skills from job descriptions
```

### Skills

```bash
pnpm skills:seed          # Seed skill taxonomy
pnpm skills:extract       # Extract skills from jobs
```

### Discovery

```bash
pnpm boards:discover      # Discover Ashby job boards
pnpm ccx:scrape          # Scrape companies from Common Crawl
```

### Evaluation

```bash
pnpm test:eval           # Run evaluations
pnpm test:eval:watch     # Watch mode for evals
```

### Database

```bash
pnpm db:generate         # Generate Drizzle migrations
pnpm db:migrate          # Run migrations
pnpm db:studio           # Open Drizzle Studio
```

### Workers (Cloudflare)

```bash
wrangler dev              # Dev mode (using wrangler.toml)
wrangler deploy           # Production deploy
```

---

## Data Flow Examples

### Example 1: Classify a Job

```typescript
import { classifyJob } from '@/mastra/actions';

const result = await classifyJob({
  title: "Senior Software Engineer",
  location: "Remote - Europe",
  description: "We're hiring across the EU..."
}, jobId);

// Result:
{
  ok: true,
  data: {
    isRemoteEU: true,
    confidence: "high",
    reason: "Job explicitly states 'Remote - Europe' and description confirms EU eligibility. No office location specified."
  }
}

// Database automatically updated:
// - status: "eu-remote"
// - score: 0.9
// - is_remote_eu: true
// - remote_eu_confidence: "high"
// - remote_eu_reason: "Job explicitly states..."
```

### Example 2: Discover Consultancies

```typescript
import { mastra } from '@/mastra';

const result = await mastra.workflows.discoverConsultancies.createRun()
  .start({
    inputData: {
      domains: ['thoughtworks.com', 'nearform.com', 'redhat.com'],
      recentCrawls: 6,
      maxPagesPerDomain: 6,
      minScore: 0.65
    }
  });

// Result.result.results:
[
  {
    canonicalDomain: 'thoughtworks.com',
    firmId: 'a3f2b1...',
    score: 0.89,
    reasons: ['JSON-LD/strong org identity', 'Services/capabilities IA', ...],
    name: 'Thoughtworks',
    services: ['Digital Transformation', 'Product Engineering', ...],
    facts: [
      {
        field: 'name',
        value: 'Thoughtworks',
        confidence: 0.95,
        evidence: { sourceType: 'commoncrawl', method: 'jsonld', ... }
      },
      ...
    ]
  },
  ...
]
```

### Example 3: Query Companies via GraphQL

```graphql
query SearchConsultancies {
  companies(
    filter: {
      category_in: [CONSULTANCY, AGENCY]
      min_score: 0.7
      has_ats_boards: true
      service_taxonomy_any: ["cloud-platforms", "data-engineering"]
    }
    order_by: SCORE_DESC
    limit: 20
  ) {
    companies {
      name
      canonical_domain
      score
      score_reasons
      services
      ats_boards {
        vendor
        url
        is_active
      }
    }
    totalCount
  }
}
```

---

## Production Workflow Deployment with Inngest

### Overview

Inngest is a developer platform for building and running background workflows with advanced features like retries, step memoization, real-time monitoring, and suspend/resume capabilities. Mastra workflows integrate seamlessly with Inngest, providing production-grade orchestration.

### How Inngest Works with Mastra

Inngest and Mastra integrate by aligning their workflow models:

- **Inngest** organizes logic into functions composed of steps
- **Mastra** workflows defined using `createWorkflow()` and `createStep()` map directly onto Inngest's paradigm
- Each Mastra workflow becomes an Inngest function with a unique identifier
- Each step within the workflow maps to an Inngest step

The `serve()` function bridges the two systems by registering Mastra workflows as Inngest functions and setting up necessary event handlers for execution and monitoring.

**Key Benefits**:
- **Step Memoization**: Completed steps are skipped on retry/resume
- **Real-time Monitoring**: Track workflow execution in Inngest dashboard
- **Suspend/Resume**: Pause and continue workflows
- **Advanced Flow Control**: Concurrency, rate limiting, throttling, debouncing, priority queuing
- **Cron Scheduling**: Automatic workflow triggering on schedules

### Setup

Install required packages:

```bash
pnpm add @mastra/inngest@latest inngest @inngest/realtime
```

### Inngest Initialization

Initialize Inngest with Mastra-compatible helpers:

**Development** (`src/mastra/inngest/index.ts`):
```typescript
import { Inngest } from "inngest";
import { realtimeMiddleware } from "@inngest/realtime/middleware";

export const inngest = new Inngest({
  id: "mastra",
  baseUrl: "http://localhost:8288",
  isDev: true,
  middleware: [realtimeMiddleware()],
});
```

**Production** (`src/mastra/inngest/index.ts`):
```typescript
import { Inngest } from "inngest";
import { realtimeMiddleware } from "@inngest/realtime/middleware";

export const inngest = new Inngest({
  id: "mastra",
  middleware: [realtimeMiddleware()],
});
```

### Creating Inngest-Compatible Workflows

Use the `init()` function to get Mastra-compatible workflow helpers:

```typescript
import { z } from "zod";
import { inngest } from "../inngest";
import { init } from "@mastra/inngest";

const { createWorkflow, createStep } = init(inngest);

// Define steps
const incrementStep = createStep({
  id: "increment",
  inputSchema: z.object({ value: z.number() }),
  outputSchema: z.object({ value: z.number() }),
  execute: async ({ inputData }) => {
    return { value: inputData.value + 1 };
  },
});

// Create workflow
const workflow = createWorkflow({
  id: "increment-workflow",
  inputSchema: z.object({ value: z.number() }),
  outputSchema: z.object({ value: z.number() }),
}).then(incrementStep);

workflow.commit();

export { workflow as incrementWorkflow };
```

### Configuring Mastra with Inngest

Update your Mastra instance to serve Inngest workflows:

```typescript
import { Mastra } from "@mastra/core";
import { serve } from "@mastra/inngest";
import { incrementWorkflow } from "./workflows";
import { inngest } from "./inngest";
import { PinoLogger } from "@mastra/loggers";

export const mastra = new Mastra({
  workflows: { incrementWorkflow },
  server: {
    host: "0.0.0.0",
    apiRoutes: [
      {
        path: "/api/inngest",
        method: "ALL",
        createHandler: async ({ mastra }) => {
          return serve({ mastra, inngest });
        },
      },
    ],
  },
  logger: new PinoLogger({ name: "Mastra", level: "info" }),
});
```

### Running Workflows Locally

1. **Start Mastra server**:
   ```bash
   npx mastra dev
   ```
   (Runs on port 4111)

2. **Start Inngest Dev Server**:
   ```bash
   npx inngest-cli@latest dev -u http://localhost:4111/api/inngest
   ```

3. **Open Inngest Dashboard**: http://localhost:8288
   - Verify your workflow is registered in the "Apps" section
   - Go to "Functions" → select your workflow → click "Invoke"

4. **Invoke workflow** with input:
   ```json
   {
     "data": {
       "inputData": {
         "value": 5
       }
     }
   }
   ```

5. **Monitor execution** in the "Runs" tab

### Deploying to Production

#### Prerequisites
- Vercel account and CLI (`npm i -g vercel`)
- Inngest account
- Vercel token

#### Steps

1. **Set Vercel token**:
   ```bash
   export VERCEL_TOKEN=your_vercel_token
   ```

2. **Add VercelDeployer to Mastra**:
   ```typescript
   import { VercelDeployer } from "@mastra/deployer-vercel";

   export const mastra = new Mastra({
     deployer: new VercelDeployer({
       teamSlug: "your_team_slug",
       projectName: "your_project_name",
       token: process.env.VERCEL_TOKEN,
     }),
   });
   ```

3. **Build Mastra instance**:
   ```bash
   npx mastra build
   ```

4. **Deploy to Vercel**:
   ```bash
   cd .mastra/output
   vercel login
   vercel --prod
   ```

5. **Sync with Inngest dashboard**:
   - Click "Sync new app with Vercel"
   - Follow instructions

6. **Invoke workflow from dashboard**:
   - Go to Functions → `workflow.increment-workflow`
   - All actions → Invoke
   - Provide input and monitor in Runs tab

### Flow Control Features

#### Concurrency
Limit simultaneous workflow executions:

```typescript
const workflow = createWorkflow({
  id: "user-processing-workflow",
  inputSchema: z.object({ userId: z.string() }),
  concurrency: {
    limit: 10,
    key: "event.data.userId", // Scope by user ID
  },
});
```

#### Rate Limiting
Limit executions per time period:

```typescript
const workflow = createWorkflow({
  id: "api-sync-workflow",
  rateLimit: {
    period: "1h",
    limit: 1000, // Max 1000 per hour
  },
});
```

#### Throttling
Minimum time between executions:

```typescript
const workflow = createWorkflow({
  id: "email-notification-workflow",
  throttle: {
    period: "10s",
    limit: 1,
    key: "event.data.organizationId",
  },
});
```

#### Debouncing
Delay execution until no new events:

```typescript
const workflow = createWorkflow({
  id: "search-index-workflow",
  debounce: {
    period: "5s",
    key: "event.data.documentId", // Wait 5s of no updates
  },
});
```

#### Priority Queuing
Execute high-priority workflows first:

```typescript
const workflow = createWorkflow({
  id: "order-processing-workflow",
  priority: {
    run: "event.data.priority ?? 50",
  },
});
```

### Cron Scheduling

Automatically trigger workflows on a schedule:

```typescript
const workflow = createWorkflow({
  id: "daily-report-workflow",
  inputSchema: z.object({ reportType: z.string() }),
  cron: "0 0 * * *", // Daily at midnight
  inputData: {
    reportType: "daily-summary",
  },
});
```

**Common cron patterns**:
- `*/15 * * * *` - Every 15 minutes
- `0 * * * *` - Every hour
- `0 */6 * * *` - Every 6 hours
- `0 9 * * 1-5` - Weekdays at 9 AM
- `0 0 1 * *` - First day of month at midnight

### Adding Custom Inngest Functions

Serve custom Inngest functions alongside Mastra workflows:

```typescript
// src/inngest/custom-functions.ts
import { inngest } from "../inngest";

export const customEmailFunction = inngest.createFunction(
  { id: "send-welcome-email" },
  { event: "user/registered" },
  async ({ event }) => {
    console.log(`Sending welcome email to ${event.data.email}`);
    return { status: "email_sent" };
  },
);

// src/mastra/index.ts
import { serve } from "@mastra/inngest";
import { customEmailFunction } from "./inngest/custom-functions";

export const mastra = new Mastra({
  workflows: { incrementWorkflow },
  server: {
    apiRoutes: [
      {
        path: "/api/inngest",
        method: "ALL",
        createHandler: async ({ mastra }) => {
          return serve({
            mastra,
            inngest,
            functions: [customEmailFunction], // Add custom functions
          });
        },
      },
    ],
  },
});
```

### Framework Adapters

Inngest works with any web framework using adapters:

#### Next.js
```typescript
// app/api/inngest/route.ts
import { createServe } from "@mastra/inngest";
import { serve as nextAdapter } from "inngest/next";
import { mastra, inngest } from "@/mastra";

const handler = createServe(nextAdapter)({ mastra, inngest });

export { handler as GET, handler as POST, handler as PUT };
```

#### Express
```typescript
import express from "express";
import { createServe } from "@mastra/inngest";
import { serve as expressAdapter } from "inngest/express";

const app = express();
app.use(express.json());

const handler = createServe(expressAdapter)({ mastra, inngest });
app.use("/api/inngest", handler);
```

#### Other Adapters
- Fastify: `inngest/fastify`
- Koa: `inngest/koa`
- AWS Lambda: `inngest/lambda`
- Cloudflare Workers: `inngest/cloudflare`

See [Inngest serve documentation](https://www.inngest.com/docs/serve) for all adapters.

---

## Environment Variables

### Required

```bash
# Database
TURSO_DB_URL=              # LibSQL connection string
TURSO_DB_AUTH_TOKEN=       # Turso auth token

# AI Models
DEEPSEEK_API_KEY=          # DeepSeek API key

# Observability
LANGFUSE_SECRET_KEY=       # Langfuse secret key
LANGFUSE_PUBLIC_KEY=       # Langfuse public key
LANGFUSE_HOST=             # Langfuse instance URL

# Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
```

### Optional

```bash
# Brave Search (for discovery)
BRAVE_API_KEY=

# Cloudflare Workers
CLOUDFLARE_ACCOUNT_ID=
CLOUDFLARE_API_TOKEN=
```

---

## Key Design Patterns

### 1. Evidence-Based MDM

Every company fact is backed by:

- Source URL
- Extraction method
- Confidence score
- WARC pointer (for Common Crawl)
- Capture timestamp

This enables:

- Auditing data lineage
- Reprocessing historical data
- Confidence-weighted merging
- Temporal queries

### 2. Multi-Model Evaluation

Jobs are evaluated across 14+ dimensions:

- Domain correctness
- Output quality
- Grounding/faithfulness
- Safety/bias

Sampling rates balance cost vs coverage.

### 3. Incremental Scoring

Company scoring is additive/compositional:

```
score = Σ(signal_i * weight_i) - penalties
```

This allows:

- Transparent reasoning
- Signal-level debugging
- A/B testing new signals

### 4. Workflow Composition

Mastra workflows chain reusable steps:

```
Step A → Step B → Step C
  ↓        ↓        ↓
Scorer 1  Scorer 2  Scorer 3
```

Each step can have independent:

- Input/output schemas (Zod)
- Scorers with sampling rates
- Error handling

---

## Future Enhancements (TODOs)

1. **Tool-Call Accuracy Scorers**: Enable when agents start using tools
2. **Real-Time Ingestion**: Move from cron to webhooks/streaming
3. **Multi-Language**: Extend beyond English job postings
4. **Salary Extraction**: Parse compensation data
5. **Company Deduplication**: Merge companies across data sources
6. **Skill Ontology**: Build hierarchical skill taxonomy
7. **User Recommendations**: Personalized job matching

---

## License & Credits

Built with:

- [Mastra](https://mastra.ai) - AI framework
- [Turso](https://turso.tech) - Edge database
- [Langfuse](https://langfuse.com) - LLM observability
- [DeepSeek](https://deepseek.com) - AI models
- [Common Crawl](https://commoncrawl.org) - Web archive

---

**Last Updated**: February 2026
