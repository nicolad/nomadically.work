/// 20 parallel DeepSeek agents for backend interview prep.
/// Agents #2, #14, #17, #20 use Semantic Scholar for research-backed insights.
use crate::agent::Client;
use crate::d1::D1Client;
use crate::tools::{GetPaperDetail, SearchPapers};
use anyhow::{Context, Result};
use semantic_scholar::SemanticScholarClient;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::sync::Arc;
use tracing::{error, info};

// ─── BackendPrep JSON shape ─────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct BackendPrep {
    pub system_design: BackendSection,
    pub distributed_systems: BackendSection,
    pub database_design: BackendSection,
    pub sql_optimization: BackendSection,
    pub nosql_patterns: BackendSection,
    pub api_design: BackendSection,
    pub auth_security: BackendSection,
    pub caching: BackendSection,
    pub message_queues: BackendSection,
    pub microservices: BackendSection,
    pub testing: BackendSection,
    pub devops: BackendSection,
    pub security_owasp: BackendSection,
    pub performance: BackendSection,
    pub concurrency_async: BackendSection,
    pub observability: BackendSection,
    pub event_driven: BackendSection,
    pub serverless_edge: BackendSection,
    pub typescript_node: BackendSection,
    pub ai_ml_integration: BackendSection,
    pub generated_at: String,
}

