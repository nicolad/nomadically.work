/**
 * Brave Search API Integration
 *
 * Complete implementation of Brave Search APIs:
 * - Web Search
 * - LLM Context (RAG/Grounding)
 * - News Search
 * - Video Search
 * - Image Search
 * - Answers (AI Chat)
 * - Autosuggest
 * - Spellcheck
 */

// ============================================================================
// WEB SEARCH
// ============================================================================
export {
  BraveSearchClient,
  createBraveSearchClient,
  type BraveSearchParams,
  type BraveSearchResponse,
  type BraveWebResult,
} from "./search-client";

export { searchAshbyJobs } from "./search-jobs";

// ============================================================================
// LLM CONTEXT (RAG/Grounding)
// ============================================================================
export {
  getLLMContext,
  getComprehensiveLLMContext,
  getBalancedLLMContext,
  type BraveLLMContextParams,
  type BraveLLMContextHeaders,
  type BraveLLMContextResponse,
  type BraveLLMGrounding,
  type BraveLLMGroundingSnippet,
  type BraveLLMSource,
} from "./llm-context";

// DIY LLM Context (Free Tier Alternative)
export {
  getDIYLLMContext,
  getDIYLLMContextWithTokenTarget,
  getAshbyJobsLLMContext,
  getWorldwideRemoteJobsContext,
  getEuropeRemoteJobsContext,
  getAshbyWorldwideRemoteJobsContext,
  type DIYLLMContextResult,
} from "./diy-llm-context";

// ============================================================================
// NEWS SEARCH
// ============================================================================
export {
  searchNews,
  type BraveNewsSearchParams,
  type BraveNewsSearchResponse,
  type BraveNewsResult,
} from "./news-search";

// ============================================================================
// MEDIA SEARCH (Video & Images)
// ============================================================================
export {
  searchVideos,
  searchImages,
  type BraveVideoSearchParams,
  type BraveVideoSearchResponse,
  type BraveVideoResult,
  type BraveImageSearchParams,
  type BraveImageSearchResponse,
  type BraveImageResult,
} from "./media-search";

// ============================================================================
// UTILITIES (Autosuggest & Spellcheck)
// ============================================================================
export {
  getAutosuggest,
  spellcheck,
  type BraveAutosuggestParams,
  type BraveAutosuggestResponse,
  type BraveSpellcheckParams,
  type BraveSpellcheckResponse,
} from "./utilities";

// ============================================================================
// ANSWERS (AI Chat)
// ============================================================================
export {
  getAnswers,
  getAnswersStream,
  askQuestion,
  type BraveAnswersParams,
  type BraveAnswersMessage,
  type BraveAnswersResponse,
  type BraveAnswersStreamChunk,
} from "./answers";

// ============================================================================
// MASTRA INTEGRATION
// ============================================================================
export { braveLlmContextTool, braveWebSearchTool } from "./brave-search-tools";

// ============================================================================
// WORKFLOWS
// ============================================================================
export {
  remoteAiJobsLast24hWorldwideEuWorkflow,
  remoteAiJobsFilterOnlyWorkflow,
  filterAndSplitJobs,
  jobSchema,
  outputSchema,
  type Job,
  type WorkflowOutput,
} from "./remote-ai-jobs-last-24h-worldwide-eu";

// ============================================================================
// CONSTANTS
// ============================================================================
export {
  BRAVE_API_ENDPOINTS,
  DEFAULT_JOB_QUERIES,
  ATS_SITES,
  SEARCH_DEFAULTS,
  LLM_CONTEXT_DEFAULTS,
  COMPREHENSIVE_LLM_LIMITS,
  JOB_EXTRACTION_DEFAULTS,
  REGION_MODES,
  ANSWERS_DEFAULTS,
  HTTP_HEADERS,
  LOCATION_HEADERS,
  ERROR_MESSAGES,
  STREAMING,
  type RegionMode,
} from "./constants";
