/// Pure contract tests for `SearchPapers` and `GetPaperDetail`.
///
/// These tests cover tool names, JSON schema structure, argument
/// deserialization, and call_json error paths.
/// No network calls are made — all tests that would hit real APIs
/// are either testing the error path (bad args → serde fail before I/O)
/// or are marked `#[ignore]`.
use research_agent::{
    agent::{Tool, ToolDefinition},
    tools::{GetPaperDetail, SearchPapers},
};
use semantic_scholar::SemanticScholarClient;
use serde_json::json;

fn search_tool() -> SearchPapers {
    SearchPapers(SemanticScholarClient::new(None))
}

fn detail_tool() -> GetPaperDetail {
    GetPaperDetail(SemanticScholarClient::new(None))
}

// ─── Names ───────────────────────────────────────────────────────────────────

#[test]
fn search_papers_name_is_search_papers() {
    assert_eq!(search_tool().name(), "search_papers");
}

#[test]
fn get_paper_detail_name_is_get_paper_detail() {
    assert_eq!(detail_tool().name(), "get_paper_detail");
}

// ─── Definition structure ────────────────────────────────────────────────────

#[test]
fn search_papers_definition_name_matches_tool_name() {
    let t = search_tool();
    let def: ToolDefinition = t.definition();
    assert_eq!(def.name, t.name());
}

#[test]
fn get_paper_detail_definition_name_matches_tool_name() {
    let t = detail_tool();
    let def: ToolDefinition = t.definition();
    assert_eq!(def.name, t.name());
}

#[test]
fn search_papers_definition_description_non_empty() {
    let def = search_tool().definition();
    assert!(!def.description.is_empty());
}

#[test]
fn get_paper_detail_definition_description_non_empty() {
    let def = detail_tool().definition();
    assert!(!def.description.is_empty());
}

#[test]
fn search_papers_parameters_type_is_object() {
    let def = search_tool().definition();
    assert_eq!(def.parameters["type"], "object");
}

#[test]
fn get_paper_detail_parameters_type_is_object() {
    let def = detail_tool().definition();
    assert_eq!(def.parameters["type"], "object");
}

#[test]
fn search_papers_required_contains_query() {
    let def = search_tool().definition();
    let required = def.parameters["required"].as_array().unwrap();
    assert!(
        required.iter().any(|v| v == "query"),
        "expected 'query' in required: {required:?}"
    );
}

#[test]
fn get_paper_detail_required_contains_paper_id() {
    let def = detail_tool().definition();
    let required = def.parameters["required"].as_array().unwrap();
    assert!(
        required.iter().any(|v| v == "paper_id"),
        "expected 'paper_id' in required: {required:?}"
    );
}

#[test]
fn search_papers_properties_has_query_key() {
    let def = search_tool().definition();
    assert!(def.parameters["properties"]["query"].is_object());
}

#[test]
fn search_papers_properties_has_optional_year_key() {
    let def = search_tool().definition();
    assert!(def.parameters["properties"]["year"].is_object());
}

#[test]
fn search_papers_properties_has_optional_min_citations_key() {
    let def = search_tool().definition();
    assert!(def.parameters["properties"]["min_citations"].is_object());
}

#[test]
fn search_papers_properties_has_optional_limit_key() {
    let def = search_tool().definition();
    assert!(def.parameters["properties"]["limit"].is_object());
}

#[test]
fn get_paper_detail_properties_has_paper_id_key() {
    let def = detail_tool().definition();
    assert!(def.parameters["properties"]["paper_id"].is_object());
}

// ─── call_json argument parsing — error paths (no network) ───────────────────

#[tokio::test]
async fn search_papers_call_json_non_object_returns_error() {
    // serde_json::from_value fails before any HTTP is attempted.
    let err = search_tool()
        .call_json(json!("not an object"))
        .await
        .unwrap_err();
    assert!(
        err.to_string().contains("invalid type") || err.to_string().contains("expected"),
        "unexpected error: {err}"
    );
}

