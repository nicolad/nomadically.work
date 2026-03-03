/**
 * TypeScript port of workers/ashby-crawler/src/rig_compat.rs
 * `InMemoryVectorStore::classify_ai_native` + `tokenize`.
 *
 * Kept in sync with the Rust implementation for cross-language parity testing.
 */

export interface AiClassification {
  tier: 0 | 1 | 2;
  confidence: number;
  reasons: string[];
}

/** Mirror of Rust tokenize: lowercase, split on non-alphanumeric, keep len > 1 */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((s) => s.length > 1);
}

/** Mirror of Rust kw_match: whole-token for ≤2 chars, substring for ≥3 chars */
function kwMatch(kw: string, tokens: string[], slugLower: string): boolean {
  if (kw.length <= 2) {
    return tokens.includes(kw);
  }
  return slugLower.includes(kw);
}

const AI_NATIVE_KEYWORDS: [string, number][] = [
  ["ai",          0.9],
  ["ml",          0.85],
  ["llm",         0.95],
  ["deep",        0.7],
  ["neural",      0.85],
  ["gpt",         0.9],
  ["rag",         0.85],
  ["agentic",     0.95],
  ["genai",       0.95],
  ["generative",  0.8],
  ["transformer", 0.85],
  ["diffusion",   0.8],
  ["inference",   0.75],
  ["modelops",    0.8],
  ["mlops",       0.8],
];

const AI_FIRST_KEYWORDS: [string, number][] = [
  ["nlp",             0.7],
  ["cv",              0.6],
  ["vision",          0.65],
  ["speech",          0.65],
  ["audio",           0.5],
  ["robotics",        0.7],
  ["automation",      0.5],
  ["prediction",      0.6],
  ["recommendation",  0.6],
  ["personalization", 0.55],
  ["embedding",       0.75],
  ["vector",          0.65],
  ["semantic",        0.6],
];

const AI_ML_INDUSTRY_KEYWORDS = ["ai", "ml", "llm", "deep", "neural", "gpt", "rag", "agentic", "genai"];
const ML_FRAMEWORK_KEYWORDS = ["torch", "tensor", "cuda"];

function detectIndustries(slug: string): string[] {
  // Uses raw substring matching (not tokenized) — mirrors Rust detect_industries
  const found: string[] = [];
  if (AI_ML_INDUSTRY_KEYWORDS.some((k) => slug.includes(k))) found.push("ai-ml");
  if (["health", "med", "bio", "pharma", "clinic", "care"].some((k) => slug.includes(k))) found.push("healthtech");
  if (["fin", "pay", "bank", "invest", "trade", "credit"].some((k) => slug.includes(k))) found.push("fintech");
  // add others as needed for completeness
  return found.length > 0 ? found : ["general"];
}

function detectTech(slug: string): string[] {
  const found: string[] = [];
  if (ML_FRAMEWORK_KEYWORDS.some((k) => slug.includes(k))) found.push("ml-frameworks");
  return found;
}

export function classifyAiNative(slug: string): AiClassification {
  const slugLower = slug.toLowerCase();
  const tokens = tokenize(slugLower);
  const reasons: string[] = [];
  let confidence = 0.0;

  // AI-native keywords
  for (const [keyword, score] of AI_NATIVE_KEYWORDS) {
    if (kwMatch(keyword, tokens, slugLower)) {
      confidence = Math.min(confidence + score, 1.0);
      reasons.push(`AI-native keyword: ${keyword}`);
    }
  }

  // AI-first keywords (only if not already high confidence)
  if (confidence < 0.8) {
    for (const [keyword, score] of AI_FIRST_KEYWORDS) {
      if (kwMatch(keyword, tokens, slugLower)) {
        const adjustedScore = score * 0.7;
        confidence = Math.min(confidence + adjustedScore, 0.85);
        reasons.push(`AI-first keyword: ${keyword}`);
      }
    }
  }

  // Secondary signals
  const tech = detectTech(slugLower);
  if (tech.includes("ml-frameworks")) {
    confidence = Math.min(confidence + 0.15, 1.0);
    reasons.push("ML framework tech signal detected");
  }

  const industries = detectIndustries(slugLower);
  if (industries.includes("ai-ml")) {
    confidence = Math.min(confidence + 0.2, 1.0);
    reasons.push("AI-ML industry classification");
  }

  const tier: 0 | 1 | 2 = confidence >= 0.7 ? 2 : confidence >= 0.5 ? 1 : 0;

  if (tier === 2) reasons.push("High confidence AI-native classification");
  else if (tier === 1) reasons.push("Medium confidence AI-first classification");

  return { tier, confidence, reasons };
}
