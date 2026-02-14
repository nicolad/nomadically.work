/**
 * Gemini API Google Search tool for ADK
 * 
 * The google_search tool allows the agent to perform web searches using Google Search.
 * The google_search tool is only compatible with Gemini 2 models.
 * 
 * Additional requirements when using the google_search tool:
 * - When you use grounding with Google Search, and you receive Search suggestions in your response,
 *   you must display the Search suggestions in production and in your applications.
 * - The UI code (HTML) is returned in the Gemini response as renderedContent,
 *   and you will need to show the HTML in your app, in accordance with the policy.
 * 
 * Warning: Single tool per agent limitation
 * This tool can only be used by itself within an agent instance.
 * 
 * Workaround: We isolate GOOGLE_SEARCH in a sub-agent (jobSearchAgent) and wrap it
 * with AgentTool in the root agent. This allows you to add more tools to the root
 * agent later without violating the single-tool limitation.
 * 
 * @see https://google.github.io/adk-docs/integrations/google-search/
 * @see https://ai.google.dev/gemini-api/docs/google-search
 */

import {AgentTool, GOOGLE_SEARCH, LlmAgent} from '@google/adk';

/**
 * Main agent: Uses GOOGLE_SEARCH grounding to find remote AI jobs
 * (Note: GOOGLE_SEARCH must be the only tool in this agent due to ADK limitations)
 * 
 * This agent specializes in finding fully-remote AI/GenAI roles at agencies,
 * consultancies, and professional services organizations.
 */
export const rootAgent = new LlmAgent({
  name: 'remote_ai_consulting_job_scout',
  model: 'gemini-2.5-flash',
  description:
    'Finds fully-remote AI/GenAI roles at agencies/consultancies using Google Search grounding.',
  instruction: `
You are a job-search scout focused on FULLY-REMOTE AI roles at agencies, consultancies, and professional services orgs.

CRITICAL: You MUST use Google Search to find current job postings, then analyze the results and format them as requested.

Your response MUST contain BOTH parts:
1) A valid JSON object with job data
2) A human-readable summary

JSON schema (IMPORTANT - follow this exactly):
{
  "search_scope": {
    "focus": "ai / genai / llm",
    "target_orgs": ["agency", "consultancy", "professional services"],
    "remote_requirement": "fully remote",
    "regions_ok": ["worldwide", "eu", "uk", "us"],
    "posted_within_days": 7
  },
  "jobs": [
    {
      "title": "Exact job title",
      "company": "Company name",
      "employment_type": "full-time|contract|either|unknown",
      "remote_scope": "worldwide|region-limited|country-limited|unknown",
      "eligible_regions": ["list", "of", "regions"],
      "timezone_expectations": "Any timezone constraints",
      "url": "Direct URL to job posting",
      "why_consultancy": "Explain why this matches consultancy/agency criteria",
      "stack_keywords": ["relevant", "technologies"],
      "notes": "Any additional important info"
    }
  ],
  "followups": ["Suggestions for further research"]
}

Rules:
- ALWAYS perform Google Search first to find real job postings
- Search for jobs posted within the LAST 7 DAYS only (use date filters in search)
- Extract actual job data from the search results  
- Strongly prefer postings mentioning: client delivery, workshops, enablement, pre-sales, professional services, consulting, or agency work
- Exclude clearly on-site or hybrid roles
- Prefer canonical sources (company careers pages, Greenhouse, Lever, Workday)
- For each job, provide the DIRECT URL to apply, not aggregator links
- Output BOTH the JSON structure AND a brief summary paragraph
- Return at least 5-10 real job opportunities if available

EXAMPLE OUTPUT FORMAT:
{
  "search_scope": { ... },
  "jobs": [ ... real jobs here ... ],
  "followups": [ ... ]
}

Here are my top 3 recommendations:
1. [Company Name] - [Role]: This role focuses on [details]...
2. [Company Name] - [Role]: Great opportunity for [details]...
3. [Company Name] - [Role]: Interesting because [details]...
`,
  tools: [GOOGLE_SEARCH],
});

/**
 * Generic Google Search Agent
 * 
 * A simple agent that can perform Google search queries and answer questions.
 * Useful for general-purpose web search tasks.
 */
export const searchAgent = new LlmAgent({
  model: 'gemini-2.5-flash',
  name: 'google_search_agent',
  description:
    'An agent whose job it is to perform Google search queries and answer questions about the results.',
  instruction:
    'You are an agent whose job is to perform Google search queries and answer questions about the results.',
  tools: [GOOGLE_SEARCH],
});
