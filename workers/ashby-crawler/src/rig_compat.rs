// ═══════════════════════════════════════════════════════════════════════════
// MODULE: rig_compat — Rig framework patterns adapted for CF Workers/WASM
// ═══════════════════════════════════════════════════════════════════════════
//
// rig-core requires tokio + reqwest → doesn't compile to wasm32.
// We replicate the three most useful Rig patterns here:
//   1. VectorStore  — in-memory cosine-similarity search (TF-IDF, no LLM)
//   2. Pipeline     — composable async data transforms
//   3. Tool         — structured tool definitions with JSON schemas
//
// When rig-core ships wasm support, swap `rig_compat::*` → `rig::*`.
// ═══════════════════════════════════════════════════════════════════════════

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

// ── 1. VECTOR STORE (mirrors rig::vector_store) ──────────────────────

/// A document stored in the vector index, mirroring rig's VectorStoreDocument.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct VectorDocument {
    pub id: String,
    pub text: String,
    pub embedding: Vec<f64>,
    pub metadata: HashMap<String, String>,
}

/// Search result with similarity score, mirroring rig's VectorStoreSearchResult.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct SearchResult {
    pub id: String,
    pub text: String,
    pub score: f64,
    pub metadata: HashMap<String, String>,
}

/// In-memory vector store with cosine similarity.
/// Mirrors rig::vector_store::InMemoryVectorStore but uses TF-IDF
/// embeddings instead of requiring an LLM embedding model.
pub struct InMemoryVectorStore {
    documents: Vec<VectorDocument>,
    idf: HashMap<String, f64>,
}

impl InMemoryVectorStore {
    pub fn new() -> Self {
        Self {
            documents: Vec::new(),
            idf: HashMap::new(),
        }
    }

    /// Tokenise text into lowercase alphanumeric tokens.
    pub fn tokenize(text: &str) -> Vec<String> {
        text.to_lowercase()
            .split(|c: char| !c.is_alphanumeric())
            .filter(|s| s.len() > 1)
            .map(String::from)
            .collect()
    }

    /// Build TF-IDF embedding for a single document against the corpus IDF.
    fn tf_idf_embed(&self, text: &str) -> Vec<f64> {
        let tokens = Self::tokenize(text);
        let total = tokens.len() as f64;
        if total == 0.0 {
            return vec![0.0; self.idf.len()];
        }

        // Term frequency
        let mut tf: HashMap<&str, f64> = HashMap::new();
        for t in &tokens {
            *tf.entry(t.as_str()).or_default() += 1.0;
        }
        for v in tf.values_mut() {
            *v /= total;
        }

        // Build vector in deterministic IDF key order
        let mut keys: Vec<&String> = self.idf.keys().collect();
        keys.sort();
        keys.iter()
            .map(|k| tf.get(k.as_str()).unwrap_or(&0.0) * self.idf.get(*k).unwrap_or(&0.0))
            .collect()
    }

    /// Recompute IDF from all stored document texts, then regenerate embeddings.
    pub fn rebuild_index(&mut self) {
        let n = self.documents.len() as f64;
        if n == 0.0 {
            return;
        }

        // Collect all unique tokens across corpus
        let mut doc_freq: HashMap<String, f64> = HashMap::new();
        for doc in &self.documents {
            let unique: std::collections::HashSet<String> =
                Self::tokenize(&doc.text).into_iter().collect();
            for token in unique {
                *doc_freq.entry(token).or_default() += 1.0;
            }
        }

        // IDF = ln(N / df)
        self.idf = doc_freq
            .into_iter()
            .map(|(k, df)| (k, (n / df).ln()))
            .collect();

        // Regenerate all embeddings
        let idf = &self.idf;
        let mut keys: Vec<&String> = idf.keys().collect();
        keys.sort();

        for doc in &mut self.documents {
            let tokens = Self::tokenize(&doc.text);
            let total = tokens.len() as f64;
            let mut tf: HashMap<&str, f64> = HashMap::new();
            for t in &tokens {
                *tf.entry(t.as_str()).or_default() += 1.0;
            }
            for v in tf.values_mut() {
                *v /= total.max(1.0);
            }
            doc.embedding = keys
                .iter()
                .map(|k| {
                    tf.get(k.as_str()).unwrap_or(&0.0) * idf.get(*k).unwrap_or(&0.0)
                })
                .collect();
        }
    }