#[derive(Debug, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct BackendSection {
    #[serde(default)]
    pub title: String,
    #[serde(default)]
    pub overview: String,
    #[serde(default)]
    pub key_concepts: Vec<String>,
    #[serde(default)]
    pub deep_dive: String,
    #[serde(default)]
    pub interview_questions: Vec<InterviewQuestion>,
    #[serde(default)]
    pub code_examples: Vec<CodeExample>,
    #[serde(default)]
    pub common_pitfalls: Vec<String>,
    #[serde(default)]
    pub talking_points: Vec<String>,
    #[serde(default)]
    pub research_insights: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InterviewQuestion {
    pub question: String,
    pub ideal_answer: String,
    #[serde(default)]
    pub follow_ups: Vec<String>,
    pub difficulty: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CodeExample {
    pub title: String,
    pub language: String,
    pub code: String,
    pub explanation: String,
}

// ─── Application row from D1 ───────────────────────────────────────────────

#[derive(Debug, Deserialize)]
struct AppRow {
    job_title: Option<String>,
    company_name: Option<String>,
    job_description: Option<String>,
}

// ─── Section definition ─────────────────────────────────────────────────────

struct BackendSectionDef {
    slug: &'static str,
    title: &'static str,
    prompt_template: &'static str,
    max_tokens: u32,
    use_scholar: bool,
}

const SECTION_JSON_SCHEMA: &str = r#"Return ONLY valid JSON with this exact shape (no markdown fences):
{
  "title": "...",
  "overview": "2-3 paragraph overview in markdown",
  "keyConcepts": ["concept1", "concept2", ...],
  "deepDive": "detailed markdown content with headers, 800+ words",
  "interviewQuestions": [
    {"question": "...", "idealAnswer": "...", "followUps": ["..."], "difficulty": "easy|medium|hard|expert"}
  ],
  "codeExamples": [
    {"title": "...", "language": "typescript|rust|sql|etc", "code": "...", "explanation": "..."}
  ],
  "commonPitfalls": ["pitfall1", "pitfall2", ...],
  "talkingPoints": ["point1", "point2", ...],
  "researchInsights": "markdown with citations if available"
}"#;

const SECTIONS: &[BackendSectionDef] = &[
    BackendSectionDef {
        slug: "system_design",
        title: "System Design",
        prompt_template: "{ctx}\n\nCreate a comprehensive backend interview prep section on SYSTEM DESIGN tailored to this role. Cover: designing scalable architectures, load balancing, CDNs, horizontal vs vertical scaling, capacity estimation, and trade-offs (CAP theorem, consistency models). Include 4 interview questions with ideal answers specific to this company's domain. Provide 2 code/diagram examples showing system design patterns relevant to their stack.\n\n{schema}",
        max_tokens: 8192,
        use_scholar: false,
    },
    BackendSectionDef {
        slug: "distributed_systems",
        title: "Distributed Systems",
        prompt_template: "{ctx}\n\nSearch for academic papers on distributed systems, consensus algorithms, and distributed databases. Then create a backend interview prep section on DISTRIBUTED SYSTEMS tailored to this role. Cover: consensus (Raft, Paxos), distributed transactions (2PC, sagas), vector clocks, CRDTs, partition tolerance. Include 4 interview questions with research-backed ideal answers. Cite real papers.\n\n{schema}",
        max_tokens: 8192,
        use_scholar: true,
    },
    BackendSectionDef {
        slug: "database_design",
        title: "Database Design & Modeling",
        prompt_template: "{ctx}\n\nCreate a backend interview prep section on DATABASE DESIGN tailored to this role. Cover: normalization (1NF-BCNF), denormalization strategies, indexing (B-tree, hash, GIN, GiST), schema design patterns (star schema, EAV), migrations. Include 4 interview questions with ideal answers referencing their likely database stack. Provide SQL examples.\n\n{schema}",
        max_tokens: 8192,
        use_scholar: false,
    },
    BackendSectionDef {
        slug: "sql_optimization",
        title: "SQL Query Optimization",
        prompt_template: "{ctx}\n\nCreate a backend interview prep section on SQL QUERY OPTIMIZATION tailored to this role. Cover: EXPLAIN plans, index strategies, query rewriting, N+1 problems, connection pooling, prepared statements, CTEs vs subqueries, window functions. Include 4 interview questions with ideal answers. Provide before/after SQL optimization examples.\n\n{schema}",
        max_tokens: 8192,
        use_scholar: false,
    },
    BackendSectionDef {
        slug: "nosql_patterns",
        title: "NoSQL & Data Store Patterns",
        prompt_template: "{ctx}\n\nCreate a backend interview prep section on NOSQL AND DATA STORE PATTERNS tailored to this role. Cover: document stores (MongoDB), key-value (Redis), column-family (Cassandra), graph (Neo4j), time-series (InfluxDB), choosing the right store. Include 4 interview questions with ideal answers. Provide data modeling examples for their domain.\n\n{schema}",
        max_tokens: 8192,
        use_scholar: false,
    },
    BackendSectionDef {
        slug: "api_design",
        title: "API Design & Protocols",
        prompt_template: "{ctx}\n\nCreate a backend interview prep section on API DESIGN tailored to this role. Cover: REST best practices, GraphQL (schema design, N+1, DataLoader), gRPC, WebSockets, API versioning, pagination (cursor vs offset), rate limiting, HATEOAS. Include 4 interview questions with ideal answers specific to their API stack. Provide code examples.\n\n{schema}",
        max_tokens: 8192,
        use_scholar: false,
    },
    BackendSectionDef {
        slug: "auth_security",
        title: "Authentication & Authorization",
        prompt_template: "{ctx}\n\nCreate a backend interview prep section on AUTH & SECURITY tailored to this role. Cover: OAuth 2.0 / OIDC, JWT (structure, rotation, revocation), session management, RBAC vs ABAC, API key patterns, CORS, CSRF, secure cookie flags. Include 4 interview questions with ideal answers. Provide code examples for their auth stack.\n\n{schema}",
        max_tokens: 8192,
        use_scholar: false,
    },
    BackendSectionDef {
        slug: "caching",
        title: "Caching Strategies",
        prompt_template: "{ctx}\n\nCreate a backend interview prep section on CACHING STRATEGIES tailored to this role. Cover: cache-aside, read-through, write-through, write-behind, CDN caching, HTTP cache headers, Redis patterns, cache invalidation strategies, thundering herd, cache stampede prevention. Include 4 interview questions with ideal answers. Provide implementation examples.\n\n{schema}",
        max_tokens: 8192,
        use_scholar: false,
    },
    BackendSectionDef {
        slug: "message_queues",
        title: "Message Queues & Async Processing",
        prompt_template: "{ctx}\n\nCreate a backend interview prep section on MESSAGE QUEUES tailored to this role. Cover: Kafka, RabbitMQ, SQS, pub/sub patterns, exactly-once semantics, dead letter queues, backpressure, idempotency, saga pattern with queues. Include 4 interview questions with ideal answers. Provide architecture diagrams in ASCII and code examples.\n\n{schema}",
        max_tokens: 8192,
        use_scholar: false,
    },
    BackendSectionDef {
        slug: "microservices",
        title: "Microservices Architecture",
        prompt_template: "{ctx}\n\nCreate a backend interview prep section on MICROSERVICES tailored to this role. Cover: service decomposition, API gateway, service mesh, circuit breakers, bulkhead pattern, sidecar, strangler fig migration, inter-service communication (sync vs async), data ownership. Include 4 interview questions with ideal answers. Provide practical examples.\n\n{schema}",
        max_tokens: 8192,
        use_scholar: false,
    },
    BackendSectionDef {
        slug: "testing",
        title: "Testing Strategies",
        prompt_template: "{ctx}\n\nCreate a backend interview prep section on TESTING STRATEGIES tailored to this role. Cover: unit/integration/e2e testing pyramid, contract testing (Pact), property-based testing, mutation testing, test doubles (mocks/stubs/fakes), load testing (k6, Artillery), chaos engineering. Include 4 interview questions with ideal answers. Provide test code examples for their stack.\n\n{schema}",
        max_tokens: 8192,
        use_scholar: false,
    },
    BackendSectionDef {
        slug: "devops",
        title: "DevOps & CI/CD",
        prompt_template: "{ctx}\n\nCreate a backend interview prep section on DEVOPS & CI/CD tailored to this role. Cover: Docker (multi-stage builds, layer caching), Kubernetes (pods, services, deployments, HPA), CI/CD pipelines, blue-green/canary deployments, GitOps, Infrastructure as Code (Terraform, Pulumi). Include 4 interview questions with ideal answers.\n\n{schema}",
        max_tokens: 8192,
        use_scholar: false,
    },
    BackendSectionDef {
        slug: "security_owasp",
        title: "Security & OWASP",
        prompt_template: "{ctx}\n\nCreate a backend interview prep section on SECURITY & OWASP tailored to this role. Cover: OWASP Top 10 (2021), SQL injection, XSS, SSRF, IDOR, supply chain attacks, secrets management, CSP headers, HTTPS/TLS, input validation, output encoding. Include 4 interview questions with ideal answers. Provide secure vs insecure code examples.\n\n{schema}",
        max_tokens: 8192,
        use_scholar: false,
    },
    BackendSectionDef {
        slug: "performance",
        title: "Performance Engineering",
        prompt_template: "{ctx}\n\nSearch for academic papers on web application performance, latency optimization, and backend scalability. Then create a backend interview prep section on PERFORMANCE ENGINEERING tailored to this role. Cover: profiling, flame graphs, p99 latency, database query optimization, connection pooling, lazy loading, pagination, compression. Include 4 interview questions with research-backed answers. Cite papers.\n\n{schema}",
        max_tokens: 8192,
        use_scholar: true,
    },
    BackendSectionDef {
        slug: "concurrency_async",
        title: "Concurrency & Async Patterns",
        prompt_template: "{ctx}\n\nCreate a backend interview prep section on CONCURRENCY & ASYNC PATTERNS tailored to this role. Cover: event loop (Node.js), async/await, promises, worker threads, race conditions, deadlocks, mutexes, semaphores, actor model, CSP. Include 4 interview questions with ideal answers. Provide code examples showing common concurrency bugs and fixes.\n\n{schema}",
        max_tokens: 8192,
        use_scholar: false,
    },
    BackendSectionDef {
        slug: "observability",
        title: "Observability & Monitoring",
        prompt_template: "{ctx}\n\nCreate a backend interview prep section on OBSERVABILITY tailored to this role. Cover: three pillars (logs, metrics, traces), OpenTelemetry, structured logging, distributed tracing, SLOs/SLIs/SLAs, alerting strategies, Grafana/Prometheus, error budgets, on-call practices. Include 4 interview questions with ideal answers. Provide instrumentation examples.\n\n{schema}",
        max_tokens: 8192,
        use_scholar: false,
    },
    BackendSectionDef {
        slug: "event_driven",
        title: "Event-Driven Architecture",
        prompt_template: "{ctx}\n\nSearch for academic papers on event-driven architecture, event sourcing, and CQRS. Then create a backend interview prep section on EVENT-DRIVEN ARCHITECTURE tailored to this role. Cover: event sourcing, CQRS, domain events, event stores, eventual consistency, projections, snapshotting, event schema evolution. Include 4 interview questions with research-backed answers. Cite papers.\n\n{schema}",
        max_tokens: 8192,
        use_scholar: true,
    },
    BackendSectionDef {
        slug: "serverless_edge",
        title: "Serverless & Edge Computing",
        prompt_template: "{ctx}\n\nCreate a backend interview prep section on SERVERLESS & EDGE COMPUTING tailored to this role. Cover: Lambda/Workers/Deno Deploy, cold starts, edge functions, D1/KV/R2, Vercel serverless, function composition, state management in serverless, cost modeling. Include 4 interview questions with ideal answers. Provide architecture examples.\n\n{schema}",
        max_tokens: 8192,
        use_scholar: false,
    },
    BackendSectionDef {
        slug: "typescript_node",
        title: "TypeScript & Node.js Deep Dive",
        prompt_template: "{ctx}\n\nCreate a backend interview prep section on TYPESCRIPT & NODE.JS tailored to this role. Cover: type system (generics, conditional types, mapped types, template literals), Node.js internals (event loop phases, libuv, streams, backpressure), runtime performance (V8 optimization, memory leaks, garbage collection). Include 4 interview questions with ideal answers. Provide advanced TS code examples.\n\n{schema}",
        max_tokens: 8192,
        use_scholar: false,
    },
    BackendSectionDef {
        slug: "ai_ml_integration",
        title: "AI/ML Integration in Backend Systems",
        prompt_template: "{ctx}\n\nSearch for academic papers on integrating machine learning models into production systems, MLOps, and AI-powered applications. Then create a backend interview prep section on AI/ML INTEGRATION tailored to this role. Cover: embedding APIs (OpenAI, Anthropic), RAG architecture, vector databases, prompt engineering patterns, model serving, AI observability (Langfuse), guardrails. Include 4 interview questions with research-backed answers. Cite papers.\n\n{schema}",
        max_tokens: 8192,
        use_scholar: true,
    },
];

// ─── Main entry point ───────────────────────────────────────────────────────

pub async fn run(
    app_id: i64,
    api_key: &str,
    scholar: &SemanticScholarClient,
    d1: &D1Client,
) -> Result<()> {
    // 1. Fetch application from D1
    let rows = d1
        .query(
            "SELECT job_title, company_name, job_description FROM applications WHERE id = ?1",
            vec![json!(app_id)],
        )
        .await
        .context("fetching application from D1")?;

    let row_val = rows.into_iter().next().context("Application not found")?;
    let app: AppRow = serde_json::from_value(row_val).context("parsing application row")?;

    let job_title = app.job_title.unwrap_or_else(|| "software engineer".into());
    let company = app.company_name.unwrap_or_else(|| "the company".into());
    let job_desc = app
        .job_description
        .context("No job description on this application")?;

    // Strip HTML tags and limit
    let plain_desc = strip_html(&job_desc);
    let plain_desc = if plain_desc.len() > 8000 {
        &plain_desc[..8000]
    } else {
        &plain_desc
    };

    let ctx = format!("Role: {job_title} at {company}\n\nJob Description:\n{plain_desc}");

    info!(app_id, job_title = %job_title, company = %company, "Fetched application, spawning 20 backend prep agents");

    // 2. Spawn 20 parallel agents
    let api_key = Arc::new(api_key.to_string());
    let ctx = Arc::new(ctx);
    let scholar = Arc::new(scholar.clone());

    let mut handles = Vec::with_capacity(SECTIONS.len());

    for def in SECTIONS {
        let api_key = Arc::clone(&api_key);
        let ctx = Arc::clone(&ctx);
        let scholar = Arc::clone(&scholar);

        let handle = tokio::spawn(async move {
            info!(section = def.slug, "Backend agent starting");
            let result = run_section_agent(def, &api_key, &ctx, &scholar).await;
            match &result {
                Ok(val) => info!(section = def.slug, len = val.to_string().len(), "Backend agent done"),
                Err(e) => error!(section = def.slug, "Backend agent failed: {e}"),
            }
            (def.slug, result)
        });

        handles.push(handle);
    }

    // 3. Collect results
    let mut data = BackendPrep {
        generated_at: chrono::Utc::now().to_rfc3339(),
        ..Default::default()
    };

    let mut successes = 0;
    let mut failures = 0;

    for handle in handles {
        let (slug, result) = handle.await.context("task panicked")?;
        match result {
            Ok(val) => {
                apply_section(&mut data, slug, val);
                successes += 1;
            }
            Err(e) => {
                error!(section = slug, "Failed: {e}");
                failures += 1;
            }
        }
    }

    info!(successes, failures, "All 20 backend prep agents complete");

    // Save if we have any content at all — partial data is better than nothing
    if successes == 0 {
        anyhow::bail!("All 20 agents failed — nothing to save");
    }

    // 4. Write back to D1
    let json_str = serde_json::to_string(&data)?;
    info!(app_id, bytes = json_str.len(), "Writing backend prep to D1");

    d1.execute(
        "UPDATE applications SET ai_backend_prep = ?1, updated_at = datetime('now') WHERE id = ?2",
        vec![json_str.into(), json!(app_id)],
    )
    .await
    .context("writing backend prep data to D1")?;

    info!(app_id, "Backend prep data saved to D1");
    Ok(())
}

// ─── Run a single section agent ─────────────────────────────────────────────

async fn run_section_agent(
    def: &BackendSectionDef,
    api_key: &str,
    ctx: &str,
    scholar: &SemanticScholarClient,
) -> Result<Value> {
    let prompt = def
        .prompt_template
        .replace("{ctx}", ctx)
        .replace("{schema}", SECTION_JSON_SCHEMA);

    let system = format!(
        "You are a senior backend engineer and technical interviewer preparing a candidate for a backend-focused role. \
         Topic: {}. Return ONLY valid JSON — no markdown fences, no extra commentary.",
        def.title,
    );

    if def.use_scholar {
        let system_scholar = format!(
            "You are a senior backend engineer and technical interviewer with access to the Semantic Scholar API. \
             Topic: {}. Research real papers, then create interview prep content. Return ONLY valid JSON — no markdown fences.",
            def.title,
        );

        let client = Client::new(api_key);
        let agent = client
            .agent("deepseek-chat")
            .preamble(&system_scholar)
            .tool(SearchPapers(scholar.clone()))
            .tool(GetPaperDetail(scholar.clone()))
            .build();

        let raw = agent.prompt(prompt).await?;
        Ok(try_parse_json(&raw))
    } else {
        let http = reqwest::Client::new();
        let body = json!({
            "model": "deepseek-chat",
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": prompt},
            ],
            "max_tokens": def.max_tokens,
            "temperature": 0.7,
        });

        let resp: Value = http
            .post("https://api.deepseek.com/v1/chat/completions")
            .bearer_auth(api_key)
            .json(&body)
            .send()
            .await
            .context("DeepSeek API request failed")?
            .error_for_status()
            .context("DeepSeek API error")?
            .json()
            .await
            .context("parsing DeepSeek response")?;

        let content = resp["choices"][0]["message"]["content"]
            .as_str()
            .unwrap_or("");

        // DeepSeek reasoner may put content in reasoning_content
        let reasoning = resp["choices"][0]["message"]["reasoning_content"]
            .as_str()
            .unwrap_or("");

        let raw_text = if content.is_empty() && !reasoning.is_empty() {
            reasoning
        } else {
            content
        };

        info!(section = def.slug, raw_len = raw_text.len(), "Raw response received");

        let cleaned = raw_text
            .replace("```json\n", "")
            .replace("```json", "")
            .replace("```\n", "")
            .replace("```", "")
            .trim()
            .to_string();

        let parsed = try_parse_json(&cleaned);
        if parsed.as_object().map_or(true, |o| o.is_empty()) {
            // Log first and last 300 chars for debugging
            let preview: String = raw_text.chars().take(300).collect();
            let tail: String = raw_text.chars().rev().take(300).collect::<String>().chars().rev().collect();
            error!(section = def.slug, "Failed to parse JSON. Head: {preview}");
            error!(section = def.slug, "Failed to parse JSON. Tail: {tail}");
        }

        Ok(parsed)
    }
}

