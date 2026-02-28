use crate::rig_compat;

/// Define the available tools (Rig Tool pattern).
pub fn define_tools() -> Vec<rig_compat::ToolDefinition> {
    vec![
        rig_compat::ToolDefinition {
            name: "search_boards".into(),
            description: "Semantic search over discovered ATS job boards by company name or keyword".into(),
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
            description: "Trigger a Common Crawl index crawl for ATS boards".into(),
            parameters: vec![
                rig_compat::ToolParam {
                    name: "crawl_id".into(),
                    description: "Common Crawl index ID, e.g. CC-MAIN-2025-05".into(),
                    r#type: "string".into(),
                    required: true,
                },
                rig_compat::ToolParam {
                    name: "provider".into(),
                    description: "ATS provider: ashby or greenhouse (default: ashby)".into(),
                    r#type: "string".into(),
                    required: false,
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
        rig_compat::ToolDefinition {
            name: "analyze_tech_stack".into(),
            description: "Extract tech stack (languages, frameworks, infra, AI/ML) from job text".into(),
            parameters: vec![
                rig_compat::ToolParam { name: "text".into(), description: "Job description text".into(), r#type: "string".into(), required: true },
            ],
        },
        rig_compat::ToolDefinition {
            name: "score_remote_eu".into(),
            description: "Score a job's remote-EU compatibility (0-100) with positive signals and red flags".into(),
            parameters: vec![
                rig_compat::ToolParam { name: "text".into(), description: "Job description text".into(), r#type: "string".into(), required: true },
            ],
        },
        rig_compat::ToolDefinition {
            name: "extract_agentic_patterns".into(),
            description: "Detect agentic/AI coding patterns (RAG, tool use, agents, prompt engineering) in job text".into(),
            parameters: vec![
                rig_compat::ToolParam { name: "text".into(), description: "Job description text".into(), r#type: "string".into(), required: true },
            ],
        },
        rig_compat::ToolDefinition {
            name: "match_skills".into(),
            description: "BM25 match job requirements against candidate skills profile, returning fit score".into(),
            parameters: vec![
                rig_compat::ToolParam { name: "text".into(), description: "Job description text".into(), r#type: "string".into(), required: true },
            ],
        },
        rig_compat::ToolDefinition {
            name: "classify_seniority".into(),
            description: "Classify job seniority level (entry/junior/mid/senior/staff+) from description signals".into(),
            parameters: vec![
                rig_compat::ToolParam { name: "text".into(), description: "Job description text".into(), r#type: "string".into(), required: true },
            ],
        },
        rig_compat::ToolDefinition {
            name: "detect_ats_provider".into(),
            description: "Detect ATS provider (Ashby, Greenhouse, Lever, etc.) from URL or text".into(),
            parameters: vec![
                rig_compat::ToolParam { name: "url".into(), description: "URL or text containing ATS provider indicators".into(), r#type: "string".into(), required: true },
            ],
        },
        rig_compat::ToolDefinition {
            name: "extract_salary_signals".into(),
            description: "Extract salary, compensation, equity, and benefits signals from job text".into(),
            parameters: vec![
                rig_compat::ToolParam { name: "text".into(), description: "Job description text".into(), r#type: "string".into(), required: true },
            ],
        },
        rig_compat::ToolDefinition {
            name: "score_company_culture".into(),
            description: "Score engineering culture (async-first, testing, autonomy, learning) from job text".into(),
            parameters: vec![
                rig_compat::ToolParam { name: "text".into(), description: "Job description text".into(), r#type: "string".into(), required: true },
            ],
        },
        rig_compat::ToolDefinition {
            name: "generate_application_brief".into(),
            description: "Generate comprehensive application brief combining all analysis tools".into(),
            parameters: vec![
                rig_compat::ToolParam { name: "text".into(), description: "Job description text".into(), r#type: "string".into(), required: true },
                rig_compat::ToolParam { name: "job_title".into(), description: "Job title".into(), r#type: "string".into(), required: false },
                rig_compat::ToolParam { name: "company".into(), description: "Company name".into(), r#type: "string".into(), required: false },
            ],
        },
        rig_compat::ToolDefinition {
            name: "rank_job_fit".into(),
            description: "Composite scoring pipeline ranking overall job fit (remote-EU, skills, agentic, culture)".into(),
            parameters: vec![
                rig_compat::ToolParam { name: "text".into(), description: "Job description text".into(), r#type: "string".into(), required: true },
            ],
        },
    ]
}

/// Build the ToolRegistry — mirrors rig's agent tool registration.
pub fn build_tool_registry() -> rig_compat::ToolRegistry {
    let mut registry = rig_compat::ToolRegistry::new();

    registry.register(
        "search_boards",
        "BM25 search over ATS job boards (Ashby + Greenhouse). Args: {query: string, top_n?: number}",
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
        "Okapi BM25 probabilistic ranking over ATS job boards. Args: {query: string, top_n?: number}",
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
        "Trigger a Common Crawl CDX crawl for ATS boards. Args: {crawl_id: string, provider?: string, pages_per_run?: number}",
        |args| {
            let crawl_id = args.get("crawl_id").and_then(|v| v.as_str())
                .ok_or_else(|| "Missing required arg: crawl_id".to_string())?;
            let pages = args.get("pages_per_run").and_then(|v| v.as_u64()).unwrap_or(3);
            let provider = args.get("provider").and_then(|v| v.as_str()).unwrap_or("ashby");
            Ok(serde_json::json!({
                "action": "GET /crawl",
                "params": { "crawl_id": crawl_id, "pages_per_run": pages, "provider": provider },
            }))
        },
    );

    // ── Agent analysis tools ───────────────────────────────────────
    registry.register(
        "analyze_tech_stack",
        "Extract tech stack (languages, frameworks, infra, AI/ML) from job text. Args: {text: string}",
        |args| crate::agents::analyze_tech_stack(args),
    );

    registry.register(
        "score_remote_eu",
        "Score remote-EU compatibility (0-100). Args: {text: string}",
        |args| crate::agents::score_remote_eu(args),
    );

    registry.register(
        "extract_agentic_patterns",
        "Detect agentic/AI patterns in job text. Args: {text: string}",
        |args| crate::agents::extract_agentic_patterns(args),
    );

    registry.register(
        "match_skills",
        "BM25 match job requirements against candidate skills. Args: {text: string}",
        |args| crate::agents::match_skills(args),
    );

    registry.register(
        "classify_seniority",
        "Classify seniority level from job description. Args: {text: string}",
        |args| crate::agents::classify_seniority(args),
    );

    registry.register(
        "detect_ats_provider",
        "Detect ATS provider from URL or text. Args: {url: string}",
        |args| crate::agents::detect_ats_provider(args),
    );

    registry.register(
        "extract_salary_signals",
        "Extract salary, equity, and benefits signals. Args: {text: string}",
        |args| crate::agents::extract_salary_signals(args),
    );

    registry.register(
        "score_company_culture",
        "Score engineering culture signals. Args: {text: string}",
        |args| crate::agents::score_company_culture(args),
    );

    registry.register(
        "generate_application_brief",
        "Generate comprehensive application brief. Args: {text: string, job_title?: string, company?: string}",
        |args| crate::agents::generate_application_brief(args),
    );

    registry.register(
        "rank_job_fit",
        "Composite scoring pipeline for overall job fit. Args: {text: string}",
        |args| crate::agents::rank_job_fit(args),
    );

    registry
}
