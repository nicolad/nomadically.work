# Brave Search API Integration

Complete TypeScript implementation of **all** [Brave Search APIs](https://brave.com/search/api/) - the most comprehensive search API for AI applications.

## All APIs Implemented

| API | Status | Use Case |
|-----|--------|----------|
| **Web Search** | ✅ | General web results with extra snippets |
| **LLM Context** | ✅ | Pre-extracted content for RAG/grounding |
| **News Search** | ✅ | Recent news articles |
| **Video Search** | ✅ | Video content from across the web |
| **Image Search** | ✅ | Image results up to 150 per query |
| **Answers** | ✅ | AI-generated answers (OpenAI-compatible) |
| **Autosuggest** | ✅ | Query autocomplete suggestions |
| **Spellcheck** | ✅ | Spelling corrections |

## Why Brave Search API?

- ✅ **Comprehensive** - 8 different APIs for every search need
- ✅ **AI-Optimized** - LLM Context & Answers built for AI agents
- ✅ **No Rate Limits** on free tier (unlike Google Gemini)
- ✅ **Generous Quota** - 2,000 requests/month free
- ✅ **Type-Safe** - Full TypeScript support
- ✅ **Fresh Results** - Date filtering (24h, week, month, year)
- ✅ **Search Operators** - `site:`, `filetype:`, exclusions, exact phrases
- ✅ **Goggles** - Custom source ranking

## Setup

### 1. Get API Key

1. Visit [Brave Search API](https://brave.com/search/api/)
2. Sign up for a free API key (no credit card required for free tier)
3. Copy your API key

### 2. Configure Environment

Add your API key to `.env` or `.env.local`:

```bash
BRAVE_API_KEY="your_api_key_here"
```

## Quick Start

### Run Complete Demo

See all APIs in action:

```bash
npx tsx scripts/brave-complete-demo.ts
```

This demonstrates: Web Search, LLM Context, News, Video, Image, Autosuggest, Spellcheck, and AI Answers.

## Usage Examples

### 1. Web Search

```typescript
import { createBraveSearchClient } from './src/brave';

const client = createBraveSearchClient();

// Basic search
const results = await client.search({
  q: 'ai engineer remote',
  country: 'US',
  count: 20,
  extra_snippets: true, // Get 5 additional excerpts per result
});

// With search operators
const jobs = await client.search({
  q: '"ai engineer" site:jobs.ashbyhq.com -senior',
  freshness: 'pw', // past week
  extra_snippets: true,
});

// Smart pagination
for await (const page of client.paginateSearch({ q: 'ml engineer', count: 20 })) {
  console.log(`Page: ${page.length} results`);
}
```

### 2. LLM Context (RAG/Grounding)

Perfect for AI agents and RAG pipelines:

```typescript
import { getLLMContext, getComprehensiveLLMContext } from './src/brave';

// Balanced context (recommended)
const context = await getLLMContext({
  q: 'best practices for remote work',
  maximum_number_of_tokens: 8192,
  maximum_number_of_urls: 20,
  context_threshold_mode: 'balanced',
});

// Maximum context (use all options)
const richContext = await getComprehensiveLLMContext(
  'ai engineer job requirements',
  {
    country: 'US',
    search_lang: 'en',
    location: {
      'x-loc-lat': 37.7749,
      'x-loc-long': -122.4194,
      'x-loc-city': 'San Francisco',
      'x-loc-country': 'US',
    },
  }
);

// Use the grounding data
console.log(`Sources: ${richContext.grounding.generic.length}`);
richContext.grounding.generic.forEach(item => {
  console.log(`${item.title}: ${item.snippets.length} snippets`);
});
```

### 3. News Search

```typescript
import { searchNews } from './src/brave';

const news = await searchNews({
  q: 'artificial intelligence',
  freshness: 'pd', // past day
  count: 10,
});

news.results.forEach(article => {
  console.log(`${article.title} - ${article.age}`);
  console.log(`Breaking: ${article.breaking}`);
});
```

### 4. Video Search

```typescript
import { searchVideos } from './src/brave';

const videos = await searchVideos({
| File | Description |
|------|-------------|
| `search-client.ts` | Web Search API client |
| `llm-context.ts` | LLM Context API for RAG/grounding |
| `news-search.ts` | News Search API |
| `API Comparison

| Feature | Brave LLM Context | Brave Answers | Google Gemini |
|---------|------------------|---------------|---------------|
| Pre-extracted content | ✅ | ❌ | ❌ |
| AI-generated answers | ❌ | ✅ | ✅ |
| Rate limit (free) | 1 req/sec | 1 req/sec | 20 req/min |
| Monthly quota | 2,000 | 2,000 | Limited |
| Streaming | ❌ | ✅ | ✅ |
| Citations | ✅ | ✅ | ✅ |
| Token control | ✅ Fine-grained | ✅ | ✅ |
| Best for | RAG, AI agents | Chat, Q&A | General AI |

## Advanced Features

### Goggles (Custom Ranking)

```typescript
// Inline goggle to boost specific domains
const goggle = `
! name: Tech News
! description: Boost tech news sites
$boost=10,site=techcrunch.com
$boost=10,site=arstechnica.com
`;

const results = await client.search({
  q: 'latest ai news',
  goggles: goggle,
});
```

### Location-Aware Search

```typescript
const context = await getLLMContext(
  {
    q: 'best coffee shops near me',
    enable_local: true,
  },
  {
    'x-loc-lat': 37.7749,
    'x-loc-long': -122.4194,
    'x-loc-city': 'San Francisco',
    'x-loc-state': 'CA',
    'x-loc-country': 'US',
  }
);

// Access POI data
if (context.grounding.poi) {
  console.log(context.grounding.poi.title);
  console.log(context.grounding.poi.snippets);
}
```

### Context Threshold Modes

```typescript
// Strict - higher relevance, fewer results
const strict = await getLLMContext({
  q: 'quantum computing',
  context_threshold_mode: 'strict',
});

// Lenient - more results, lower relevance threshold
const lenient = await getLLMContext({
  q: 'quantum computing',
  context_threshold_mode: 'lenient',
});

// Disabled - no filtering
const all = await getLLMContext({
  q: 'quantum computing',
  context_threshold_mode: 'disabled',
```typescript
import { askQuestion, getAnswers, getAnswersStream } from './src/brave';

// Simple Q&A
const answer = await askQuestion('What is machine learning?', {
  systemPrompt: 'You are a helpful AI tutor.',
});

// Full control
const response = await getAnswers({
  messages: [
    { role: 'system', content: 'You are a career advisor.' },
    { role: 'user', content: 'Best remote AI jobs?' },
  ],
  temperature: 0.7,
  max_tokens: 500,
});

// Streaming
for await (const chunk of getAnswersStream({
  messages: [{ role: 'user', content: 'Explain transformers' }],
})) {
  const content = chunk.choices[0]?.delta?.content;
  if (content) process.stdout.write(content);
}
```

### 7. Autosuggest

```typescript
import { getAutosuggest } from './src/brave';

const suggestions = await getAutosuggest({
  q: 'ai eng',
  count: 10,
});

suggestions.results.forEach(s => {
  console.log(`${s.query}${s.is_entity ? ' (entity)' : ''}`);
});
```

### 8. Spellcheck

```typescript
import { spellcheck } from './src/brave';

const corrections = await spellcheck({
  q: 'machin lerning enginer',
});

corrections.results.forEach(c => {
  console.log(`"${c.original_term}" → "${c.suggestion}"`);
});
```

## Freshness Filters

| Value | Description | Example |
|-------|-------------|---------|
| `pd` | Past Day (24 hours) | Recent job postings |
| `pw` | Past Week (7 days) | This week's jobs |
| `pm` | Past Month (31 days) | Last month's jobs |
| `py` | Past Year | This year's jobs |
| Custom | Custom date range | `2026-01-01to2026-02-13` |

## Search Operators

Include operators directly in your query:

```typescript
// Exact phrase
q: '"ai engineer"'

// Site restriction
q: 'site:jobs.ashbyhq.com ai engineer'

// Exclude terms
q: 'engineer -senior -lead'

// File type
q: 'machine learning filetype:pdf'

// Combine operators
q: '"ai engineer" site:jobs.ashbyhq.com -senior'
```

## API Comparison: Brave vs Google

| Feature | Brave Search API | Google Gemini API (free) |
|---------|-----------------|--------------------------|
| Rate Limit | No limit on free tier | 20 requests/minute |
| Search Quality | Excellent | Excellent |
| Date Filtering | Built-in (`freshness` param) | Via search operators |
| Extra Snippets | Yes (5 per result) | No |
| Pagination | Up to 200 results | Limited by quota |
| Cost | Free tier available | Free tier (rate limited) |

## Files

- `src/brave/search-client.ts` - Core Brave Search API client
- `src/brave/search-jobs.ts` - Job search utilities
- `src/brave/index.ts` - Main exports
- `scripts/search-ashby-brave.ts` - CLI script for searching Ashby jobs

## Examples

### Search recent AI jobs

```typescript
import { searchRecentJobs } from './src/brave';

const jobs = await searchRecentJobs(
  '"ai engineer" OR "ml engineer"',
  'jobs.ashbyhq.com'
);
```

### Search with country targeting

```typescript
import { searchAshbyJobs } from './src/brave';

const jobs = await searchAshbyJobs({
  query: 'software engineer',
  country: 'DE', // Germany
  freshness: 'pw', // past week
});
```

### Get extra context with snippets

```typescript
const jobs = await searchAshbyJobs({
  query: 'ai engineer',
  extraSnippets: true, // Get 5 additional excerpts per result
});

jobs.forEach(job => {
  console.log(job.title);
  console.log('Snippets:', job.snippets);
});
```

## Mastra Workflows

### Remote AI Jobs Workflow (DeepSeek + Brave)

Find fully-remote AI/ML/LLM engineering jobs posted in the last 24 hours, categorized by region (worldwide or Europe).

**Features:**

- Uses Brave LLM Context API for intelligent web search
- Extracts jobs using DeepSeek (cost-effective, fast)
- Returns two buckets: worldwide and Europe remote jobs
- Filters by freshness (last 24h only)
- Deduplicates and ranks by posting time
- Confidence scoring with evidence trails

**Setup:**

Add to your `.env`:

```bash
BRAVE_SEARCH_API_KEY="your_brave_api_key"
DEEPSEEK_API_KEY="your_deepseek_api_key"
```

**Quick Run:**

```bash
# Basic usage
pnpm tsx src/brave/run-remote-ai-jobs.ts

# With custom query hint
pnpm tsx src/brave/run-remote-ai-jobs.ts --hint "LangChain OR CrewAI"
```

**Programmatic Usage:**

```typescript
import { remoteAiJobsLast24hWorkflow } from './src/brave';

const result = await remoteAiJobsLast24hWorkflow.execute({
  queryHint: "LangGraph OR Mastra" // optional
});

console.log(`Found ${result.worldwide.length} worldwide jobs`);
console.log(`Found ${result.europe.length} europe jobs`);

result.worldwide.forEach(job => {
  console.log(`${job.title} @ ${job.company}`);
  console.log(`Posted ${job.postedHoursAgo}h ago`);
  console.log(`Confidence: ${job.confidence * 100}%`);
  console.log(job.sourceUrl);
});
```

**What it searches for:**

- Roles: AI Engineer, Applied AI Engineer, GenAI Engineer, LLM Engineer, Agentic AI Engineer
- Remote: Fully remote only (not hybrid)
- Freshness: Last 24 hours
- Sources: Major ATS platforms (Greenhouse, Lever, Ashby, Workday, etc.)

**Outputs:**

Results are saved to `results/remote-ai-jobs-{timestamp}.json` with:

- Full job details
- Posted time (hours ago or ISO timestamp)
- Confidence scores (0-1)
- Evidence snippets from source pages
- Apply URLs when available

## Documentation

- [Brave Search API Docs](https://brave.com/search/api/)
- [Web Search Reference](https://api.search.brave.com/app/documentation/web-search)
- [Search Operators](https://search.brave.com/help/operators)
- [Mastra Documentation](https://mastra.ai/docs)
- [DeepSeek API Docs](https://api-docs.deepseek.com/)

## License

This integration is part of the nomadically.work project.
