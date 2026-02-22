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

    registry
}