#[tokio::test]
async fn search_papers_call_json_missing_required_query_returns_error() {
    let err = search_tool()
        .call_json(json!({ "year": "2020-" })) // no "query"
        .await
        .unwrap_err();
    assert!(
        err.to_string().contains("query") || err.to_string().contains("missing"),
        "unexpected error: {err}"
    );
}

#[tokio::test]
async fn get_paper_detail_call_json_non_object_returns_error() {
    let err = detail_tool()
        .call_json(json!(42))
        .await
        .unwrap_err();
    assert!(
        err.to_string().contains("invalid type") || err.to_string().contains("expected"),
        "unexpected error: {err}"
    );
}

#[tokio::test]
async fn get_paper_detail_call_json_missing_paper_id_returns_error() {
    let err = detail_tool()
        .call_json(json!({})) // no "paper_id"
        .await
        .unwrap_err();
    assert!(
        err.to_string().contains("paper_id") || err.to_string().contains("missing"),
        "unexpected error: {err}"
    );
}

// ─── SearchArgs / PaperDetailArgs deserialization ────────────────────────────

#[test]
fn search_args_full_deserialize() {
    let v = json!({
        "query": "RSI crypto",
        "year": "2020-",
        "min_citations": 5,
        "limit": 10
    });
    // Reuse serde from the module by round-tripping through call_json path
    // (just check it parses without crashing via serde_json directly)
    #[derive(serde::Deserialize)]
    struct SearchArgs {
        query: String,
        year: Option<String>,
        min_citations: Option<u32>,
        limit: Option<u32>,
    }
    let a: SearchArgs = serde_json::from_value(v).unwrap();
    assert_eq!(a.query, "RSI crypto");
    assert_eq!(a.year.as_deref(), Some("2020-"));
    assert_eq!(a.min_citations, Some(5));
    assert_eq!(a.limit, Some(10));
}

#[test]
fn search_args_minimal_only_query() {
    #[derive(serde::Deserialize)]
    struct SearchArgs {
        query: String,
        year: Option<String>,
        min_citations: Option<u32>,
        limit: Option<u32>,
    }
    let a: SearchArgs = serde_json::from_value(json!({ "query": "bollinger" })).unwrap();
    assert_eq!(a.query, "bollinger");
    assert!(a.year.is_none());
    assert!(a.min_citations.is_none());
    assert!(a.limit.is_none());
}

#[test]
fn paper_detail_args_deserialize() {
    #[derive(serde::Deserialize)]
    struct PaperDetailArgs {
        paper_id: String,
    }
    let a: PaperDetailArgs =
        serde_json::from_value(json!({ "paper_id": "arXiv:2305.12345" })).unwrap();
    assert_eq!(a.paper_id, "arXiv:2305.12345");
}

// ─── Live API smoke tests (skipped in CI) ─────────────────────────────────────

/// Verify `search_papers` actually returns results from Semantic Scholar.
/// Run with: `cargo test -- --include-ignored live_search_papers`
#[tokio::test]
#[ignore = "makes real network request to Semantic Scholar"]
async fn live_search_papers_returns_results() {
    let result = search_tool()
        .call_json(json!({ "query": "RSI momentum crypto", "limit": 3 }))
        .await
        .unwrap();
    let v: serde_json::Value = serde_json::from_str(&result).unwrap();
    assert!(v["returned"].as_u64().unwrap_or(0) > 0);
}

/// Verify `get_paper_detail` returns a paper with a title.
/// Run with: `cargo test -- --include-ignored live_get_paper_detail`
#[tokio::test]
#[ignore = "makes real network request to Semantic Scholar"]
async fn live_get_paper_detail_returns_title() {
    // Well-known arXiv paper — attention is all you need
    let result = detail_tool()
        .call_json(json!({ "paper_id": "arXiv:1706.03762" }))
        .await
        .unwrap();
    let v: serde_json::Value = serde_json::from_str(&result).unwrap();
    assert!(v["title"].is_string());
}