/// Strip HTML tags and normalize whitespace.
fn strip_html(html: &str) -> String {
    html.replace(|c: char| c == '<', " <")
        .split('<')
        .map(|s| {
            if let Some(idx) = s.find('>') {
                &s[idx + 1..]
            } else {
                s
            }
        })
        .collect::<Vec<_>>()
        .join(" ")
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
}

/// Parse JSON from LLM output, handling markdown fences, `<think>` blocks, and embedded JSON.
fn try_parse_json(raw: &str) -> Value {
    // Strip <think>...</think> blocks from DeepSeek Reasoner
    let text = if let Some(end) = raw.find("</think>") {
        raw[end + 8..].trim()
    } else {
        raw.trim()
    };

    // 1. Direct parse
    if let Ok(v) = serde_json::from_str::<Value>(text) {
        return v;
    }

    // 2. Extract content between ```json ... ``` fences (greedy — take the LAST ```)
    if let Some(fence_start) = text.find("```json") {
        let after_fence = &text[fence_start + 7..]; // skip "```json"
        let after_fence = after_fence.trim_start_matches('\n');
        // Strip trailing ``` with optional whitespace/newlines
        let stripped = after_fence.trim_end();
        let stripped = if stripped.ends_with("```") {
            stripped[..stripped.len() - 3].trim_end()
        } else {
            stripped
        };
        if let Ok(v) = serde_json::from_str::<Value>(stripped) {
            return v;
        }
        // Try finding last \n``` pattern
        if let Some(fence_end) = after_fence.rfind("\n```") {
            let json_block = after_fence[..fence_end].trim();
            if let Ok(v) = serde_json::from_str::<Value>(json_block) {
                return v;
            }
        }
    }

    // 3. Extract content between ``` ... ``` (non-json fences)
    if let Some(fence_start) = text.find("```\n") {
        let after_fence = &text[fence_start + 4..];
        if let Some(fence_end) = after_fence.rfind("\n```") {
            let json_block = after_fence[..fence_end].trim();
            if let Ok(v) = serde_json::from_str::<Value>(json_block) {
                return v;
            }
        }
    }

    // 4. Find first { and try to parse from there to end
    if let Some(start) = text.find('{') {
        let sub = &text[start..];
        // Strip trailing ``` if present
        let sub = sub.trim_end().trim_end_matches("```").trim();
        // Try parsing the whole remainder (serde handles nested braces correctly)
        if let Ok(v) = serde_json::from_str::<Value>(sub) {
            return v;
        }
        // Try from last } backwards
        if let Some(end) = sub.rfind('}') {
            if let Ok(v) = serde_json::from_str::<Value>(&sub[..=end]) {
                return v;
            }
        }
    }

    json!({})
}

/// Apply a parsed JSON section to the BackendPrep struct.
fn apply_section(data: &mut BackendPrep, slug: &str, val: Value) {
    let section: BackendSection = serde_json::from_value(val).unwrap_or_default();
    match slug {
        "system_design" => data.system_design = section,
        "distributed_systems" => data.distributed_systems = section,
        "database_design" => data.database_design = section,
        "sql_optimization" => data.sql_optimization = section,
        "nosql_patterns" => data.nosql_patterns = section,
        "api_design" => data.api_design = section,
        "auth_security" => data.auth_security = section,
        "caching" => data.caching = section,
        "message_queues" => data.message_queues = section,
        "microservices" => data.microservices = section,
        "testing" => data.testing = section,
        "devops" => data.devops = section,
        "security_owasp" => data.security_owasp = section,
        "performance" => data.performance = section,
        "concurrency_async" => data.concurrency_async = section,
        "observability" => data.observability = section,
        "event_driven" => data.event_driven = section,
        "serverless_edge" => data.serverless_edge = section,
        "typescript_node" => data.typescript_node = section,
        "ai_ml_integration" => data.ai_ml_integration = section,
        _ => {}
    }
}
