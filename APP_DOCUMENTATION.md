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

## Job Ingestion Pipeline

### Architecture Overview

The job ingestion system uses a distributed architecture with Cloudflare Workers for scalability and Next.js API routes for AI-powered processing:

```
Job Discovery (Cron) → Insert Worker → Queue → Process Webhook → AI Classification → Database
```

**Components**:
1. **Discovery Cron** (`workers/cron.ts`): Brave Search API discovers job boards
2. **Insert Worker** (`workers/insert-jobs.ts`): Accepts jobs via API, inserts to Turso
3. **Cloudflare Queue**: Decouples ingestion from processing
4. **Process Webhook** (`api/jobs/process`): Receives jobs from queue for AI processing
5. **Classification** (`mastra/actions.ts`): AI-powered job classification

### 1. Job Discovery Cron Worker

**File**: `workers/cron.ts`

Runs daily at midnight UTC to discover new job boards using Brave Search API.

**Configuration** (`wrangler.toml`):
```toml
[triggers]
crons = ["0 0 * * *"]  # Daily at midnight UTC
```

**Discovery Queries**:
- Greenhouse: `site:boards.greenhouse.io remote Europe EU -hybrid`
- Lever: `site:jobs.lever.co remote Europe EU -hybrid`
- Ashby: `site:jobs.ashbyhq.com remote Europe EU -hybrid`
- Workable: `site:apply.workable.com remote Europe EU -hybrid`
- OnHires: `site:onhires.com remote Europe EU -hybrid`

**Discovery Logic**:
```typescript
// Extract company key from URL
function extractJobSource(url: string): JobSource | null {
  const parsed = new URL(url);
  
  // Example: boards.greenhouse.io/company-name/jobs/123
  if (hostname === "boards.greenhouse.io") {
    const company = path.match(/^\/([^\/]+)/)?.[1];
    return {
      kind: "greenhouse",
      company_key: company,
      canonical_url: `https://boards-api.greenhouse.io/v1/boards/${company}/jobs`,
    };
  }
  // ... similar for lever, ashby, workable, onhires
}

// Filter for EU fully remote jobs
function looksLikeEuFullyRemote(result: BraveWebResult): boolean {
  const text = [result.title, result.description].join(" ").toLowerCase();
  
  const hasRemote = /\bremote\b|work from home/.test(text);
  const hasEuScope = /\beurope\b|\beu\b|\bemea\b/.test(text);
  const rejects = /\bhybrid\b|\bonsite\b/.test(text);
  const usOnly = /remote\s*us|usa only/.test(text);
  
  return hasRemote && hasEuScope && !rejects && !usOnly;
}
```

**Output**: Saves discovered job sources to `job_sources` table in Turso

**Environment Variables**:
```bash
BRAVE_API_KEY          # Brave Search API key
TURSO_DB_URL           # Database connection
TURSO_DB_AUTH_TOKEN    # Database auth
APP_URL                # Next.js app URL (for triggering scoring)
CRON_SECRET            # Optional secret for app webhooks
```

### 2. Job Insert Worker

**File**: `workers/insert-jobs.ts`

Cloudflare Worker that receives job data via POST and inserts/upserts into Turso, then enqueues for processing.

**API Endpoint**: `POST https://your-worker.workers.dev`

**Request Schema**:
```typescript
{
  "jobs": [
    {
      "externalId": "abc123",          // Required: ATS job ID
      "sourceId": 456,                  // Optional: Source record ID
      "sourceKind": "greenhouse",       // Required: ATS platform
      "companyKey": "acme-corp",       // Required: Company identifier
      "title": "Senior Engineer",       // Required
      "location": "Remote - EU",        // Optional
      "url": "https://...",            // Required: Application URL
      "description": "...",             // Optional: Full job description
      "postedAt": "2026-02-08T...",    // Optional: ISO 8601 timestamp
      "score": 0.85,                    // Optional: Pre-computed score
      "scoreReason": "...",             // Optional: Scoring explanation
      "status": "new"                   // Optional: Default "new"
    }
  ]
}
```