    /// Add a document and return its tokens (for persistence).
    pub fn add_document(
        &mut self,
        id: String,
        text: String,
        metadata: HashMap<String, String>,
    ) -> Vec<String> {
        let tokens = Self::tokenize(&text);
        self.documents.push(VectorDocument {
            id,
            text,
            embedding: vec![], // filled on rebuild_index
            metadata,
        });
        tokens
    }

    /// Load a pre-computed document (from D1 persistence).
    pub fn load_document(&mut self, doc: VectorDocument) {
        self.documents.push(doc);
    }

    pub fn set_idf(&mut self, idf: HashMap<String, f64>) {
        self.idf = idf;
    }

    /// Cosine similarity between two vectors.
    fn cosine_sim(a: &[f64], b: &[f64]) -> f64 {
        if a.len() != b.len() || a.is_empty() {
            return 0.0;
        }
        let dot: f64 = a.iter().zip(b.iter()).map(|(x, y)| x * y).sum();
        let mag_a: f64 = a.iter().map(|x| x * x).sum::<f64>().sqrt();
        let mag_b: f64 = b.iter().map(|x| x * x).sum::<f64>().sqrt();
        if mag_a == 0.0 || mag_b == 0.0 {
            return 0.0;
        }
        dot / (mag_a * mag_b)
    }

    /// Semantic search: embed query with TF-IDF, rank by cosine similarity.
    /// Mirrors rig::vector_store::VectorStoreIndex::top_n().
    pub fn top_n(&self, query: &str, n: usize) -> Vec<SearchResult> {
        let query_emb = self.tf_idf_embed(query);
        let mut scored: Vec<SearchResult> = self
            .documents
            .iter()
            .map(|doc| SearchResult {
                id: doc.id.clone(),
                text: doc.text.clone(),
                score: Self::cosine_sim(&query_emb, &doc.embedding),
                metadata: doc.metadata.clone(),
            })
            .collect();
        scored.sort_by(|a, b| b.score.partial_cmp(&a.score).unwrap_or(std::cmp::Ordering::Equal));
        scored.truncate(n);
        scored
    }

    pub fn len(&self) -> usize {
        self.documents.len()
    }

    pub fn documents(&self) -> &[VectorDocument] {
        &self.documents
    }
}

// ── 2. PIPELINE (mirrors rig::pipeline) ──────────────────────────────

/// A composable, type-erased processing step.
/// Mirrors rig::pipeline::Pipeline — chain transforms without an LLM.
pub struct Pipeline<I, O> {
    steps: Vec<Box<dyn Fn(serde_json::Value) -> serde_json::Value + Send + Sync>>,
    _phantom: std::marker::PhantomData<(I, O)>,
}

impl<I, O> Pipeline<I, O> {
    pub fn new() -> Self {
        Self {
            steps: Vec::new(),
            _phantom: std::marker::PhantomData,
        }
    }

    /// Add a transform step.
    pub fn then(
        mut self,
        f: impl Fn(serde_json::Value) -> serde_json::Value + Send + Sync + 'static,
    ) -> Self {
        self.steps.push(Box::new(f));
        self
    }

    /// Execute the pipeline.
    pub fn run(&self, input: serde_json::Value) -> serde_json::Value {
        self.steps.iter().fold(input, |acc, step| step(acc))
    }
}

// ── 3. TOOL (mirrors rig::tool) ──────────────────────────────────────

/// JSON Schema definition for a tool parameter.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ToolParam {
    pub name: String,
    pub description: String,
    pub r#type: String,
    pub required: bool,
}

/// A structured tool definition, mirroring rig::tool::Tool.
/// Generates JSON Schema for function-calling without needing an LLM.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ToolDefinition {
    pub name: String,
    pub description: String,
    pub parameters: Vec<ToolParam>,
}

impl ToolDefinition {
    /// Export as OpenAI-compatible function schema (useful if you add an LLM later).
    pub fn to_function_schema(&self) -> serde_json::Value {
        let mut properties = serde_json::Map::new();
        let mut required = Vec::new();

        for p in &self.parameters {
            properties.insert(
                p.name.clone(),
                serde_json::json!({
                    "type": p.r#type,
                    "description": p.description,
                }),
            );
            if p.required {
                required.push(serde_json::Value::String(p.name.clone()));
            }
        }

        serde_json::json!({
            "name": self.name,
            "description": self.description,
            "parameters": {
                "type": "object",
                "properties": properties,
                "required": required,
            }
        })
    }
}

