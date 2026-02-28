/// Live integration tests against the real DeepSeek API.
///
/// All tests are `#[ignore]` — run with:
///   DEEPSEEK_API_KEY=sk-... cargo test -p research-agent -- --include-ignored live_ds_
///
/// An optional `SEMANTIC_SCHOLAR_API_KEY` raises the rate-limit cap for tool tests.
use research_agent::{
    agent::Client,
    tools::{GetPaperDetail, SearchPapers},
};
use semantic_scholar::SemanticScholarClient;

// ─── Helper ──────────────────────────────────────────────────────────────────

fn api_key() -> String {
    std::env::var("DEEPSEEK_API_KEY")
        .expect("DEEPSEEK_API_KEY must be set to run live DeepSeek tests")
}

fn scholar() -> SemanticScholarClient {
    SemanticScholarClient::new(std::env::var("SEMANTIC_SCHOLAR_API_KEY").ok().as_deref())
}

// ─── Basic completion ─────────────────────────────────────────────────────────

/// Sanity check: deepseek-chat returns a non-empty response.
#[tokio::test]
#[ignore = "requires DEEPSEEK_API_KEY"]
async fn live_ds_chat_basic_response() {
    let agent = Client::new(&api_key())
        .agent("deepseek-chat")
        .preamble("You are a concise assistant. Reply in one sentence.")
        .build();

    let result = agent
        .prompt("What is RSI in trading? One sentence.".into())
        .await
        .unwrap();

    assert!(!result.trim().is_empty(), "response was empty");
    println!("deepseek-chat response: {result}");
}

/// deepseek-reasoner (R1) returns a non-empty response.
#[tokio::test]
#[ignore = "requires DEEPSEEK_API_KEY"]
async fn live_ds_reasoner_basic_response() {
    let agent = Client::new(&api_key())
        .agent("deepseek-reasoner")
        .preamble("You are a concise quantitative analyst. Reply in one sentence.")
        .build();

    let result = agent
        .prompt("What is the Sharpe ratio? One sentence.".into())
        .await
        .unwrap();

    assert!(!result.trim().is_empty(), "response was empty");
    println!("deepseek-reasoner response: {result}");
}

// ─── Tool call tests ──────────────────────────────────────────────────────────

/// Model calls `search_papers` at least once and returns a markdown report.
#[tokio::test]
#[ignore = "requires DEEPSEEK_API_KEY"]
async fn live_ds_tool_call_triggers_search_papers() {
    let agent = Client::new(&api_key())
        .agent("deepseek-chat")
        .preamble("You must call search_papers at least once, then answer.")
        .tool(SearchPapers(scholar()))
        .build();

    let result = agent
        .prompt(
            "Call search_papers with query \"RSI momentum cryptocurrency\" \
             and summarise what you found in 2 sentences."
                .into(),
        )
        .await
        .unwrap();

    assert!(!result.trim().is_empty());
    println!("tool-call response:\n{result}");
}

/// Model calls `get_paper_detail` on a well-known arXiv paper.
#[tokio::test]
#[ignore = "requires DEEPSEEK_API_KEY"]
async fn live_ds_tool_call_get_paper_detail() {
    let agent = Client::new(&api_key())
        .agent("deepseek-chat")
        .preamble("You must call get_paper_detail, then answer.")
        .tool(GetPaperDetail(scholar()))
        .build();

    let result = agent
        .prompt(
            "Call get_paper_detail with paper_id \"arXiv:1706.03762\" \
             and tell me the paper title."
                .into(),
        )
        .await
        .unwrap();

    assert!(!result.trim().is_empty());
    // The paper is "Attention Is All You Need" — title should appear.
    assert!(
        result.to_lowercase().contains("attention"),
        "expected title keyword 'attention' in response, got:\n{result}"
    );
    println!("get_paper_detail response:\n{result}");
}

/// Model uses both tools across multiple turns and returns a structured report.
#[tokio::test]
#[ignore = "requires DEEPSEEK_API_KEY"]
async fn live_ds_full_research_loop_returns_structured_output() {
    let agent = Client::new(&api_key())
        .agent("deepseek-chat")
        .preamble(
            "You are a quant research assistant. Use search_papers to find relevant papers, \
             then get_paper_detail on the most promising one. Return a brief markdown summary \
             with: paper title, year, key finding, and one concrete parameter recommendation.",
        )
        .tool(SearchPapers(scholar()))
        .tool(GetPaperDetail(scholar()))
        .build();

    let result = agent
        .prompt(
            "Research: optimal RSI period for mean-reversion in crypto markets. \
             Use the tools to find evidence, then give your recommendation."
                .into(),
        )
        .await
        .unwrap();

    assert!(!result.trim().is_empty());

    // Result should look like a markdown report with some structure.
    let lower = result.to_lowercase();
    assert!(
        lower.contains("rsi") || lower.contains("period") || lower.contains("mean"),
        "response missing expected keywords:\n{result}"
    );
    println!("full research loop response:\n{result}");
}

// ─── Error handling ───────────────────────────────────────────────────────────

/// An invalid API key returns an HTTP 401 / auth error.
#[tokio::test]
#[ignore = "requires DEEPSEEK_API_KEY (uses a bad key on purpose)"]
async fn live_ds_invalid_api_key_returns_error() {
    let agent = Client::new("sk-invalid-key-for-testing")
        .agent("deepseek-chat")
        .build();

    let err = agent
        .prompt("hello".into())
        .await
        .unwrap_err();

    let msg = err.to_string();
    assert!(
        msg.contains("error status") || msg.contains("401") || msg.contains("403"),
        "expected auth error, got: {msg}"
    );
}

// ─── Response content assertions ─────────────────────────────────────────────

/// Response must be a valid UTF-8 string (not binary / truncated JSON).
#[tokio::test]
#[ignore = "requires DEEPSEEK_API_KEY"]
async fn live_ds_response_is_valid_utf8_string() {
    let agent = Client::new(&api_key())
        .agent("deepseek-chat")
        .build();

    let result = agent
        .prompt("Reply with the single word: OK".into())
        .await
        .unwrap();

    assert!(result.is_ascii() || result.is_char_boundary(0));
    assert!(!result.trim().is_empty());
}

/// Multiple sequential prompts on the same agent complete without error.
#[tokio::test]
#[ignore = "requires DEEPSEEK_API_KEY"]
async fn live_ds_multiple_independent_prompts() {
    let agent = Client::new(&api_key())
        .agent("deepseek-chat")
        .build();

    for i in 1u32..=3 {
        let result = agent
            .prompt(format!("Reply with just the number {i}"))
            .await
            .unwrap();
        assert!(!result.trim().is_empty(), "empty response on prompt {i}");
    }
}
