# Google Search Agent for ADK

A complete implementation of Google's Agent Development Kit (ADK) with Google Search grounding, featuring a specialized job-search agent that finds fully-remote AI/GenAI roles at agencies and consultancies.

## Overview

This implementation demonstrates:

- **ADK TypeScript + Google Search grounding** (`GOOGLE_SEARCH` tool)
- **Search sub-agent** with proper single-tool limitation workaround
- **Root wrapper agent** that can be extended with more tools later
- **Programmatic runner** that outputs:
  - Strict JSON (machine-readable)
  - Human summary with inline citation markers
  - Numbered source list
  - Search Suggestions HTML (when present)

## Architecture

### Single Tool Per Agent Limitation Workaround

ADK's `GOOGLE_SEARCH` tool has a **single-tool-per-agent** limitation. We solve this by:

1. Isolating `GOOGLE_SEARCH` in a **search sub-agent** (`jobSearchAgent`)
2. Wrapping it with `AgentTool` in a **root agent** (`rootAgent`)
3. Using `skipSummarization: true` to keep sub-agent output unchanged

This pattern allows you to add more tools to the root agent later without violating the constraint.

**References:**

- [ADK Google Search Integration](https://google.github.io/adk-docs/integrations/google-search/)
- [ADK Tool Limitations](https://google.github.io/adk-docs/tools/limitations/)
- [Custom Function Tools](https://google.github.io/adk-docs/tools-custom/function-tools/)

## Prerequisites

- **Node.js 24.13+** and **npm 11.8+**
- A Google AI API key (Gemini API)

## Setup

### 1. Install Dependencies

The `@google/adk` package and dev tools are already installed in this project.

If you need to install them manually:

```bash
pnpm add @google/adk
pnpm add -D @google/adk-devtools tsx
pnpm add dotenv
```

### 2. Configure API Key

Create a `.env` file in the project root:

```bash
echo 'GEMINI_API_KEY="YOUR_API_KEY"' > .env
```

Or use `GOOGLE_API_KEY`. If both are set, `GOOGLE_API_KEY` wins.

**Get your API key:** [Google AI API Keys](https://ai.google.dev/gemini-api/docs/api-key)

## Files

### `search-agent.ts`

Contains three agents:

1. **`jobSearchAgent`** (sub-agent) - Uses `GOOGLE_SEARCH` to find fully-remote AI roles at consultancies
2. **`rootAgent`** (main export) - Wraps the search agent using `AgentTool`
3. **`searchAgent`** - Generic search agent for general-purpose queries

### `run.ts`

Programmatic runner that:

- Accepts command-line prompts
- Executes the agent
- Extracts grounding metadata
- Outputs:
  - Valid JSON (machine-readable)
  - Summary with inline citations `[1,2]`
  - Numbered source list
  - Web search queries used
  - Search Suggestions HTML (if present)

## Usage

### Option A: ADK Devtools CLI / Web UI

Run the agent interactively:

```bash
npx adk run src/google/search-agent.ts
```

Start the web UI:

```bash
npx adk web
```

**Reference:** [ADK TypeScript Quickstart](https://google.github.io/adk-docs/get-started/typescript/)

### Option B: Programmatic Runner (with Citations)

Run with the custom runner that outputs structured results with citations:

```bash
npx tsx src/google/run.ts "Find 12 fully-remote GenAI consultancy roles. Include EU eligibility."
```

Or use the default prompt:

```bash
npx tsx src/google/run.ts
```

## Output Format

The runner outputs structured data in sections:

### 1. JSON (machine-readable)

```json
{
  "search_scope": {
    "focus": "ai / genai / llm",
    "target_orgs": ["agency", "consultancy", "professional services"],
    "remote_requirement": "fully remote",
    "regions_ok": ["worldwide", "eu", "uk", "us"],
    "posted_within_days": 45
  },
  "jobs": [
    {
      "title": "AI Solutions Architect",
      "company": "Example Consultancy",
      "employment_type": "full-time",
      "remote_scope": "worldwide",
      "eligible_regions": ["eu", "uk", "us"],
      "timezone_expectations": "flexible",
      "url": "https://example.com/careers/123",
      "why_consultancy": "Client-facing role delivering AI solutions",
      "stack_keywords": ["rag", "agents", "llms"],
      "notes": "Strong preference for EU candidates"
    }
  ],
  "followups": ["Check company blog for upcoming roles"]
}
```

### 2. Summary (with inline citations)

```
Top picks include Example Consultancy's AI Solutions Architect role[1,2],
which offers worldwide remote work with a focus on RAG and agent development[3].
```

### 3. Web Search Queries

```
- remote AI consultant jobs agencies 2026
- genai professional services jobs remote
```

### 4. Sources

```
[1] Example Consultancy Careers
    https://example.com/careers/123

[2] LinkedIn Job Posting
    https://linkedin.com/jobs/view/456

[3] AI Agency Blog
    https://example-agency.com/blog/were-hiring
```

### 5. Search Suggestions HTML

When present, this section contains HTML that **must be displayed in production** per Google's grounding requirements:

```html
<!-- Compliant HTML+CSS for search suggestions -->
```

## Grounding Requirements & Gotchas

### Required: Display Search Suggestions

When you use grounding with Google Search and receive Search suggestions:

- **You MUST display them in production applications**
- The UI code (HTML) is returned as `renderedContent`
- Follow display/tap requirements per Google's policy

**Reference:** [Grounding with Google Search (Vertex AI)](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/grounding/grounding-with-google-search)

### Gemini 2 Compatibility

The ADK `GOOGLE_SEARCH` tool is compatible with **Gemini 2 models** (e.g., `gemini-2.5-flash`).

**Reference:** [ADK Google Search Integration](https://google.github.io/adk-docs/integrations/google-search/)

### Billing (Gemini 3)

For Gemini 3, grounding billing is **per generated search query**. A single prompt can generate multiple queries.

**Reference:** [Grounding Metadata](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/reference/rest/v1beta1/GroundingMetadata)

### Grounding Payload Structure

ADK exposes grounding metadata on the final event:

- `event.groundingMetadata` - Main grounding object
- `event.groundingMetadata.groundingChunks` - Source documents/web pages
- `event.groundingMetadata.groundingSupports` - Maps text spans to chunk indices (for citations)
- `event.groundingMetadata.searchEntryPoint.renderedContent` - Search Suggestions HTML
- `event.groundingMetadata.webSearchQueries` - Queries sent to Google Search

**References:**

- [ADK Event Interface](https://google.github.io/adk-docs/api-reference/typescript/interfaces/Event.html)
- [Grounding with Google Search (Gemini API)](https://ai.google.dev/gemini-api/docs/google-search)

## Extending the Agent

### Adding More Tools to Root Agent

Since `jobSearchAgent` is isolated, you can add tools to `rootAgent`:

```typescript
import {FunctionTool} from '@google/adk';

const customTool = new FunctionTool({
  name: 'custom_tool',
  description: 'Does something custom',
  parameters: {...},
  fn: async (params) => {...},
});

export const rootAgent = new LlmAgent({
  name: 'remote_ai_consulting_job_scout',
  model: 'gemini-2.5-flash',
  description: '...',
  instruction: '...',
  tools: [
    new AgentTool({agent: jobSearchAgent, skipSummarization: true}),
    customTool,  // ✓ This works!
  ],
});
```

### Creating Additional Search Agents

Use the `searchAgent` export for general-purpose queries:

```typescript
import { searchAgent } from "./src/google/search-agent.js";

// Use searchAgent for generic web searches
```

## Example Prompts

```bash
# Default: finds 10 remote AI/GenAI roles at consultancies
npx tsx src/google/run.ts

# Specific regions
npx tsx src/google/run.ts "Find 15 remote AI consultant roles in EU-based agencies"

# Tech stack focus
npx tsx src/google/run.ts "Find RAG engineer roles at AI consultancies, remote worldwide"

# Contract work
npx tsx src/google/run.ts "Find contract GenAI roles at professional services firms, remote OK"
```

## Resources

### Official Documentation

- [ADK TypeScript Quickstart](https://google.github.io/adk-docs/get-started/typescript/)
- [ADK Google Search Integration](https://google.github.io/adk-docs/integrations/google-search/)
- [ADK Grounding with Google Search](https://google.github.io/adk-docs/grounding/google_search_grounding/)
- [ADK Event Interface](https://google.github.io/adk-docs/api-reference/typescript/interfaces/Event.html)
- [ADK Tool Limitations](https://google.github.io/adk-docs/tools/limitations/)
- [Custom Function Tools](https://google.github.io/adk-docs/tools-custom/function-tools/)

### Gemini API Documentation

- [Grounding with Google Search (Gemini API)](https://ai.google.dev/gemini-api/docs/google-search)
- [Using Gemini API Keys](https://ai.google.dev/gemini-api/docs/api-key)

### Vertex AI Documentation

- [Grounding with Google Search (Vertex AI)](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/grounding/grounding-with-google-search)
- [Grounding Metadata Reference](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/reference/rest/v1beta1/GroundingMetadata)

## License

See the project root for license information.
