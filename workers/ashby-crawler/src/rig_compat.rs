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

        serde_json::json!({
            "slug": slug,
            "company_name": company_name,
            "industries": Self::detect_industries(slug),
            "tech_signals": Self::detect_tech(slug),
            "size_signal": Self::estimate_size(slug),
            "token_count": tokens.len(),
            "keywords": tokens,
        })
    }

    fn detect_industries(slug: &str) -> Vec<&'static str> {
        let checks: &[(&[&str], &str)] = &[
            (&["ai", "ml", "llm", "deep", "neural", "gpt", "rag"],     "ai-ml"),
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