**Validation Rules**:
- `title`, `companyKey`, `url`, `externalId`, `sourceKind` are required
- Invalid jobs return 400 with detailed errors

**Upsert Logic** (Conflict Resolution):
```sql
INSERT INTO jobs (...) VALUES (...)
ON CONFLICT(source_kind, company_key, external_id) DO UPDATE SET
  title = excluded.title,
  description = COALESCE(excluded.description, jobs.description),
  score = COALESCE(excluded.score, jobs.score),
  -- Preserve existing status if already processed
  status = CASE
    WHEN jobs.status IS NOT NULL AND jobs.status != 'new' 
      AND excluded.status = 'new'
    THEN jobs.status
    ELSE excluded.status
  END,
  updated_at = excluded.updated_at
RETURNING id;
```

**Key Features**:
- **Prevents Status Regression**: If job is already classified (`status != 'new'`), re-ingesting doesn't reset to 'new'
- **Preserves AI Results**: Existing scores and classifications are kept if new data doesn't provide them
- **Returns Job IDs**: Uses `RETURNING id` for immediate enqueuing

**Queue Integration**:
```typescript
// After successful insert, enqueue for processing
for (const result of successfulInserts) {
  await env.JOBS_QUEUE.send({ jobId: result.jobId });
}
```

**Response**:
```json
{
  "success": true,
  "message": "Inserted 10/10 jobs; enqueued 10",
  "data": {
    "totalJobs": 10,
    "successCount": 10,
    "failCount": 0,
    "enqueuedCount": 10,
    "jobIds": [1, 2, 3, ...],
    "failures": []
  }
}
```

**Queue Consumer** (defined in same file):
```typescript
async queue(batch: MessageBatch<QueueMessage>, env: Env) {
  for (const message of batch.messages) {
    try {
      const { jobId } = message.body;
      
      // Forward to Next.js webhook for AI processing
      await fetch(env.NEXT_WEBHOOK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${env.WEBHOOK_SECRET}`,
        },
        body: JSON.stringify({ jobId }),
      });
      
      message.ack();  // Success
    } catch (err) {
      console.error("Failed to forward:", err);
      message.retry();  // Cloudflare retries with exponential backoff
    }
  }
}
```

**Wrangler Configuration** (`wrangler.insert-jobs.toml`):
```toml
name = "insert-jobs"
main = "workers/insert-jobs.ts"

[[queues.producers]]
  queue = "jobs-queue"
  binding = "JOBS_QUEUE"

[[queues.consumers]]
  queue = "jobs-queue"
  max_batch_size = 1        # Process one job at a time
  max_batch_timeout = 30    # Seconds
  max_retries = 3           # Retry failed jobs
  dead_letter_queue = "jobs-dlq"
```

**Environment Variables**:
```bash
TURSO_DB_URL           # Database connection
TURSO_DB_AUTH_TOKEN    # Database auth
API_SECRET             # Optional: Authentication for POST requests
NEXT_WEBHOOK_URL       # Next.js processing endpoint
WEBHOOK_SECRET         # Shared secret for Worker → Next.js
```

### 3. Process Webhook (Next.js)

**File**: `src/app/api/jobs/process/route.ts`

Receives jobs one-by-one from Cloudflare Queue consumer for AI processing.

**Endpoint**: `POST /api/jobs/process`

**Authentication**:
```typescript
const authHeader = request.headers.get("Authorization");
const expectedAuth = `Bearer ${process.env.WEBHOOK_SECRET}`;

if (authHeader !== expectedAuth) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
```

**Request Body**:
```json
{
  "jobId": 123
}
```

**Processing Flow**:
```typescript
export async function POST(request: NextRequest) {
  const { jobId } = await request.json();
  
  // 1. Fetch job from Turso
  const client = getTursoClient();
  const result = await client.execute({
    sql: "SELECT * FROM jobs WHERE id = ? LIMIT 1",
    args: [jobId],
  });
  
  const job = result.rows?.[0];
  
  // 2. Call AI classification (Mastra workflow)
  // See mastra/actions.ts classifyJob()
  
  // 3. Update job with classification results
  // See Job Classification Workflow section
  
  return NextResponse.json({ success: true, jobId });
}
```

**Current Implementation**: Base webhook that can be extended with:
- Mastra job classification (`classifyJob()`)
- Skill extraction (`extractJobSkillsWorkflow`)
- Company enrichment
- Notification triggers

### 4. Skill Extraction Script

**File**: `scripts/ingest-jobs.ts`

CLI tool for extracting skills from job descriptions using AI.

**Usage**:
```bash
# Extract skills for all jobs with descriptions (limit 100)
tsx scripts/ingest-jobs.ts --extract-skills