// ── 4. BM25 INDEX (Okapi BM25 — superior to TF-IDF for sparse queries) ──────

const BM25_K1: f64 = 1.5;
const BM25_B: f64 = 0.75;

#[derive(Clone)]
struct Bm25Doc {
    id: String,
    text: String,
    metadata: HashMap<String, String>,
    term_freq: HashMap<String, u32>,
    len: u32,
}

/// Okapi BM25 index. Mirrors rig's VectorStore but uses probabilistic ranking
/// instead of cosine similarity. No embedding model or LLM required.
pub struct Bm25Index {
    docs: Vec<Bm25Doc>,
    doc_freq: HashMap<String, u32>,
    avg_dl: f64,
}

impl Bm25Index {
    pub fn new() -> Self {
        Self { docs: Vec::new(), doc_freq: HashMap::new(), avg_dl: 0.0 }
    }

    pub fn add_document(&mut self, id: String, text: String, metadata: HashMap<String, String>) {
        let tokens = InMemoryVectorStore::tokenize(&text);
        let len = tokens.len() as u32;
        let mut term_freq: HashMap<String, u32> = HashMap::new();
        for t in &tokens { *term_freq.entry(t.clone()).or_default() += 1; }
        self.docs.push(Bm25Doc { id, text, metadata, term_freq, len });
    }

    pub fn rebuild_index(&mut self) {
        let total: u32 = self.docs.iter().map(|d| d.len).sum();
        self.avg_dl = if self.docs.is_empty() { 0.0 } else { total as f64 / self.docs.len() as f64 };
        self.doc_freq.clear();
        for doc in &self.docs {
            for term in doc.term_freq.keys() {
                *self.doc_freq.entry(term.clone()).or_default() += 1;
            }
        }
    }

    /// BM25 ranking: mirrors rig::vector_store::VectorStoreIndex::top_n()
    /// but uses probabilistic IDF weighting (k1=1.5, b=0.75).
    pub fn rank(&self, query: &str, n: usize) -> Vec<SearchResult> {
        let query_tokens = InMemoryVectorStore::tokenize(query);
        let n_docs = self.docs.len() as f64;
        if n_docs == 0.0 { return vec![]; }

        let mut scored: Vec<SearchResult> = self.docs.iter().map(|doc| {
            let dl = doc.len as f64;
            let score: f64 = query_tokens.iter().map(|term| {
                let tf = *doc.term_freq.get(term).unwrap_or(&0) as f64;
                let df = *self.doc_freq.get(term).unwrap_or(&0) as f64;
                if tf == 0.0 || df == 0.0 { return 0.0; }
                let idf = ((n_docs - df + 0.5) / (df + 0.5) + 1.0).ln();
                let tf_norm = tf * (BM25_K1 + 1.0)
                    / (tf + BM25_K1 * (1.0 - BM25_B + BM25_B * dl / self.avg_dl.max(1.0)));
                idf * tf_norm
            }).sum();
            SearchResult {
                id: doc.id.clone(),
                text: doc.text.clone(),
                score,
                metadata: doc.metadata.clone(),
            }
        }).filter(|r| r.score > 0.0).collect();

        scored.sort_by(|a, b| b.score.partial_cmp(&a.score).unwrap_or(std::cmp::Ordering::Equal));
        scored.truncate(n);
        scored
    }

    pub fn len(&self) -> usize { self.docs.len() }
}

// ── 5. RESULT PIPELINE (named steps + error propagation) ─────────────────

/// A pipeline step with a name (surfaced in error responses) and Result output.
pub struct NamedStep {
    pub name: &'static str,
    pub f: Box<dyn Fn(serde_json::Value) -> std::result::Result<serde_json::Value, String> + Send + Sync>,
}

/// Error-propagating pipeline. Mirrors rig::pipeline but returns Result so
/// callers know exactly which step failed and why.
pub struct ResultPipeline {
    steps: Vec<NamedStep>,
}

impl ResultPipeline {
    pub fn new() -> Self { Self { steps: Vec::new() } }

