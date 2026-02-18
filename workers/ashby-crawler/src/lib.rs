use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use worker::*;

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
    #[serde(default, alias = "mime-detected", alias = "mime")]
    mime: Option<String>,
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
        "https://index.commoncrawl.org/{crawl_id}?\
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
        "https://index.commoncrawl.org/{crawl_id}?\
         url=jobs.ashbyhq.com%2F*&output=json&filter=statuscode:200&pageSize=100&page={page}"
    );
    let mut resp = Fetch::Request(Request::new(&url, Method::Get)?).send().await?;
    let text = resp.text().await?;

    let records: Vec<CdxRecord> = text
        .lines()
        .filter(|l| !l.trim().is_empty())
        .filter_map(|l| serde_json::from_str(l).ok())
        .collect();

    let mut map = HashMap::<String, AshbyBoard>::new();
    for r in records {
        if let Some(slug) = extract_slug(&r.url) {
            let board = AshbyBoard {
                slug: slug.clone(),
                url: r.url,
                timestamp: r.timestamp.clone(),
                crawl_id: crawl_id.to_string(),
                status: r.status,
                mime: r.mime,
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

// ═══════════════════════════════════════════════════════════════════════════
// D1 OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════

async fn upsert_boards(db: &D1Database, boards: &[AshbyBoard]) -> Result<usize> {
    let mut count = 0usize;
    for board in boards {
        let ok = db.prepare(
            "INSERT INTO ashby_boards (slug,url,first_seen,last_seen,crawl_id,http_status,mime_type,warc_file,warc_offset,warc_length)
             VALUES (?1,?2,?3,?3,?4,?5,?6,?7,?8,?9)
             ON CONFLICT(slug) DO UPDATE SET
               url=excluded.url, last_seen=excluded.last_seen, crawl_id=excluded.crawl_id,
               http_status=excluded.http_status, mime_type=excluded.mime_type,
               warc_file=excluded.warc_file, warc_offset=excluded.warc_offset,
               warc_length=excluded.warc_length, updated_at=datetime('now')
             WHERE excluded.last_seen >= ashby_boards.last_seen"
        )
        .bind(&[
            board.slug.clone().into(),
            board.url.clone().into(),
            board.timestamp.clone().into(),
            board.crawl_id.clone().into(),
            board.status.clone().unwrap_or_default().into(),
            board.mime.clone().unwrap_or_default().into(),
            board.warc_file.clone().unwrap_or_default().into(),
            board.warc_offset.map(|v| v as f64).unwrap_or(0.0).into(),
            board.warc_length.map(|v| v as f64).unwrap_or(0.0).into(),
        ])?
        .run()
        .await;
        if ok.is_ok() { count += 1; }
    }
    Ok(count)
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

// ═══════════════════════════════════════════════════════════════════════════
// RIG-POWERED: VECTOR INDEX + PIPELINE + TOOLS
// ═══════════════════════════════════════════════════════════════════════════

/// Build the vector store from D1, computing TF-IDF embeddings over slugs.
async fn build_vector_store(
    db: &D1Database,
) -> Result<rig_compat::InMemoryVectorStore> {
    let rows = db
        .prepare("SELECT slug, url, last_seen, crawl_id FROM ashby_boards")
        .bind(&[])?
        .all().await?
        .results::<serde_json::Value>()?;

    let mut store = rig_compat::InMemoryVectorStore::new();
    for row in &rows {
        let slug = row["slug"].as_str().unwrap_or("");
        let url = row["url"].as_str().unwrap_or("");
        // Searchable text = slug expanded (hyphens→spaces) + URL path segments
        let search_text = format!(
            "{} {}",
            slug.replace('-', " "),
            url.split('/').collect::<Vec<_>>().join(" ")
        );
        let mut meta = HashMap::new();
        meta.insert("url".into(), url.to_string());
        meta.insert("last_seen".into(), row["last_seen"].as_str().unwrap_or("").to_string());
        meta.insert("crawl_id".into(), row["crawl_id"].as_str().unwrap_or("").to_string());
        store.add_document(slug.to_string(), search_text, meta);
    }
    store.rebuild_index();
    Ok(store)
}

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

/// Build the enrichment pipeline (Rig Pipeline pattern).
/// Chains: normalize → extract metadata → score recency → tag.
fn build_enrichment_pipeline() -> rig_compat::Pipeline<serde_json::Value, serde_json::Value> {
    rig_compat::Pipeline::new()
        // Step 1: Normalize slug (strip trailing numbers, common suffixes)
        .then(|mut val| {
            if let Some(slug) = val.get("slug").and_then(|s| s.as_str()) {
                let normalized = slug
                    .trim_end_matches(|c: char| c.is_numeric() || c == '-')
                    .to_string();
                val["normalized_slug"] = serde_json::json!(normalized);
            }
            val
        })
        // Step 2: Extract domain hints from URL path
        .then(|mut val| {
            if let Some(url) = val.get("url").and_then(|u| u.as_str()) {
                let segments: Vec<&str> = url
                    .split('/')
                    .filter(|s| !s.is_empty() && *s != "https:" && *s != "jobs.ashbyhq.com")
                    .collect();
                val["url_segments"] = serde_json::json!(segments);
                val["has_job_postings"] = serde_json::json!(segments.len() > 1);
            }
            val
        })
        // Step 3: Score recency (higher = more recently seen in CC)
        .then(|mut val| {
            if let Some(ts) = val.get("last_seen").and_then(|t| t.as_str()) {
                // CC timestamps are YYYYMMDDHHMMSS — newer = larger
                let score: f64 = ts.parse::<f64>().unwrap_or(0.0) / 100000000000000.0;
                val["recency_score"] = serde_json::json!(score);
            }
            val
        })
        // Step 4: Auto-tag based on slug patterns
        .then(|mut val| {
            let slug = val.get("slug").and_then(|s| s.as_str()).unwrap_or("");
            let mut tags = Vec::<String>::new();
            if slug.contains("ai") || slug.contains("ml") || slug.contains("deep") {
                tags.push("ai-ml".into());
            }
            if slug.contains("health") || slug.contains("med") || slug.contains("bio") {
                tags.push("healthcare".into());
            }
            if slug.contains("fin") || slug.contains("pay") || slug.contains("bank") {
                tags.push("fintech".into());
            }
            if slug.contains("dev") || slug.contains("code") || slug.contains("eng") {
                tags.push("devtools".into());
            }
            if slug.contains("security") || slug.contains("cyber") {
                tags.push("security".into());
            }
            if tags.is_empty() {
                tags.push("general".into());
            }
            val["auto_tags"] = serde_json::json!(tags);
            val
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

    let crawl_id = params.get("crawl_id").cloned().unwrap_or("CC-MAIN-2025-05".into());
    let pages_per_run: u32 = params.get("pages_per_run").and_then(|p| p.parse().ok()).unwrap_or(3);

    let (total_pages, start_page, _st, mut boards_found) = match get_progress(&db, &crawl_id).await? {
        Some((_t, _c, s, f)) if s == "done" => {
            return Response::from_json(&ApiResponse::success(serde_json::json!({
                "crawl_id": crawl_id, "status": "done", "boards_found": f,
                "message": "Already done. DELETE /progress?crawl_id=… to re-run."
            })));
        }
        Some((t, c, _, f)) => (t, c, "running".into(), f),
        None => (get_num_pages(&crawl_id).await?, 0, "pending".into(), 0),
    };

    save_progress(&db, &crawl_id, total_pages, start_page, "running", boards_found).await?;
    let end_page = std::cmp::min(start_page + pages_per_run, total_pages);
    let mut page_results = Vec::new();

    for page in start_page..end_page {
        let boards = fetch_cdx_page(&crawl_id, page).await?;
        let upserted = upsert_boards(&db, &boards).await?;
        boards_found += upserted as u32;
        page_results.push(serde_json::json!({
            "page": page, "discovered": boards.len(), "upserted": upserted,
        }));
    }

    let status = if end_page >= total_pages { "done" } else { "running" };
    save_progress(&db, &crawl_id, total_pages, end_page, status, boards_found).await?;

    Response::from_json(&ApiResponse::success(serde_json::json!({
        "crawl_id": crawl_id, "status": status, "total_pages": total_pages,
        "pages_processed": format!("{start_page}-{}", end_page.saturating_sub(1)),
        "next_page": if status == "done" { None } else { Some(end_page) },
        "total_boards_found": boards_found, "page_results": page_results,
    })))
}

/// GET /search?q=fintech&top_n=10 — Rig VectorStore semantic search
async fn handle_search(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let db = ctx.env.d1("DB")?;
    let url = req.url()?;
    let params: HashMap<String, String> = url.query_pairs().into_owned().collect();

    let query = match params.get("q") {
        Some(q) if !q.is_empty() => q.clone(),
        _ => return error_response("?q= query parameter required"),
    };
    let top_n: usize = params.get("top_n").and_then(|n| n.parse().ok()).unwrap_or(10);

    let store = build_vector_store(&db).await?;
    let results = store.top_n(&query, top_n);

    Response::from_json(&ApiResponse::success(serde_json::json!({
        "query": query,
        "engine": "rig_compat::InMemoryVectorStore (TF-IDF + cosine similarity)",
        "index_size": store.len(),
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
        .prepare("SELECT slug, url, first_seen, last_seen, crawl_id, http_status FROM ashby_boards WHERE slug = ?1")
        .bind(&[slug.into()])?
        .first::<serde_json::Value>(None)
        .await?;

    let row = match row {
        Some(r) => r,
        None => return error_response("Board not found"),
    };

    let pipeline = build_enrichment_pipeline();
    let enriched = pipeline.run(row);

    Response::from_json(&ApiResponse::success(serde_json::json!({
        "pipeline": "normalize → extract_segments → score_recency → auto_tag",
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
        .prepare("SELECT slug, url, first_seen, last_seen, crawl_id, http_status FROM ashby_boards ORDER BY last_seen DESC LIMIT ?1")
        .bind(&[(limit as f64).into()])?
        .all().await?
        .results::<serde_json::Value>()?;

    let pipeline = build_enrichment_pipeline();
    let enriched: Vec<serde_json::Value> = rows.into_iter().map(|r| pipeline.run(r)).collect();

    // Aggregate tag counts
    let mut tag_counts: HashMap<String, usize> = HashMap::new();
    for item in &enriched {
        if let Some(tags) = item.get("auto_tags").and_then(|t| t.as_array()) {
            for tag in tags {
                if let Some(t) = tag.as_str() {
                    *tag_counts.entry(t.to_string()).or_default() += 1;
                }
            }
        }
    }

    Response::from_json(&ApiResponse::success(serde_json::json!({
        "pipeline": "normalize → extract_segments → score_recency → auto_tag",
        "count": enriched.len(),
        "tag_distribution": tag_counts,
        "boards": enriched,
    })))
}

/// GET /tools — Rig Tool definitions (OpenAI function-calling compatible)
async fn handle_tools(_req: Request, _ctx: RouteContext<()>) -> Result<Response> {
    let tools = define_tools();
    let schemas: Vec<serde_json::Value> = tools.iter().map(|t| t.to_function_schema()).collect();
    Response::from_json(&ApiResponse::success(serde_json::json!({
        "description": "Rig-compatible tool definitions (OpenAI function-calling schema)",
        "usage": "Wire these into an LLM agent to let it call /crawl, /search, /enrich autonomously",
        "tools": schemas,
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
        ("SELECT slug,url,first_seen,last_seen,crawl_id,http_status,created_at FROM ashby_boards WHERE slug LIKE ?1 ORDER BY slug LIMIT ?2 OFFSET ?3".into(),
         vec![format!("%{term}%").into(), (limit as f64).into(), (offset as f64).into()])
    } else {
        ("SELECT slug,url,first_seen,last_seen,crawl_id,http_status,created_at FROM ashby_boards ORDER BY slug LIMIT ?1 OFFSET ?2".into(),
         vec![(limit as f64).into(), (offset as f64).into()])
    };

    let rows = db.prepare(&q).bind(&binds)?.all().await?.results::<serde_json::Value>()?;

    let count_q = if let Some(ref term) = search {
        db.prepare("SELECT COUNT(*) as count FROM ashby_boards WHERE slug LIKE ?1")
            .bind(&[format!("%{term}%").into()])?
            .first::<serde_json::Value>(None).await?
    } else {
        db.prepare("SELECT COUNT(*) as count FROM ashby_boards")
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
    let total = db.prepare("SELECT COUNT(*) as count FROM ashby_boards")
        .bind(&[])?.first::<serde_json::Value>(None).await?
        .and_then(|r| r["count"].as_f64()).unwrap_or(0.0) as u64;
    let by_crawl = db.prepare("SELECT crawl_id, COUNT(*) as count FROM ashby_boards GROUP BY crawl_id")
        .bind(&[])?.all().await?.results::<serde_json::Value>()?;
    let newest = db.prepare("SELECT slug,url,last_seen FROM ashby_boards ORDER BY last_seen DESC LIMIT 10")
        .bind(&[])?.all().await?.results::<serde_json::Value>()?;
    Response::from_json(&ApiResponse::success(serde_json::json!({
        "total_boards": total, "by_crawl": by_crawl, "newest_boards": newest,
    })))
}

// ═══════════════════════════════════════════════════════════════════════════
// ROUTER
// ═══════════════════════════════════════════════════════════════════════════

#[event(fetch)]
async fn main(req: Request, env: Env, _ctx: Context) -> Result<Response> {
    Router::new()
        // Core crawl
        .get_async("/crawl", handle_crawl)
        .get_async("/boards", handle_list_boards)
        .get_async("/indexes", handle_indexes)
        .get_async("/progress", handle_progress)
        .delete_async("/progress", handle_reset_progress)
        .get_async("/stats", handle_stats)
        // Rig-powered endpoints
        .get_async("/search", handle_search)        // Vector store semantic search
        .get_async("/enrich", handle_enrich)        // Pipeline on single board
        .get_async("/enrich-all", handle_enrich_all)// Pipeline on batch
        .get_async("/tools", handle_tools)          // Tool schemas (function-calling ready)
        // Root
        .get("/", |_, _| {
            Response::from_json(&serde_json::json!({
                "service": "ashby-crawler v0.2 (rig-enhanced)",
                "core_endpoints": {
                    "GET /crawl":       "Crawl CC index → D1. ?crawl_id=&pages_per_run=",
                    "GET /boards":      "List/search boards. ?limit=&offset=&search=",
                    "GET /indexes":     "Available CC indexes",
                    "GET /progress":    "Crawl progress",
                    "DELETE /progress": "Reset a crawl. ?crawl_id=",
                    "GET /stats":       "Summary stats",
                },
                "rig_endpoints": {
                    "GET /search":      "Semantic vector search (TF-IDF). ?q=&top_n=",
                    "GET /enrich":      "Run enrichment pipeline. ?slug=",
                    "GET /enrich-all":  "Batch enrich + tag distribution. ?limit=",
                    "GET /tools":       "OpenAI-compatible tool/function schemas",
                },
            }))
        })
        .run(req, env)
        .await
}