# Extract for specific job IDs
tsx scripts/ingest-jobs.ts --extract-skills --jobIds 1,2,3,100

# Custom limit
tsx scripts/ingest-jobs.ts --extract-skills --limit 50
```

**Implementation**:
```typescript
async function extractSkillsForJob(config: Config, jobId: number) {
  // Calls Next.js API route
  const response = await fetch(
    `${config.nextBaseUrl}/api/jobs/extract-skills`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId }),
    },
  );
  
  const result = await response.json();
  return {
    success: result.success,
    skillsExtracted: result.skillsExtracted || 0,
  };
}
```

**Database Query**:
```sql
SELECT id, title, company_key, status, description, created_at, updated_at
FROM jobs
WHERE description IS NOT NULL
  AND description != ''
ORDER BY created_at DESC
LIMIT ?
```

**Output**:
```
🔍 Extracting skills for 50 jobs

  Processing job 1... ✅ (8 skills)
  Processing job 2... ✅ (12 skills)
  ...

📊 Extraction Summary:
  ✅ Successful: 48
  ❌ Failed: 2
  🏷️  Total Skills Extracted: 420
```

**Skills Storage**: Results saved to `job_skill_tags` table with:
- `tag`: Canonical skill name (from taxonomy)
- `level`: required | preferred | nice
- `confidence`: 0-1 score
- `evidence`: Text snippet from description

### 5. Complete Ingestion Flow Example

**Scenario**: Greenhouse job board discovery → ingestion → classification

#### Step 1: Discovery (Daily Cron)
```
[Cron Worker runs at midnight]
  ↓
Brave Search: "site:boards.greenhouse.io remote Europe"
  ↓
Extract company keys: ["acme-corp", "techco", "consultancy-x"]
  ↓
Save to job_sources table
```

#### Step 2: Fetch Jobs (Manual/Scheduled)
```
[Script or API] Fetch from Greenhouse API
  ↓
GET https://boards-api.greenhouse.io/v1/boards/acme-corp/jobs
  ↓
Parse JSON response → 15 jobs
```

#### Step 3: Insert (Cloudflare Worker)
```
POST https://insert-jobs.workers.dev
{
  "jobs": [
    {
      "externalId": "abc123",
      "sourceKind": "greenhouse",
      "companyKey": "acme-corp",
      "title": "Senior Backend Engineer",
      "location": "Remote - EU",
      "url": "https://boards.greenhouse.io/acme-corp/jobs/abc123",
      "description": "We're looking for...",
      "status": "new"
    },
    ...
  ]
}
  ↓
Insert/Upsert to Turso (15 jobs)
  ↓
Enqueue 15 job IDs to Cloudflare Queue
  ↓
Response: { successCount: 15, enqueuedCount: 15, jobIds: [...] }
```

#### Step 4: Queue Processing
```
[Queue Consumer picks message]
  ↓
Message: { jobId: 1 }
  ↓
POST /api/jobs/process
Authorization: Bearer <webhook_secret>
{ "jobId": 1 }
```

#### Step 5: AI Classification
```
[Next.js Webhook]
  ↓
Fetch job from Turso (id=1)
  ↓
Call classifyJob() → Mastra workflow
  ↓
DeepSeek AI: { isRemoteEU: true, confidence: "high", reason: "..." }
  ↓
Update jobs table:
  - status = "eu-remote"
  - score = 0.9
  - is_remote_eu = 1
  - remote_eu_confidence = "high"
  - remote_eu_reason = "Explicitly states remote EU eligibility"
  ↓