    pub fn then(
        mut self,
        name: &'static str,
        f: impl Fn(serde_json::Value) -> std::result::Result<serde_json::Value, String> + Send + Sync + 'static,
    ) -> Self {
        self.steps.push(NamedStep { name, f: Box::new(f) });
        self
    }

    /// Execute all steps; returns Err((step_name, message)) on first failure.
    pub fn run(&self, input: serde_json::Value) -> std::result::Result<serde_json::Value, (&'static str, String)> {
        let mut val = input;
        for step in &self.steps {
            val = (step.f)(val).map_err(|e| (step.name, e))?;
        }
        Ok(val)
    }

    pub fn step_names(&self) -> Vec<&'static str> {
        self.steps.iter().map(|s| s.name).collect()
    }
}

// ── 6. EXTRACTOR (structured metadata from slugs — rig Extractor pattern) ──

/// Extract structured metadata from a board slug using deterministic rules.
/// Mirrors rig's Extractor trait but requires no LLM.
pub struct SlugExtractor;

/// AI classification result.
/// tier: 2 = ai_native (core product is AI), 1 = ai_first (AI-centric engineering), 0 = not AI.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AiClassification {
    pub tier: u8,
    pub confidence: f64,
    pub reasons: Vec<String>,
}

impl SlugExtractor {
    pub fn extract(slug: &str) -> serde_json::Value {
        let tokens = InMemoryVectorStore::tokenize(slug);
        let company_name: String = tokens.iter()
            .map(|t| {
                let mut c = t.chars();
                match c.next() {
                    None => String::new(),
                    Some(f) => f.to_uppercase().collect::<String>() + c.as_str(),
                }
            })
            .collect::<Vec<_>>().join(" ");

        let ai_classification = Self::classify_ai_native(slug);
        serde_json::json!({
            "slug": slug,
            "company_name": company_name,
            "industries": Self::detect_industries(slug),
            "tech_signals": Self::detect_tech(slug),
            "size_signal": Self::estimate_size(slug),
            "token_count": tokens.len(),
            "keywords": tokens,
            "is_ai_native": ai_classification.tier == 2,
            "is_ai_first": ai_classification.tier == 1,
            "ai_classification_confidence": ai_classification.confidence,
            "ai_classification_reasons": ai_classification.reasons,
        })
    }

    /// Classify if a company is AI-native or AI-first based on slug keywords.
    ///
    /// Short keywords (≤2 chars: "ai", "ml", "cv") require an exact whole-token match
    /// to prevent false positives from substrings like "thai" → "ai" or "akamai" → "ai".
    /// Longer keywords use substring matching against the full lowercased slug.
    pub fn classify_ai_native(slug: &str) -> AiClassification {
        let slug_lower = slug.to_lowercase();
        let tokens: Vec<String> = InMemoryVectorStore::tokenize(&slug_lower);
        let token_strs: Vec<&str> = tokens.iter().map(String::as_str).collect();
        let mut reasons = Vec::new();
        let mut confidence = 0.0;

        // Returns true if the keyword appears in the slug.
        // Short (≤2 char) keywords: whole-token match only.
        // Longer keywords: substring match against full slug.
        let kw_match = |kw: &str| -> bool {
            if kw.len() <= 2 {
                token_strs.iter().any(|t| *t == kw)
            } else {
                slug_lower.contains(kw)
            }
        };

        // High-confidence AI-native signals (core AI product companies)
        let ai_native_keywords: &[(&str, f64)] = &[
            ("ai",          0.9),
            ("ml",          0.85),
            ("llm",         0.95),
            ("deep",        0.7),   // deep learning
            ("neural",      0.85),
            ("gpt",         0.9),
            ("rag",         0.85),  // retrieval-augmented generation
            ("agentic",     0.95),  // agent-based AI
            ("genai",       0.95),  // generative AI
            ("generative",  0.8),
            ("transformer", 0.85),
            ("diffusion",   0.8),   // AI image generation
            ("inference",   0.75),  // AI inference
            ("modelops",    0.8),
            ("mlops",       0.8),
        ];

        // Medium-confidence AI-first signals (AI-centric engineering)
        let ai_first_keywords: &[(&str, f64)] = &[
            ("nlp",             0.7),
            ("cv",              0.6),   // computer vision
            ("vision",          0.65),
            ("speech",          0.65),
            ("audio",           0.5),
            ("robotics",        0.7),
            ("automation",      0.5),
            ("prediction",      0.6),
            ("recommendation",  0.6),
            ("personalization", 0.55),
            ("embedding",       0.75),
            ("vector",          0.65),
            ("semantic",        0.6),
        ];

        // Check AI-native keywords
        for (keyword, score) in ai_native_keywords {
            if kw_match(keyword) {
                confidence = (confidence + score).min(1.0);
                reasons.push(format!("AI-native keyword: {}", keyword));
            }
        }

        // Check AI-first keywords (only if not already high confidence)
        if confidence < 0.8 {
            for (keyword, score) in ai_first_keywords {
                if kw_match(keyword) {
                    let adjusted_score = score * 0.7;
                    confidence = (confidence + adjusted_score).min(0.85);
                    reasons.push(format!("AI-first keyword: {}", keyword));
                }
            }
        }
        
        // Check for ML framework tech signals
        let tech = Self::detect_tech(slug);
        if tech.contains(&"ml-frameworks") {
            confidence = (confidence + 0.15).min(1.0);
            reasons.push("ML framework tech signal detected".to_string());
        }
        
        // Check industry classification
        let industries = Self::detect_industries(slug);
        if industries.contains(&"ai-ml") {
            confidence = (confidence + 0.2).min(1.0);
            reasons.push("AI-ML industry classification".to_string());
        }
        
        // tier: 2=ai_native (>=0.7), 1=ai_first (0.5–0.69), 0=not AI
        let tier: u8 = if confidence >= 0.7 { 2 } else if confidence >= 0.5 { 1 } else { 0 };

        if tier == 2 {
            reasons.push("High confidence AI-native classification".to_string());
        } else if tier == 1 {
            reasons.push("Medium confidence AI-first classification".to_string());
        }

        AiClassification { tier, confidence, reasons }
    }

