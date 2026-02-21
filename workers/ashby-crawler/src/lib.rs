use futures::future::{join, join_all};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use worker::*;
use worker::wasm_bindgen::JsValue;

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

mod rig_compat {
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

    /// Extract structured metadata from an Ashby board slug using deterministic rules.
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
}

// ═══════════════════════════════════════════════════════════════════════════
// CORE TYPES
// ═══════════════════════════════════════════════════════════════════════════

#[derive(Deserialize, Debug, Clone)]
struct CdxRecord {
    url: String,
    timestamp: String,
    #[serde(default)]
    status: Option<String>,
    #[serde(default)]
    mime: Option<String>,
    #[serde(default, rename = "mime-detected")]
    mime_detected: Option<String>,
    #[serde(default)]
    filename: Option<String>,
    #[serde(default)]
    offset: Option<String>,
    #[serde(default)]
    length: Option<String>,
}

#[derive(Serialize, Debug, Clone)]
struct AshbyBoard {
    slug: String,
    url: String,
    timestamp: String,
    crawl_id: String,
    status: Option<String>,
    mime: Option<String>,
    warc_file: Option<String>,
    warc_offset: Option<u64>,
    warc_length: Option<u64>,
}

// ── Ashby Posting API types ──────────────────────────────────────────────────

#[derive(Deserialize, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct AshbyApiAddress {
    #[serde(default)]
    postal_address: Option<serde_json::Value>,
}

#[derive(Deserialize, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct AshbyApiSecondaryLocation {
    #[serde(default)]
    location: Option<String>,
    #[serde(default)]
    address: Option<AshbyApiAddress>,
}

#[derive(Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
struct AshbyJobPosting {
    id: String,
    title: String,
    #[serde(default)]
    location: Option<String>,
    #[serde(default)]
    location_name: Option<String>,
    #[serde(default)]
    description_html: Option<String>,
    #[serde(default)]
    description_plain: Option<String>,
    #[serde(default)]
    job_url: Option<String>,
    #[serde(default)]
    apply_url: Option<String>,
    #[serde(default)]
    is_remote: Option<bool>,
    #[serde(default)]
    is_listed: Option<bool>,
    #[serde(default)]
    employment_type: Option<String>,
    #[serde(default)]
    department: Option<String>,
    #[serde(default)]
    team: Option<String>,
    #[serde(default)]
    published_at: Option<String>,
    #[serde(default)]
    secondary_locations: Option<Vec<AshbyApiSecondaryLocation>>,
    #[serde(default)]
    compensation: Option<serde_json::Value>,
    #[serde(default)]
    address: Option<serde_json::Value>,
}

#[derive(Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
struct AshbyJobBoardResponse {
    #[serde(default)]
    title: Option<String>,
    #[serde(default)]
    jobs: Vec<AshbyJobPosting>,
}

#[derive(Serialize)]
struct ApiResponse<T: Serialize> {
    ok: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    data: Option<T>,
    #[serde(skip_serializing_if = "Option::is_none")]
    error: Option<String>,
}

impl<T: Serialize> ApiResponse<T> {
    fn success(data: T) -> Self {
        Self { ok: true, data: Some(data), error: None }
    }
}

fn error_response(msg: &str) -> Result<Response> {
    Response::from_json(&ApiResponse::<()> {
        ok: false,
        data: None,
        error: Some(msg.to_string()),
    })
}

// ═══════════════════════════════════════════════════════════════════════════
// COMMON CRAWL HELPERS
// ═══════════════════════════════════════════════════════════════════════════

fn extract_slug(url: &str) -> Option<String> {
    let url = url.trim_end_matches('/');
    let prefix = "jobs.ashbyhq.com/";
    let idx = url.find(prefix)?;
    let after = &url[idx + prefix.len()..];
    let slug = after.split('/').next().unwrap_or("");
    if slug.is_empty()
        || slug.starts_with('?')
        || slug.starts_with('#')
        || matches!(slug, "api" | "static" | "favicon.ico" | "robots.txt" | "sitemap.xml")
    {
        return None;
    }
    Some(slug.to_lowercase())
}

async fn list_cc_indexes() -> Result<Vec<String>> {
    let req = Request::new("https://index.commoncrawl.org/collinfo.json", Method::Get)?;
    let mut resp = Fetch::Request(req).send().await?;
    let text = resp.text().await?;
    #[derive(Deserialize)]
    struct C { id: String }
    let infos: Vec<C> = serde_json::from_str(&text)
        .map_err(|e| Error::RustError(format!("collinfo parse: {e}")))?;
    Ok(infos.into_iter().map(|i| i.id).collect())
}

async fn get_num_pages(crawl_id: &str) -> Result<u32> {
    let url = format!(
        "https://index.commoncrawl.org/{crawl_id}-index?\
         url=jobs.ashbyhq.com%2F*&output=json&showNumPages=true"
    );
    let mut resp = Fetch::Request(Request::new(&url, Method::Get)?).send().await?;
    let text = resp.text().await?;
    #[derive(Deserialize)]
    struct P { pages: u32 }
    let info: P = serde_json::from_str(&text)
        .map_err(|e| Error::RustError(format!("pageinfo: {e}")))?;
    Ok(info.pages)
}

async fn fetch_cdx_page(crawl_id: &str, page: u32) -> Result<Vec<AshbyBoard>> {
    let url = format!(
        "https://index.commoncrawl.org/{crawl_id}-index?\
         url=jobs.ashbyhq.com%2F*&output=json&filter=statuscode:200&pageSize=100&page={page}"
    );
    let mut resp = Fetch::Request(Request::new(&url, Method::Get)?).send().await?;
    let status = resp.status_code();
    let text = resp.text().await?;
    console_log!("[cdx] page {} status={} body_len={} first_100={}", page, status, text.len(), &text[..text.len().min(100)]);

    let mut parse_errors = 0u32;
    let records: Vec<CdxRecord> = text
        .lines()
        .filter(|l| !l.trim().is_empty())
        .filter_map(|l| {
            match serde_json::from_str::<CdxRecord>(l) {
                Ok(r) => Some(r),
                Err(e) => {
                    if parse_errors < 3 {
                        console_log!("[cdx] parse error: {} on line: {}", e, &l[..l.len().min(200)]);
                    }
                    parse_errors += 1;
                    None
                }
            }
        })
        .collect();

    console_log!("[cdx] parsed {} records, {} errors from {} lines", records.len(), parse_errors, text.lines().count());

    let mut map = HashMap::<String, AshbyBoard>::new();
    for r in records {
        if let Some(slug) = extract_slug(&r.url) {
            let board = AshbyBoard {
                slug: slug.clone(),
                url: r.url,
                timestamp: r.timestamp.clone(),
                crawl_id: crawl_id.to_string(),
                status: r.status,
                mime: r.mime.or(r.mime_detected),
                warc_file: r.filename,
                warc_offset: r.offset.as_deref().and_then(|s| s.parse().ok()),
                warc_length: r.length.as_deref().and_then(|s| s.parse().ok()),
            };
            map.entry(slug)
                .and_modify(|e| {
                    if r.timestamp > e.timestamp {
                        *e = board.clone();
                    }
                })
                .or_insert(board);
        }
    }
    Ok(map.into_values().collect())
}