Store eval scores in mastra_scorers table
  ↓
Queue acknowledges message
```

#### Step 6: Skill Extraction (Optional)
```
tsx scripts/ingest-jobs.ts --extract-skills --jobIds 1
  ↓
POST /api/jobs/extract-skills { jobId: 1 }
  ↓
Mastra extractJobSkillsWorkflow
  ↓
Extract: ["TypeScript", "Node.js", "PostgreSQL", "Docker", ...]
  ↓
Insert to job_skill_tags table
```

### Deployment

#### Cloudflare Workers
```bash
# Deploy cron worker
wrangler deploy --config wrangler.toml

# Deploy insert worker
wrangler deploy --config wrangler.insert-jobs.toml

# Test locally
wrangler dev --config wrangler.insert-jobs.toml
```

#### Next.js API Routes
Deployed automatically with Vercel:
```bash
# Deploy to production
vercel --prod

# Set environment variables
vercel env add WEBHOOK_SECRET
vercel env add TURSO_DB_URL
vercel env add TURSO_DB_AUTH_TOKEN
```

### Monitoring

#### Cloudflare Dashboard
- **Workers > insert-jobs**: View invocation logs, errors, CPU time
- **Queues > jobs-queue**: Monitor queue depth, throughput, retries
- **Dead Letter Queue**: Inspect failed jobs

#### Inngest Dashboard (if using Inngest workflows)
- Real-time workflow execution
- Step-by-step progress
- Retry history
- Error details

#### Turso Console
```sql
-- Check ingestion stats
SELECT 
  source_kind,
  COUNT(*) as total,
  COUNT(CASE WHEN status = 'new' THEN 1 END) as pending,
  COUNT(CASE WHEN status = 'eu-remote' THEN 1 END) as eu_remote,
  COUNT(CASE WHEN status = 'non-eu' THEN 1 END) as non_eu
FROM jobs
GROUP BY source_kind;

-- Recent ingestions
SELECT id, title, company_key, status, created_at
FROM jobs
ORDER BY created_at DESC
LIMIT 20;
```

### Error Handling

#### Insert Worker
- **Validation Errors**: Return 400 with specific field errors
- **Database Errors**: Log and return 500, queue handles retry
- **Partial Success**: Track success/fail count per batch

#### Queue Consumer
- **Network Errors**: Automatic retry with exponential backoff (max 3 times)
- **Webhook Auth Failure**: Retry (fix WEBHOOK_SECRET in both systems)
- **Processing Timeout**: Message returns to queue, retried
- **Max Retries Exceeded**: Message sent to Dead Letter Queue for manual inspection

#### Process Webhook
- **Job Not Found**: Return 404, queue consumer should not retry
- **AI API Failure**: Log error, return 500, allow retry
- **Database Update Failure**: Rollback, return 500, retry

### Rate Limits & Quotas

#### Brave Search API
- **Free Tier**: 1 request/second, 2000 requests/month
- **Recommended**: Use `freshness=pm` (past month) to maximize results per query

#### Cloudflare Workers
- **Free Tier**: 100,000 requests/day
- **CPU Time**: 10ms per request (Free), 50ms (Paid)
- **Queue**: 10,000 messages/day (Free)

#### Turso
- **Free Tier**: 9 GB storage, 1 billion row reads/month
- **Recommended**: Use connection pooling, batch writes

### Best Practices

1. **Idempotency**: Upsert on `(source_kind, company_key, external_id)` prevents duplicates
2. **Status Preservation**: Never downgrade processed jobs to 'new'
3. **Queue Batching**: Set `max_batch_size=1` for strict one-by-one processing
4. **Webhook Security**: Always validate `WEBHOOK_SECRET` in Next.js routes
5. **Error Monitoring**: Check Dead Letter Queue daily for failed jobs
6. **Cost Optimization**: 
   - Cache ATS API responses
   - Use Brave Search sparingly (cron once daily)
   - Batch skill extractions
7. **Data Quality**: Validate job URLs, filter spam, normalize company keys

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