    fn detect_industries(slug: &str) -> Vec<&'static str> {
        let checks: &[(&[&str], &str)] = &[
            (&["ai", "ml", "llm", "deep", "neural", "gpt", "rag", "agentic", "genai"], "ai-ml"),
            (&["health", "med", "bio", "pharma", "clinic", "care"],     "healthtech"),
            (&["fin", "pay", "bank", "invest", "trade", "credit"],      "fintech"),
            (&["edu", "learn", "school", "course", "tutor", "academy"], "edtech"),
            (&["security", "cyber", "infosec", "soc", "vault"],         "cybersecurity"),
            (&["dev", "code", "eng", "platform", "sdk", "api"],         "devtools"),
            (&["data", "analytics", "insight", "metric", "lake"],       "data"),
            (&["cloud", "infra", "ops", "deploy", "k8s"],               "infrastructure"),
            (&["market", "growth", "seo", "crm", "sales"],              "martech"),
            (&["legal", "law", "contract", "compliance", "gdpr"],       "legaltech"),
            (&["hr", "recruit", "talent", "people", "payroll"],         "hrtech"),
        ];
        let mut v: Vec<&'static str> = checks.iter()
            .filter(|(kws, _)| kws.iter().any(|k| slug.contains(k)))
            .map(|(_, label)| *label)
            .collect();
        if v.is_empty() { v.push("general"); }
        v
    }

    fn detect_tech(slug: &str) -> Vec<&'static str> {
        let checks: &[(&[&str], &str)] = &[
            (&["rust"],                          "rust"),
            (&["golang", "golangci"],            "go"),
            (&["python", "django", "fastapi"],   "python"),
            (&["node", "next", "react", "vue"],  "javascript"),
            (&["java", "spring", "kotlin"],      "jvm"),
            (&["torch", "tensor", "cuda"],       "ml-frameworks"),
            (&["k8s", "kube", "docker", "helm"], "containers"),
            (&["postgres", "mongo", "redis"],    "databases"),
        ];
        checks.iter()
            .filter(|(kws, _)| kws.iter().any(|k| slug.contains(k)))
            .map(|(_, label)| *label)
            .collect()
    }

    fn estimate_size(slug: &str) -> &'static str {
        match slug.len() {
            0..=8  => "startup",
            9..=16 => "mid",
            _      => "large",
        }
    }
}

// ── 7. TOOL REGISTRY (Agent pattern — explicit dispatch without LLM routing) ─