// ── Ashby Posting API fetch ───────────────────────────────────────────────

/// Fetch all job postings from a single Ashby job board.
/// Returns an empty board (not an error) on 404 — board may be inactive.
async fn fetch_ashby_board_jobs(slug: &str) -> Result<AshbyJobBoardResponse> {
    let url = format!(
        "https://api.ashbyhq.com/posting-api/job-board/{}?includeCompensation=true",
        slug
    );
    let mut resp = Fetch::Request(Request::new(&url, Method::Get)?).send().await?;
    let status = resp.status_code();
    if status == 404 {
        console_log!("[job-sync] board '{}' returned 404 — skipping", slug);
        return Ok(AshbyJobBoardResponse { title: None, jobs: vec![] });
    }
    if status != 200 {
        return Err(Error::RustError(format!(
            "Ashby API returned {} for board '{}'", status, slug
        )));
    }
    let text = resp.text().await?;
    serde_json::from_str::<AshbyJobBoardResponse>(&text)
        .map_err(|e| Error::RustError(format!("ashby board parse error for '{}': {}", slug, e)))
}

// ═══════════════════════════════════════════════════════════════════════════
// MIGRATIONS — applied automatically on first request after deploy
// ═══════════════════════════════════════════════════════════════════════════

/// Ordered list of migrations. Each entry is (name, sql).
/// D1 does not support multi-statement batches in `prepare`, so statements
/// within a migration are split on `;` and executed individually.
/// ALTER TABLE errors (column already exists) are ignored so re-runs are safe.
const MIGRATIONS: &[(&str, &str)] = &[
    ("0002_enrichment", "
        ALTER TABLE ashby_boards ADD COLUMN company_name  TEXT;
        ALTER TABLE ashby_boards ADD COLUMN industry_tags TEXT;
        ALTER TABLE ashby_boards ADD COLUMN tech_signals  TEXT;
        ALTER TABLE ashby_boards ADD COLUMN enriched_at   TEXT;
        CREATE INDEX IF NOT EXISTS idx_boards_company  ON ashby_boards(company_name);
        CREATE INDEX IF NOT EXISTS idx_boards_industry ON ashby_boards(industry_tags);
    "),
    ("0005_companies_ashby_enrichment", "
        ALTER TABLE companies ADD COLUMN ashby_industry_tags TEXT;
        ALTER TABLE companies ADD COLUMN ashby_tech_signals  TEXT;
        ALTER TABLE companies ADD COLUMN ashby_size_signal   TEXT;
        ALTER TABLE companies ADD COLUMN ashby_enriched_at   TEXT;
    "),
    ("0003_jobs_external_id_unique", "
        CREATE UNIQUE INDEX IF NOT EXISTS idx_jobs_external_id ON jobs(external_id);
    "),
    ("0004_ashby_boards_sync", "
        ALTER TABLE ashby_boards ADD COLUMN last_synced_at TEXT;
        ALTER TABLE ashby_boards ADD COLUMN job_count      INTEGER;
        ALTER TABLE ashby_boards ADD COLUMN is_active      INTEGER DEFAULT 1;
    "),
    ("0006_dedup_and_unique_external_id", "
        DELETE FROM jobs WHERE id NOT IN (SELECT MIN(id) FROM jobs GROUP BY external_id);
        CREATE UNIQUE INDEX IF NOT EXISTS idx_jobs_external_id ON jobs(external_id);
    "),
];

async fn apply_pending_migrations(db: &D1Database) -> Result<()> {
    // Ensure the migrations tracking table exists
    db.prepare(
        "CREATE TABLE IF NOT EXISTS _migrations (
            name       TEXT PRIMARY KEY,
            applied_at TEXT NOT NULL DEFAULT (datetime('now'))
        )"
    )
    .bind(&[])?
    .run()
    .await?;

    for (name, sql) in MIGRATIONS {
        let already_applied = db
            .prepare("SELECT 1 FROM _migrations WHERE name=?1")
            .bind(&[(*name).into()])?
            .first::<serde_json::Value>(None)
            .await?
            .is_some();

        if already_applied {
            continue;
        }

        // Run each statement individually (D1 limitation)
        for stmt in sql.split(';').map(str::trim).filter(|s| !s.is_empty()) {
            // Ignore errors — ALTER TABLE fails harmlessly if column already exists
            let _ = db.prepare(stmt).bind(&[])?.run().await;
        }

        db.prepare("INSERT OR IGNORE INTO _migrations (name) VALUES (?1)")
            .bind(&[(*name).into()])?
            .run()
            .await?;

        console_log!("[migrations] Applied: {}", name);
    }

    Ok(())
}

// ═══════════════════════════════════════════════════════════════════════════
// D1 OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════

async fn upsert_boards(db: &D1Database, boards: &[AshbyBoard]) -> Result<usize> {
    if boards.is_empty() { return Ok(0); }

    const SQL: &str = "INSERT INTO companies (key, name, website, category, score, last_seen_crawl_id, last_seen_capture_timestamp, last_seen_source_url)
         VALUES (?1, ?2, ?3, 'PRODUCT', 0.5, ?4, ?5, ?6)
         ON CONFLICT(key) DO UPDATE SET
           name=COALESCE(NULLIF(companies.name,''),excluded.name),
           website=excluded.website,
           last_seen_crawl_id=excluded.last_seen_crawl_id,
           last_seen_capture_timestamp=excluded.last_seen_capture_timestamp,
           last_seen_source_url=excluded.last_seen_source_url,
           updated_at=datetime('now')
         WHERE excluded.last_seen_capture_timestamp >= COALESCE(companies.last_seen_capture_timestamp, '')";

    let mut stmts = Vec::with_capacity(boards.len());
    for board in boards {
        let name: String = board.slug
            .split(|c: char| c == '-' || c == '_')
            .map(|w| {
                let mut chars = w.chars();
                match chars.next() {
                    None => String::new(),
                    Some(c) => c.to_uppercase().to_string() + chars.as_str(),
                }
            })
            .collect::<Vec<_>>()
            .join(" ");
        let website = format!("https://jobs.ashbyhq.com/{}", board.slug);
        stmts.push(db.prepare(SQL).bind(&[
            board.slug.clone().into(),
            name.into(),
            website.into(),
            board.crawl_id.clone().into(),
            board.timestamp.clone().into(),
            board.url.clone().into(),
        ])?);
    }

    // D1 batch: chunk to stay within CF subrequest limits (100 per batch)
    const BATCH_SIZE: usize = 100;
    let mut saved = 0usize;
    for chunk in stmts.chunks(BATCH_SIZE) {
        if let Ok(results) = db.batch(chunk.to_vec()).await {
            saved += results.len();
        }
    }
    Ok(saved)
}

async fn save_progress(
    db: &D1Database, crawl_id: &str, total: u32, current: u32, status: &str, found: u32,
) -> Result<()> {
    db.prepare(
        "INSERT INTO crawl_progress (crawl_id,total_pages,current_page,status,boards_found,started_at,updated_at)
         VALUES (?1,?2,?3,?4,?5,datetime('now'),datetime('now'))
         ON CONFLICT(crawl_id) DO UPDATE SET
           total_pages=excluded.total_pages, current_page=excluded.current_page,
           status=excluded.status, boards_found=excluded.boards_found,
           finished_at=CASE WHEN excluded.status='done' THEN datetime('now') ELSE finished_at END,
           updated_at=datetime('now')"
    )
    .bind(&[
        crawl_id.into(),
        (total as f64).into(),
        (current as f64).into(),
        status.into(),
        (found as f64).into(),
    ])?
    .run().await?;
    Ok(())
}

async fn get_progress(db: &D1Database, crawl_id: &str) -> Result<Option<(u32,u32,String,u32)>> {
    let r = db
        .prepare("SELECT total_pages,current_page,status,boards_found FROM crawl_progress WHERE crawl_id=?1")
        .bind(&[crawl_id.into()])?
        .first::<serde_json::Value>(None).await?;
    Ok(r.map(|row| (
        row["total_pages"].as_f64().unwrap_or(0.0) as u32,
        row["current_page"].as_f64().unwrap_or(0.0) as u32,
        row["status"].as_str().unwrap_or("pending").to_string(),
        row["boards_found"].as_f64().unwrap_or(0.0) as u32,
    )))
}

// ── Job-sync D1 helpers ───────────────────────────────────────────────────

/// Fetch the next batch of company slugs that have never been synced
/// (last_synced_at IS NULL in ashby_boards), ordered alphabetically.
/// When all companies have been synced once, falls back to the oldest-synced ones
/// so the cycle repeats.
async fn get_company_slugs(db: &D1Database, limit: usize) -> Result<Vec<String>> {
    let rows = db
        .prepare(
            "SELECT c.key FROM companies c
             LEFT JOIN ashby_boards ab ON ab.slug = c.key
             WHERE ab.last_synced_at IS NULL
             ORDER BY c.key
             LIMIT ?1"
        )
        .bind(&[(limit as f64).into()])?
        .all()
        .await?
        .results::<serde_json::Value>()?;
    Ok(rows.iter()
        .filter_map(|r| r["key"].as_str().map(String::from))
        .collect())
}

/// Upsert a batch of Ashby job postings into the D1 `jobs` table.
/// Mirrors the TypeScript `saveAshbyJobData` mapping.
/// Returns the number of successfully upserted rows.
async fn upsert_jobs_to_d1(
    db: &D1Database,
    jobs: &[AshbyJobPosting],
    slug: &str,
    board_title: &str,
) -> Result<usize> {
    let company_name = if board_title.is_empty() {
        // Derive readable name from slug: "hello-world" → "Hello World"
        slug.split(|c: char| c == '-' || c == '_')
            .map(|w| {
                let mut chars = w.chars();
                match chars.next() {
                    None => String::new(),
                    Some(c) => c.to_uppercase().to_string() + chars.as_str(),
                }
            })
            .collect::<Vec<_>>()
            .join(" ")
    } else {
        board_title.to_string()
    };

    const JOB_SQL: &str = "INSERT INTO jobs (
                external_id, source_kind, source_id, company_key, company_name,
                title, url, description, location,
                posted_at,
                workplace_type,
                ashby_department, ashby_team, ashby_employment_type,
                ashby_is_remote, ashby_is_listed, ashby_published_at,
                ashby_job_url, ashby_apply_url,
                ashby_secondary_locations, ashby_compensation, ashby_address,
                categories, ats_created_at, updated_at
            ) VALUES (
                ?1, 'ashby', ?2, ?3, ?4,
                ?5, ?6, NULLIF(?7,''), NULLIF(?8,''),
                COALESCE(NULLIF(?9,''), datetime('now')),
                NULLIF(?10,''),
                NULLIF(?11,''), NULLIF(?12,''), NULLIF(?13,''),
                ?14, ?15, NULLIF(?9,''),
                NULLIF(?16,''), NULLIF(?17,''),
                NULLIF(?18,''), NULLIF(?19,''), NULLIF(?20,''),
                NULLIF(?21,''), NULLIF(?9,''), datetime('now')
            )
            ON CONFLICT(external_id) DO UPDATE SET
                source_id=excluded.source_id,
                company_key=excluded.company_key,
                company_name=COALESCE(excluded.company_name, company_name),
                title=excluded.title,
                url=excluded.url,
                description=COALESCE(excluded.description, description),
                location=COALESCE(excluded.location, location),
                posted_at=COALESCE(excluded.posted_at, posted_at),
                workplace_type=COALESCE(excluded.workplace_type, workplace_type),
                ashby_department=excluded.ashby_department,
                ashby_team=excluded.ashby_team,
                ashby_employment_type=excluded.ashby_employment_type,
                ashby_is_remote=excluded.ashby_is_remote,
                ashby_is_listed=excluded.ashby_is_listed,
                ashby_published_at=excluded.ashby_published_at,
                ashby_job_url=excluded.ashby_job_url,
                ashby_apply_url=excluded.ashby_apply_url,
                ashby_secondary_locations=excluded.ashby_secondary_locations,
                ashby_compensation=excluded.ashby_compensation,
                ashby_address=excluded.ashby_address,
                categories=excluded.categories,
                ats_created_at=excluded.ats_created_at,
                updated_at=datetime('now')";

    let mut stmts = Vec::with_capacity(jobs.len() + 2);
    let mut count = 0usize;

    for job in jobs {
        let url = job.job_url.as_deref().or(job.apply_url.as_deref()).unwrap_or("");
        if url.is_empty() {
            console_log!("[job-sync] skipping job {} (no url) from board {}", job.id, slug);
            continue; // url is NOT NULL in schema — skip malformed postings
        }

        let description = job.description_html.as_deref()
            .or(job.description_plain.as_deref())
            .unwrap_or("");
        let location = job.location_name.as_deref()
            .or(job.location.as_deref())
            .unwrap_or("");
        let published_at = job.published_at.as_deref().unwrap_or("");
        let workplace_type = match job.is_remote {
            Some(true)  => "remote",
            Some(false) => "office",
            None        => "",
        };
        let department = job.department.as_deref().unwrap_or("");
        let team = job.team.as_deref().unwrap_or("");
        let employment_type = job.employment_type.as_deref().unwrap_or("");
        let job_url = job.job_url.as_deref().unwrap_or("");
        let apply_url = job.apply_url.as_deref().unwrap_or("");

        let secondary_locs_json = job.secondary_locations.as_ref()
            .map(|locs| {
                let v: Vec<serde_json::Value> = locs.iter().map(|l| {
                    serde_json::json!({ "location": l.location, "address": l.address })
                }).collect();
                serde_json::to_string(&v).unwrap_or_default()
            })
            .unwrap_or_default();

        let compensation_json = job.compensation.as_ref()
            .map(|c| serde_json::to_string(c).unwrap_or_default())
            .unwrap_or_default();

        let address_json = job.address.as_ref()
            .map(|a| serde_json::to_string(a).unwrap_or_default())
            .unwrap_or_default();

        let all_locations: Vec<serde_json::Value> = std::iter::once(job.location.as_deref().map(String::from))
            .chain(
                job.secondary_locations.as_ref()
                    .map(|locs| locs.iter().filter_map(|l| l.location.clone()).map(Some).collect::<Vec<_>>())
                    .unwrap_or_default()
                    .into_iter()
            )
            .flatten()
            .map(serde_json::Value::String)
            .collect();

        let categories_json = serde_json::to_string(&serde_json::json!({
            "department": job.department,
            "team": job.team,
            "location": job.location,
            "allLocations": all_locations,
        })).unwrap_or_default();

        // ashby_is_remote / ashby_is_listed → SQLite INTEGER (0/1) or NULL
        let is_remote_val: JsValue = job.is_remote
            .map(|v| JsValue::from_f64(if v { 1.0 } else { 0.0 }))
            .unwrap_or(JsValue::NULL);
        let is_listed_val: JsValue = job.is_listed
            .map(|v| JsValue::from_f64(if v { 1.0 } else { 0.0 }))
            .unwrap_or(JsValue::NULL);

        stmts.push(db.prepare(JOB_SQL).bind(&[
            job.id.clone().into(),        // ?1  external_id
            slug.into(),                   // ?2  source_id
            slug.into(),                   // ?3  company_key
            company_name.clone().into(),   // ?4  company_name
            job.title.clone().into(),      // ?5  title
            url.into(),                    // ?6  url
            description.into(),            // ?7  description
            location.into(),               // ?8  location
            published_at.into(),           // ?9  published_at (used for posted_at, ashby_published_at, ats_created_at)
            workplace_type.into(),         // ?10 workplace_type
            department.into(),             // ?11 ashby_department
            team.into(),                   // ?12 ashby_team
            employment_type.into(),        // ?13 ashby_employment_type
            is_remote_val,                 // ?14 ashby_is_remote
            is_listed_val,                 // ?15 ashby_is_listed
            job_url.into(),                // ?16 ashby_job_url
            apply_url.into(),              // ?17 ashby_apply_url
            secondary_locs_json.into(),    // ?18 ashby_secondary_locations
            compensation_json.into(),      // ?19 ashby_compensation
            address_json.into(),           // ?20 ashby_address
            categories_json.into(),        // ?21 categories
        ])?);
        count += 1;
    }

    // Append board + company tracking updates to the same batch
    stmts.push(db.prepare(
        "INSERT INTO ashby_boards (slug, url, first_seen, last_seen, crawl_id, last_synced_at, job_count, is_active)
         VALUES (?1, ?2, datetime('now'), datetime('now'), 'job-sync', datetime('now'), ?3, 1)
         ON CONFLICT(slug) DO UPDATE SET
           last_synced_at=datetime('now'),
           job_count=?3,
           is_active=1,
           updated_at=datetime('now')"
    ).bind(&[
        slug.into(),
        format!("https://jobs.ashbyhq.com/{}", slug).into(),
        (count as f64).into(),
    ])?);

    stmts.push(db.prepare("UPDATE companies SET updated_at=datetime('now') WHERE key=?1")
        .bind(&[slug.into()])?);

    // D1 batch: chunk to stay within CF subrequest limits (100 per batch)
    const BATCH_SIZE: usize = 100;
    for chunk in stmts.chunks(BATCH_SIZE) {
        let _ = db.batch(chunk.to_vec()).await;
    }

    Ok(count)
}

// ═══════════════════════════════════════════════════════════════════════════
// RIG-POWERED: VECTOR INDEX + PIPELINE + TOOLS
// ═══════════════════════════════════════════════════════════════════════════


/// Define the available tools (Rig Tool pattern) — useful if you later
/// wire up an LLM agent that can call these as functions.
fn define_tools() -> Vec<rig_compat::ToolDefinition> {
    vec![
        rig_compat::ToolDefinition {
            name: "search_boards".into(),
            description: "Semantic search over discovered Ashby job boards by company name or keyword".into(),
            parameters: vec![
                rig_compat::ToolParam {
                    name: "query".into(),
                    description: "Search query (company name, keyword, industry term)".into(),
                    r#type: "string".into(),
                    required: true,
                },
                rig_compat::ToolParam {
                    name: "top_n".into(),
                    description: "Number of results to return (default 10)".into(),
                    r#type: "integer".into(),
                    required: false,
                },
            ],
        },
        rig_compat::ToolDefinition {
            name: "crawl_index".into(),
            description: "Trigger a Common Crawl index crawl for Ashby boards".into(),
            parameters: vec![
                rig_compat::ToolParam {
                    name: "crawl_id".into(),
                    description: "Common Crawl index ID, e.g. CC-MAIN-2025-05".into(),
                    r#type: "string".into(),
                    required: true,
                },
                rig_compat::ToolParam {
                    name: "pages_per_run".into(),
                    description: "Pages to process per invocation (default 3)".into(),
                    r#type: "integer".into(),
                    required: false,
                },
            ],
        },
        rig_compat::ToolDefinition {
            name: "enrich_board".into(),
            description: "Run the enrichment pipeline on a specific board slug".into(),
            parameters: vec![
                rig_compat::ToolParam {
                    name: "slug".into(),
                    description: "Company slug to enrich".into(),
                    r#type: "string".into(),
                    required: true,
                },
            ],
        },
    ]
}

/// Build the enrichment pipeline (Rig ResultPipeline pattern).
/// Each named step propagates errors; step names appear in error responses.
fn build_enrichment_pipeline() -> rig_compat::ResultPipeline {
    rig_compat::ResultPipeline::new()
        // Step 1: Normalize slug (strip trailing digits/hyphens)
        .then("normalize_slug", |mut val| {
            if let Some(slug) = val.get("slug").and_then(|s| s.as_str()) {
                let normalized = slug
                    .trim_end_matches(|c: char| c.is_numeric() || c == '-')
                    .to_string();
                val["normalized_slug"] = serde_json::json!(normalized);
            }
            Ok(val)
        })
        // Step 2: Extract URL path segments
        .then("extract_segments", |mut val| {
            let url_str = val.get("url").and_then(|u| u.as_str()).map(String::from);
            if let Some(url) = url_str {
                let segments: Vec<&str> = url
                    .split('/')
                    .filter(|s| !s.is_empty() && *s != "https:" && *s != "jobs.ashbyhq.com")
                    .collect();
                val["has_job_postings"] = serde_json::json!(segments.len() > 1);
                val["url_segments"] = serde_json::json!(segments);
            }
            Ok(val)
        })
        // Step 3: Score recency — CC timestamps are YYYYMMDDHHMMSS, newer = larger
        .then("score_recency", |mut val| {
            if let Some(ts) = val.get("last_seen").and_then(|t| t.as_str()) {
                let score: f64 = ts.parse::<f64>().unwrap_or(0.0) / 100_000_000_000_000.0;
                val["recency_score"] = serde_json::json!(score);
            }
            Ok(val)
        })
        // Step 4: Structured extraction via SlugExtractor (industries + tech signals)
        .then("extract_metadata", |mut val| {
            if let Some(slug) = val.get("slug").and_then(|s| s.as_str()).map(String::from) {
                val["extracted"] = rig_compat::SlugExtractor::extract(&slug);
            }
            Ok(val)
        })
}

// ═══════════════════════════════════════════════════════════════════════════
// ROUTE HANDLERS
// ═══════════════════════════════════════════════════════════════════════════

/// GET /crawl — paginated CC crawl (unchanged from v1)
async fn handle_crawl(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let db = ctx.env.d1("DB")?;
    let url = req.url()?;
    let params: HashMap<String, String> = url.query_pairs().into_owned().collect();

    let crawl_id = params.get("crawl_id").cloned().unwrap_or("CC-MAIN-2025-52".into());
    let pages_per_run: u32 = params.get("pages_per_run").and_then(|p| p.parse().ok()).unwrap_or(3);

    let (total_pages, start_page, _st, mut boards_found) = match get_progress(&db, &crawl_id).await? {
        Some((_t, _c, s, f)) if s == "done" => {
            return Response::from_json(&ApiResponse::success(serde_json::json!({
                "crawl_id": crawl_id, "status": "done", "boards_found": f,
                "message": "Already done. DELETE /progress?crawl_id=… to re-run."
            })));
        }
        Some((t, c, _, f)) => (t, c, String::from("running"), f),
        None => (get_num_pages(&crawl_id).await?, 0, "pending".into(), 0),
    };

    save_progress(&db, &crawl_id, total_pages, start_page, "running", boards_found).await?;
    let end_page = std::cmp::min(start_page + pages_per_run, total_pages);

    // Fan-out: fetch all pages in this batch concurrently
    let page_futures: Vec<_> = (start_page..end_page)
        .map(|page| {
            let cid = crawl_id.clone();
            async move { (page, fetch_cdx_page(&cid, page).await) }
        })
        .collect();
    let mut page_fetch_results = join_all(page_futures).await;
    page_fetch_results.sort_by_key(|(page, _)| *page);

    // Collect boards from all pages before writing — fail fast on any CDX error
    let mut all_new_boards: Vec<AshbyBoard> = Vec::new();
    let mut page_results = Vec::new();
    for (page, result) in page_fetch_results {
        let boards = result?;
        page_results.push(serde_json::json!({ "page": page, "discovered": boards.len() }));
        all_new_boards.extend(boards);
    }

    // Single combined upsert for all pages (fewer D1 round-trips than per-page)
    let upserted = upsert_boards(&db, &all_new_boards).await?;
    boards_found += upserted as u32;

    // Auto-enrich: run SlugExtractor + ResultPipeline on this batch, persist to D1
    let enriched = auto_enrich_boards(&db, &all_new_boards).await.unwrap_or(0);

    let status = if end_page >= total_pages { "done" } else { "running" };
    save_progress(&db, &crawl_id, total_pages, end_page, status, boards_found).await?;

    Response::from_json(&ApiResponse::success(serde_json::json!({
        "crawl_id": crawl_id, "status": status, "total_pages": total_pages,
        "pages_processed": format!("{start_page}-{}", end_page.saturating_sub(1)),
        "next_page": if status == "done" { None } else { Some(end_page) },
        "total_boards_found": boards_found,
        "upserted_this_run": upserted,
        "enriched_this_run": enriched,
        "page_results": page_results,
    })))
}

/// GET /search?q=fintech&top_n=10 — Okapi BM25 ranking over the board corpus.
/// Enriched company_name and industry_tags are included in the index when available.
async fn handle_search(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let db = ctx.env.d1("DB")?;
    let url = req.url()?;
    let params: HashMap<String, String> = url.query_pairs().into_owned().collect();

    let query = match params.get("q") {
        Some(q) if !q.is_empty() => q.clone(),
        _ => return error_response("?q= query parameter required"),
    };
    let top_n: usize = params.get("top_n").and_then(|n| n.parse().ok()).unwrap_or(10);

    let index = build_bm25_index(&db).await?;
    let results = index.rank(&query, top_n);

    Response::from_json(&ApiResponse::success(serde_json::json!({
        "query": query,
        "engine": "rig_compat::Bm25Index (Okapi BM25, k1=1.5, b=0.75)",
        "index_size": index.len(),
        "results": results,
    })))
}

/// GET /enrich?slug=figma — Run Rig Pipeline on a board
async fn handle_enrich(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let db = ctx.env.d1("DB")?;
    let url = req.url()?;
    let params: HashMap<String, String> = url.query_pairs().into_owned().collect();

    let slug = match params.get("slug") {
        Some(s) if !s.is_empty() => s.clone(),
        _ => return error_response("?slug= parameter required"),
    };

    let row = db
        .prepare("SELECT key as slug, website as url, created_at as first_seen, last_seen_capture_timestamp as last_seen, last_seen_crawl_id as crawl_id, NULL as http_status FROM companies WHERE key = ?1")
        .bind(&[slug.into()])?
        .first::<serde_json::Value>(None)
        .await?;

    let row = match row {
        Some(r) => r,
        None => return error_response("Board not found"),
    };

    let pipeline = build_enrichment_pipeline();
    let enriched = match pipeline.run(row) {
        Ok(v) => v,
        Err((step, msg)) => return error_response(&format!("Pipeline failed at '{step}': {msg}")),
    };

    Response::from_json(&ApiResponse::success(serde_json::json!({
        "pipeline": pipeline.step_names(),
        "enriched": enriched,
    })))
}

/// GET /enrich-all?limit=50 — Run pipeline on multiple boards
async fn handle_enrich_all(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let db = ctx.env.d1("DB")?;
    let url = req.url()?;
    let params: HashMap<String, String> = url.query_pairs().into_owned().collect();
    let limit: u32 = params.get("limit").and_then(|v| v.parse().ok()).unwrap_or(50);

    let rows = db
        .prepare("SELECT key as slug, website as url, created_at as first_seen, last_seen_capture_timestamp as last_seen, last_seen_crawl_id as crawl_id, NULL as http_status FROM companies ORDER BY last_seen_capture_timestamp DESC LIMIT ?1")
        .bind(&[(limit as f64).into()])?
        .all().await?
        .results::<serde_json::Value>()?;

    let pipeline = build_enrichment_pipeline();
    let step_names = pipeline.step_names();
    let mut enriched = Vec::new();
    let mut errors = Vec::new();
    for r in rows {
        match pipeline.run(r) {
            Ok(v) => enriched.push(v),
            Err((step, msg)) => errors.push(serde_json::json!({ "step": step, "error": msg })),
        }
    }

    // Aggregate industry distribution from SlugExtractor output
    let mut industry_counts: HashMap<String, usize> = HashMap::new();
    for item in &enriched {
        if let Some(industries) = item
            .get("extracted")
            .and_then(|e| e.get("industries"))
            .and_then(|i| i.as_array())
        {
            for industry in industries {
                if let Some(i) = industry.as_str() {
                    *industry_counts.entry(i.to_string()).or_default() += 1;
                }
            }
        }
    }

    Response::from_json(&ApiResponse::success(serde_json::json!({
        "pipeline": step_names,
        "count": enriched.len(),
        "errors": errors.len(),
        "industry_distribution": industry_counts,
        "boards": enriched,
    })))
}

/// Build the ToolRegistry — mirrors rig's agent tool registration.
/// Without an LLM, tools are dispatched explicitly; with one, swap in rig::agent.
fn build_tool_registry() -> rig_compat::ToolRegistry {
    let mut registry = rig_compat::ToolRegistry::new();

    registry.register(
        "search_boards",
        "TF-IDF cosine-similarity search over Ashby job boards. Args: {query: string, top_n?: number}",
        |args| {
            let query = args.get("query").and_then(|v| v.as_str())
                .ok_or_else(|| "Missing required arg: query".to_string())?;
            let _top_n = args.get("top_n").and_then(|v| v.as_u64()).unwrap_or(10);
            Ok(serde_json::json!({
                "action": "GET /search",
                "params": { "q": query, "top_n": _top_n },
                "note": "Forward this to /search to execute",
            }))
        },
    );

    registry.register(
        "rank_boards",
        "Okapi BM25 probabilistic ranking over Ashby job boards. Args: {query: string, top_n?: number}",
        |args| {
            let query = args.get("query").and_then(|v| v.as_str())
                .ok_or_else(|| "Missing required arg: query".to_string())?;
            let _top_n = args.get("top_n").and_then(|v| v.as_u64()).unwrap_or(10);
            Ok(serde_json::json!({
                "action": "GET /rank",
                "params": { "q": query, "top_n": _top_n },
            }))
        },
    );

    registry.register(
        "extract_slug",
        "Extract structured metadata (company name, industries, tech) from a board slug. Args: {slug: string}",
        |args| {
            let slug = args.get("slug").and_then(|v| v.as_str())
                .ok_or_else(|| "Missing required arg: slug".to_string())?;
            Ok(rig_compat::SlugExtractor::extract(slug))
        },
    );

    registry.register(
        "crawl_index",
        "Trigger a Common Crawl CDX crawl for Ashby boards. Args: {crawl_id: string, pages_per_run?: number}",
        |args| {
            let crawl_id = args.get("crawl_id").and_then(|v| v.as_str())
                .ok_or_else(|| "Missing required arg: crawl_id".to_string())?;
            let pages = args.get("pages_per_run").and_then(|v| v.as_u64()).unwrap_or(3);
            Ok(serde_json::json!({
                "action": "GET /crawl",
                "params": { "crawl_id": crawl_id, "pages_per_run": pages },
            }))
        },
    );

    registry
}

/// GET /tools — ToolRegistry listing + ToolDefinition function-calling schemas
async fn handle_tools(req: Request, _ctx: RouteContext<()>) -> Result<Response> {
    let url = req.url()?;
    let params: HashMap<String, String> = url.query_pairs().into_owned().collect();

    // ?call=<tool_name>&args=<json> — execute a tool inline (rig agent dispatch)
    if let Some(tool_name) = params.get("call") {
        let args: serde_json::Value = params.get("args")
            .and_then(|s| serde_json::from_str(s).ok())
            .unwrap_or(serde_json::json!({}));

        let registry = build_tool_registry();
        return match registry.call(tool_name, args) {
            Ok(result) => Response::from_json(&ApiResponse::success(serde_json::json!({
                "tool": tool_name,
                "result": result,
            }))),
            Err(e) => error_response(&e),
        };
    }

    // Default: list all tools in both registry and function-calling schema format
    let registry = build_tool_registry();
    let definitions = define_tools();
    let schemas: Vec<serde_json::Value> = definitions.iter().map(|t| t.to_function_schema()).collect();

    Response::from_json(&ApiResponse::success(serde_json::json!({
        "description": "rig_compat tool registry (rig::agent pattern, no LLM routing)",
        "usage": {
            "list":     "GET /tools",
            "call":     "GET /tools?call=<name>&args={...}",
            "llm_wire": "Pass function_schemas to any LLM to let it call these endpoints",
        },
        "registry": registry.list(),
        "function_schemas": schemas,
    })))
}

/// GET /boards — list/search from D1
async fn handle_list_boards(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let db = ctx.env.d1("DB")?;
    let url = req.url()?;
    let params: HashMap<String, String> = url.query_pairs().into_owned().collect();
    let limit: u32 = params.get("limit").and_then(|v| v.parse().ok()).unwrap_or(100);
    let offset: u32 = params.get("offset").and_then(|v| v.parse().ok()).unwrap_or(0);
    let search = params.get("search").cloned();

    let (q, binds): (String, Vec<JsValue>) = if let Some(ref term) = search {
        ("SELECT key as slug, website as url, created_at as first_seen, last_seen_capture_timestamp as last_seen, last_seen_crawl_id as crawl_id, NULL as http_status, created_at FROM companies WHERE key LIKE ?1 ORDER BY key LIMIT ?2 OFFSET ?3".into(),
         vec![format!("%{term}%").into(), (limit as f64).into(), (offset as f64).into()])
    } else {
        ("SELECT key as slug, website as url, created_at as first_seen, last_seen_capture_timestamp as last_seen, last_seen_crawl_id as crawl_id, NULL as http_status, created_at FROM companies ORDER BY key LIMIT ?1 OFFSET ?2".into(),
         vec![(limit as f64).into(), (offset as f64).into()])
    };

    let rows = db.prepare(&q).bind(&binds)?.all().await?.results::<serde_json::Value>()?;

    let count_q = if let Some(ref term) = search {
        db.prepare("SELECT COUNT(*) as count FROM companies WHERE key LIKE ?1")
            .bind(&[format!("%{term}%").into()])?
            .first::<serde_json::Value>(None).await?
    } else {
        db.prepare("SELECT COUNT(*) as count FROM companies")
            .bind(&[])?.first::<serde_json::Value>(None).await?
    };
    let total = count_q.and_then(|r| r["count"].as_f64()).unwrap_or(0.0) as u64;

    Response::from_json(&ApiResponse::success(serde_json::json!({
        "boards": rows, "total": total, "limit": limit, "offset": offset,
    })))
}

async fn handle_indexes(_req: Request, _ctx: RouteContext<()>) -> Result<Response> {
    let indexes = list_cc_indexes().await?;
    Response::from_json(&ApiResponse::success(serde_json::json!({ "indexes": indexes, "count": indexes.len() })))
}

async fn handle_progress(_req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let db = ctx.env.d1("DB")?;
    let rows = db.prepare("SELECT * FROM crawl_progress ORDER BY updated_at DESC")
        .bind(&[])?.all().await?.results::<serde_json::Value>()?;
    Response::from_json(&ApiResponse::success(serde_json::json!({ "crawls": rows })))
}

async fn handle_reset_progress(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let db = ctx.env.d1("DB")?;
    let url = req.url()?;
    let params: HashMap<String, String> = url.query_pairs().into_owned().collect();
    let cid = match params.get("crawl_id") {
        Some(id) => id.clone(),
        None => return error_response("crawl_id required"),
    };
    db.prepare("DELETE FROM crawl_progress WHERE crawl_id=?1")
        .bind(&[cid.clone().into()])?.run().await?;
    Response::from_json(&ApiResponse::success(serde_json::json!({ "message": format!("Reset {cid}") })))
}

async fn handle_stats(_req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let db = ctx.env.d1("DB")?;
    let total = db.prepare("SELECT COUNT(*) as count FROM companies")
        .bind(&[])?.first::<serde_json::Value>(None).await?
        .and_then(|r| r["count"].as_f64()).unwrap_or(0.0) as u64;
    let by_crawl = db.prepare("SELECT last_seen_crawl_id as crawl_id, COUNT(*) as count FROM companies GROUP BY last_seen_crawl_id")
        .bind(&[])?.all().await?.results::<serde_json::Value>()?;
    let newest = db.prepare("SELECT key as slug, website as url, last_seen_capture_timestamp as last_seen FROM companies ORDER BY last_seen_capture_timestamp DESC LIMIT 10")
        .bind(&[])?.all().await?.results::<serde_json::Value>()?;
    Response::from_json(&ApiResponse::success(serde_json::json!({
        "total_boards": total, "by_crawl": by_crawl, "newest_boards": newest,
    })))
}

/// Build the BM25 index from D1. Used by /search (replaces TF-IDF cosine similarity).
async fn build_bm25_index(db: &D1Database) -> Result<rig_compat::Bm25Index> {
    let rows = db
        .prepare("SELECT slug, url, last_seen, crawl_id, company_name, industry_tags FROM ashby_boards")
        .bind(&[])?
        .all().await?
        .results::<serde_json::Value>()?;

    let mut index = rig_compat::Bm25Index::new();
    for row in &rows {
        let slug = row["slug"].as_str().unwrap_or("");
        let url  = row["url"].as_str().unwrap_or("");
        // Include enriched company_name and industry_tags in the search corpus when available
        let company = row["company_name"].as_str().unwrap_or("");
        let industries = row["industry_tags"].as_str().unwrap_or("");
        let search_text = format!(
            "{} {} {} {}",
            slug.replace('-', " "),
            company,
            industries,
            url.split('/').collect::<Vec<_>>().join(" "),
        );
        let mut meta = HashMap::new();
        meta.insert("url".into(), url.to_string());
        meta.insert("last_seen".into(), row["last_seen"].as_str().unwrap_or("").to_string());
        meta.insert("crawl_id".into(), row["crawl_id"].as_str().unwrap_or("").to_string());
        if !company.is_empty() { meta.insert("company_name".into(), company.to_string()); }
        if !industries.is_empty() { meta.insert("industry_tags".into(), industries.to_string()); }
        index.add_document(slug.to_string(), search_text, meta);
    }
    index.rebuild_index();
    Ok(index)
}

/// Run SlugExtractor + ResultPipeline on a batch of boards and persist enrichment
/// columns (company_name, industry_tags, tech_signals, enriched_at) back to D1.
/// Called automatically at the end of each crawl batch — no HTTP endpoint needed.
async fn auto_enrich_boards(db: &D1Database, boards: &[AshbyBoard]) -> Result<usize> {
    if boards.is_empty() { return Ok(0); }

    const SQL: &str = "UPDATE companies
         SET ashby_industry_tags=?1, ashby_tech_signals=?2, ashby_size_signal=?3, ashby_enriched_at=datetime('now')
         WHERE key=?4";
    const BATCH_SIZE: usize = 100;

    let pipeline = build_enrichment_pipeline();
    let mut stmts = Vec::with_capacity(boards.len());

    for board in boards {
        let row = serde_json::json!({
            "slug":      board.slug,
            "url":       board.url,
            "last_seen": board.timestamp,
        });

        let enriched = match pipeline.run(row) {
            Ok(v) => v,
            Err((step, msg)) => {
                console_log!("[enrich] slug={} failed at '{}': {}", board.slug, step, msg);
                continue;
            }
        };

        let extracted = match enriched.get("extracted") {
            Some(e) => e,
            None => continue,
        };
        let industry_tags = extracted.get("industries")
            .map(|v| v.to_string())
            .unwrap_or_else(|| "[]".to_string());
        let tech_signals = extracted.get("tech_signals")
            .map(|v| v.to_string())
            .unwrap_or_else(|| "[]".to_string());
        let size_signal = extracted.get("size_signal").and_then(|v| v.as_str()).unwrap_or("startup");

        stmts.push(db.prepare(SQL).bind(&[
            industry_tags.into(),
            tech_signals.into(),
            size_signal.into(),
            board.slug.clone().into(),
        ])?);
    }

    let saved = stmts.len();
    for chunk in stmts.chunks(BATCH_SIZE) {
        let _ = db.batch(chunk.to_vec()).await;
    }

    Ok(saved)
}

// ═══════════════════════════════════════════════════════════════════════════
// SCHEDULED CRON HANDLER
// ═══════════════════════════════════════════════════════════════════════════

/// Daily cron: crawl latest Common Crawl index for new Ashby job boards.
///
/// Strategy:
///   - Runs daily at 02:00 UTC (configured in wrangler.toml [triggers])
///   - Detects the latest CC index automatically via the collinfo API
///   - Processes PAGES_PER_RUN pages per invocation (resumable across days)
///   - Skips if the current index is already fully crawled
///   - All progress persisted to D1 `crawl_progress` table
///
/// Each CC index has ~100 pages × 100 records = ~10 000 Ashby board URLs.
/// At 10 pages/day the full index is covered in ~10 days.
const PAGES_PER_CRON_RUN: u32 = 10;

/// Number of company boards to fetch jobs for per cron run (Phase 2 job sync).
/// Kept low to stay within the 30s CPU time budget.
const BOARDS_PER_JOB_SYNC_RUN: usize = 20;

#[event(scheduled)]
async fn cron_handler(_event: ScheduledEvent, env: Env, _ctx: ScheduleContext) {
    if let Err(e) = cron_handler_inner(env).await {
        console_log!("[ashby-crawler cron] Error: {:?}", e);
    }
}

async fn cron_handler_inner(env: Env) -> Result<()> {
    console_log!("[ashby-crawler cron] Starting scheduled crawl run...");
    let db = env.d1("DB")?;

    if let Err(e) = apply_pending_migrations(&db).await {
        console_log!("[migrations] Warning: {:?}", e);
    }

    // ── Step 1: concurrent reads — CC index list (HTTP) + Phase 2 slug queue (D1) ──
    // These are fully independent: one hits Common Crawl, one hits D1.
    // Mirrors rig_concurrent_demo: Arc<Model> shared across concurrent tasks.
    let (cc_result, slugs_result) = join(
        list_cc_indexes(),
        get_company_slugs(&db, BOARDS_PER_JOB_SYNC_RUN),
    ).await;

    let crawl_id = match cc_result {
        Ok(indexes) if !indexes.is_empty() => {
            console_log!("[ashby-crawler cron] Latest CC index: {}", indexes[0]);
            indexes[0].clone()
        }
        Ok(_) => { console_log!("[ashby-crawler cron] No CC indexes, using fallback"); "CC-MAIN-2025-52".to_string() }
        Err(e) => { console_log!("[ashby-crawler cron] CC index list failed: {:?}, using fallback", e); "CC-MAIN-2025-52".to_string() }
    };
    let slugs = slugs_result.unwrap_or_default();

    // ── Step 2: crawl progress check (needs crawl_id — sequential) ───────────
    let (total_pages, start_page, mut boards_found) = match get_progress(&db, &crawl_id).await? {
        Some((_, _, ref s, f)) if s == "done" => {
            console_log!("[ashby-crawler cron] {} already done ({} boards). Phase 1 skipped.", crawl_id, f);
            (0u32, 0u32, f)
        }
        Some((t, c, ref s, f)) => {
            console_log!("[ashby-crawler cron] Resuming {} page {}/{} (status={}, boards={})", crawl_id, c, t, s, f);
            (t, c, f)
        }
        None => {
            let total = match get_num_pages(&crawl_id).await {
                Ok(n) => n,
                Err(e) => { console_log!("[ashby-crawler cron] get_num_pages failed: {:?}", e); return Err(e); }
            };
            console_log!("[ashby-crawler cron] New index {} — {} pages total", crawl_id, total);
            (total, 0, 0)
        }
    };

    let end_page = if total_pages > 0 {
        save_progress(&db, &crawl_id, total_pages, start_page, "running", boards_found).await?;
        (start_page + PAGES_PER_CRON_RUN).min(total_pages)
    } else {
        0
    };

    // ── Step 3: fan-out ALL HTTP concurrently — CDX pages ∥ Ashby board fetches ──
    // Phase 1 CDX fetches and Phase 2 Ashby API fetches are fully independent HTTP calls.
    // ConcurrentRunner mirrors rig_concurrent_demo's Arc<Model> + task::spawn pattern:
    //   demo:  for i in 0..N { task::spawn(async { model.prompt(i) }) }
    //   here:  runner.run_all(slugs, |slug| fetch_ashby_board_jobs(slug))
    let cdx_futures: Vec<_> = (start_page..end_page)
        .map(|page| { let cid = crawl_id.clone(); async move { (page, fetch_cdx_page(&cid, page).await) } })
        .collect();

    let runner = rig_compat::ConcurrentRunner::new();

    // join_all(CDX) ∥ ConcurrentRunner(Ashby) — maximum HTTP concurrency
    let (mut cdx_results, (ashby_ok, ashby_err)) = join(
        join_all(cdx_futures),
        runner.run_all(slugs.clone(), |slug| async move {
            fetch_ashby_board_jobs(&slug).await.map(|board| (slug, board))
        }),
    ).await;

    for e in &ashby_err {
        console_log!("[job-sync] board fetch error: {:?}", e);
    }

    // ── Step 4: process CDX results (in-memory, sync) ────────────────────────
    cdx_results.sort_by_key(|(page, _)| *page);
    let mut all_new_boards: Vec<AshbyBoard> = Vec::new();
    let mut page_errors = 0u32;
    for (page, result) in cdx_results {
        match result {
            Ok(boards) => {
                console_log!("[ashby-crawler cron] Page {}/{}: {} boards", page + 1, total_pages, boards.len());
                all_new_boards.extend(boards);
            }
            Err(e) => {
                page_errors += 1;
                console_log!("[ashby-crawler cron] Page {} error ({}): {:?}", page, page_errors, e);
                if page_errors >= 3 {
                    save_progress(&db, &crawl_id, total_pages, page, "error", boards_found).await?;
                    return Err(Error::RustError(format!("Batch aborted after {} page errors", page_errors)));
                }
            }
        }
    }

    // ── Step 5: concurrent D1 writes — Phase 1 (companies) ∥ Phase 2 (jobs) ──
    // Phase 1 writes to `companies` table.
    // Phase 2 writes to `jobs` + `ashby_boards` tables.
    // Disjoint tables → safe to run concurrently under D1's WAL mode.
    let all_boards_ref = &all_new_boards;
    let ((upserted, enriched), phase2_synced) = join(
        async {
            let u = if total_pages > 0 { upsert_boards(&db, all_boards_ref).await.unwrap_or(0) } else { 0 };
            let e = if total_pages > 0 { auto_enrich_boards(&db, all_boards_ref).await.unwrap_or(0) } else { 0 };
            (u, e)
        },
        async {
            let mut total = 0usize;
            for (slug, board) in ashby_ok {
                let title = board.title.clone().unwrap_or_default();
                total += upsert_jobs_to_d1(&db, &board.jobs, &slug, &title).await.unwrap_or(0);
            }
            total
        },
    ).await;

    // ── Step 6: save final progress ───────────────────────────────────────────
    if total_pages > 0 {
        boards_found += upserted as u32;
        let status = if end_page >= total_pages { "done" } else { "running" };
        save_progress(&db, &crawl_id, total_pages, end_page, status, boards_found).await?;
        console_log!(
            "[ashby-crawler cron] Phase 1: pages {}-{}/{}, {} upserted, {} enriched, status={}",
            start_page, end_page.saturating_sub(1), total_pages, upserted, enriched, status
        );
    }
    console_log!("[ashby-crawler cron] Phase 2: {} jobs synced from {} boards", phase2_synced, slugs.len());

    Ok(())
}

// ═══════════════════════════════════════════════════════════════════════════
// ROUTER
// ═══════════════════════════════════════════════════════════════════════════

#[event(fetch)]
async fn main(req: Request, env: Env, _ctx: Context) -> Result<Response> {
    // Apply any pending D1 migrations before handling the request
    if let Ok(db) = env.d1("DB") {
        if let Err(e) = apply_pending_migrations(&db).await {
            console_log!("[migrations] Warning: {:?}", e);
        }
    }

    Router::new()
        // Core crawl
        .get_async("/crawl", handle_crawl)
        .get_async("/boards", handle_list_boards)
        .get_async("/indexes", handle_indexes)
        .get_async("/progress", handle_progress)
        .delete_async("/progress", handle_reset_progress)
        .get_async("/stats", handle_stats)
        // Rig-powered endpoints
        .get_async("/search", handle_search)        // Okapi BM25 ranking over enriched corpus
        .get_async("/enrich", handle_enrich)        // ResultPipeline on single board (on-demand)
        .get_async("/enrich-all", handle_enrich_all)// ResultPipeline on batch (on-demand)
        .get_async("/tools", handle_tools)          // ToolRegistry + function-calling schemas
        // Root
        .get("/", |_, _| {
            Response::from_json(&serde_json::json!({
                "service": "ashby-crawler v0.4 (job-sync)",
                "core_endpoints": {
                    "GET /crawl":       "Crawl CC index → D1 (auto-enriches each batch). ?crawl_id=&pages_per_run=",
                    "GET /boards":      "List/search boards. ?limit=&offset=&search=",
                    "GET /indexes":     "Available CC indexes",
                    "GET /progress":    "Crawl progress (includes job-sync cursor at crawl_id='job-sync')",
                    "DELETE /progress": "Reset a crawl. ?crawl_id=",
                    "GET /stats":       "Summary stats",
                },
                "rig_endpoints": {
                    "GET /search":      "Okapi BM25 search over enriched corpus. ?q=&top_n=",
                    "GET /enrich":      "On-demand ResultPipeline for one board. ?slug=",
                    "GET /enrich-all":  "On-demand batch ResultPipeline. ?limit=",
                    "GET /tools":       "ToolRegistry + function-calling schemas. ?call=&args=",
                },
                "cron_phases": {
                    "phase_1": "CC crawl → upsert companies (10 pages/run, resumable)",
                    "phase_2": "Job sync → fetch Ashby jobs for 20 boards/run, paginated cursor in crawl_progress",
                },
                "rig_patterns": ["Bm25Index", "ResultPipeline", "SlugExtractor", "ToolRegistry"],
            }))
        })
        .run(req, env)
        .await
}