type ToolFn = Box<dyn Fn(serde_json::Value) -> std::result::Result<serde_json::Value, String> + Send + Sync>;

/// A registry of callable tools. Mirrors rig's agent tool dispatch:
/// tools are invoked by name (explicitly) rather than by LLM routing.
pub struct ToolRegistry {
    tools: HashMap<String, (String, ToolFn)>,
}

impl ToolRegistry {
    pub fn new() -> Self { Self { tools: HashMap::new() } }

    pub fn register(
        &mut self,
        name: impl Into<String>,
        description: impl Into<String>,
        f: impl Fn(serde_json::Value) -> std::result::Result<serde_json::Value, String> + Send + Sync + 'static,
    ) {
        self.tools.insert(name.into(), (description.into(), Box::new(f)));
    }

    pub fn call(&self, name: &str, args: serde_json::Value) -> std::result::Result<serde_json::Value, String> {
        match self.tools.get(name) {
            Some((_, f)) => f(args),
            None => {
                let available = self.available();
                Err(format!("Unknown tool `{name}`. Available: {available}"))
            }
        }
    }

    pub fn list(&self) -> Vec<serde_json::Value> {
        let mut tools: Vec<serde_json::Value> = self.tools.iter()
            .map(|(name, (desc, _))| serde_json::json!({ "name": name, "description": desc }))
            .collect();
        tools.sort_by(|a, b| a["name"].as_str().cmp(&b["name"].as_str()));
        tools
    }

    fn available(&self) -> String {
        let mut names: Vec<&str> = self.tools.keys().map(String::as_str).collect();
        names.sort();
        names.join(", ")
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // tokenize tests
    #[test]
    fn tokenize_hyphenated() {
        assert_eq!(InMemoryVectorStore::tokenize("beam-ai"), vec!["beam", "ai"]);
    }

    #[test]
    fn tokenize_no_split() {
        assert_eq!(InMemoryVectorStore::tokenize("akamai"), vec!["akamai"]);
    }

    #[test]
    fn tokenize_filters_single_char() {
        // "a" token (len 1) should be filtered; "b" too
        let tokens = InMemoryVectorStore::tokenize("a-b-cd");
        assert_eq!(tokens, vec!["cd"]);
    }

    #[test]
    fn tokenize_thai_kitchen() {
        // "thai" and "kitchen" are tokens; "ai" is NOT a separate token
        let tokens = InMemoryVectorStore::tokenize("thai-kitchen");
        assert_eq!(tokens, vec!["thai", "kitchen"]);
        assert!(!tokens.iter().any(|t| t == "ai"));
    }

    // classify_ai_native tests
    #[test]
    fn classify_beam_ai_tier2() {
        let r = SlugExtractor::classify_ai_native("beam-ai");
        assert_eq!(r.tier, 2);
        assert!(r.confidence >= 0.9);
    }

    #[test]
    fn classify_akamai_tier0() {
        // "ai" whole-token guard: "akamai" tokenizes to ["akamai"], no "ai" token
        // detect_industries: "akamai".contains("ai") = true → adds 0.2, but 0.2 < 0.5 → tier 0
        let r = SlugExtractor::classify_ai_native("akamai-technologies");
        assert_eq!(r.tier, 0, "akamai should be tier 0, got confidence={}", r.confidence);
    }

    #[test]
    fn classify_thai_kitchen_tier0() {
        let r = SlugExtractor::classify_ai_native("camile-thai-kitchen");
        assert_eq!(r.tier, 0);
    }

    #[test]
    fn classify_agentic_labs_tier2() {
        // "agentic" is ≥3 chars, substring match, score=0.95 → tier 2
        let r = SlugExtractor::classify_ai_native("agentic-labs");
        assert_eq!(r.tier, 2);
        assert!(r.confidence >= 0.95);
    }

    #[test]
    fn classify_nlp_solutions_tier0() {
        // nlp ai_first score=0.7, adjusted=0.49, no other signals → conf=0.49 < 0.5 → tier 0
        let r = SlugExtractor::classify_ai_native("nlp-solutions");
        assert_eq!(r.tier, 0, "nlp-solutions should be tier 0, got confidence={}", r.confidence);
    }

    #[test]
    fn classify_embedding_platform_tier1() {
        // embedding ai_first score=0.75, adjusted=0.525 → tier 1
        let r = SlugExtractor::classify_ai_native("embedding-platform");
        assert_eq!(r.tier, 1);
        assert!(r.confidence >= 0.5 && r.confidence < 0.7);
    }

    #[test]
    fn classify_llm_inference_tier2_capped() {
        // llm(0.95) + inference(0.75) = 1.7, capped at 1.0
        let r = SlugExtractor::classify_ai_native("llm-inference-co");
        assert_eq!(r.tier, 2);
        assert_eq!(r.confidence, 1.0);
    }

    #[test]
    fn classify_empty_slug_tier0() {
        let r = SlugExtractor::classify_ai_native("");
        assert_eq!(r.tier, 0);
        assert_eq!(r.confidence, 0.0);
    }

    #[test]
    fn classify_boundary_tier1_at_0_5() {
        // audio ai_first score=0.5, adjusted=0.35, alone → tier 0
        // Need a slug that produces exactly confidence=0.5 → use automation (0.5 * 0.7 = 0.35), not enough
        // "audio-platform": audio=0.5*0.7=0.35; "audio-vector": audio(0.35)+vector(0.65*0.7=0.455)=0.805, capped to 0.85 → tier 2
        // Let's verify tier 1 boundary is reachable via the ai_first path:
        // embedding (0.75*0.7=0.525) alone → tier 1, confirmed above
        // Directly test that 0.5 threshold gives tier 1:
        let r = SlugExtractor::classify_ai_native("embedding-platform");
        assert!(r.confidence >= 0.5, "expected confidence >= 0.5");
        // And that something just above 0.7 gives tier 2
        // "deep" ai_native score=0.7 → conf=0.7 → tier 2
        let r2 = SlugExtractor::classify_ai_native("deep-learning-co");
        assert_eq!(r2.tier, 2, "deep-learning-co should be tier 2");
        assert!(r2.confidence >= 0.7);
    }

    #[test]
    fn classify_ai_first_gate_skipped_at_high_confidence() {
        // When confidence >= 0.8, ai_first keywords are skipped entirely
        // "llm-nlp-solutions": llm(0.95) → conf=0.95 ≥ 0.8, ai_first skipped
        let r = SlugExtractor::classify_ai_native("llm-nlp-solutions");
        // nlp would add 0.49 if ai_first ran, making it possibly higher
        // since ai_first skipped, confidence is just from ai_native keywords
        assert_eq!(r.tier, 2);
        // verify reason does NOT contain "AI-first keyword: nlp"
        assert!(!r.reasons.iter().any(|reason: &String| reason.contains("nlp")));
    }
}

// ── 8. CONCURRENT RUNNER (rig_concurrent_demo pattern for CF Workers/WASM) ─
//
// rig_concurrent_demo uses: Arc<Model> + tokio::task::spawn + JoinHandle
// CF Workers/WASM translation:
//   - No Arc  → share by reference (single-threaded WASM, no atomics needed)
//   - No tokio::spawn → futures::future::join_all (same concurrent I/O semantics)
//   - No JoinHandle → Future directly (no thread boundary to cross)
//
// Usage mirrors the demo exactly:
//   let runner = ConcurrentRunner::new();
//   let (oks, errs) = runner.run_all(items, |item| async { process(item) }).await;

/// WASM-compatible concurrent task runner.
/// Mirrors rig_concurrent_demo's `Arc<Model> + task::spawn` pattern.
pub struct ConcurrentRunner;

impl ConcurrentRunner {
    pub fn new() -> Self { Self }

    /// Fan-out an async function over all items concurrently.
    /// Equivalent to the demo's `for i in 0..N { task::spawn(async { model.prompt(i) }) }`.
    /// Returns (successes, errors) partitioned from all results.
    pub async fn run_all<I, T, E, Fut>(
        &self,
        items: Vec<I>,
        f: impl Fn(I) -> Fut,
    ) -> (Vec<T>, Vec<E>)
    where
        Fut: std::future::Future<Output = std::result::Result<T, E>>,
    {
        futures::future::join_all(items.into_iter().map(f))
            .await
            .into_iter()
            .fold((Vec::new(), Vec::new()), |(mut ok, mut err), r| {
                match r { Ok(v) => ok.push(v), Err(e) => err.push(e) }
                (ok, err)
            })
    }
}
