/// Tests for `RegimeContext`: JSON parsing, symbol splitting, strategy inference,
/// and agent-prompt structure.
use research_agent::regime_context::RegimeContext;
use std::io::Write;
use tempfile::NamedTempFile;

// ─── Helpers ─────────────────────────────────────────────────────────────────

fn write_cycle_json(json: &str) -> NamedTempFile {
    let mut f = NamedTempFile::new().unwrap();
    write!(f, "{json}").unwrap();
    f
}

fn minimal_report(regime: &str) -> String {
    format!(
        r#"{{
            "cycle": 5,
            "asset": "BTC-PERP.BYBIT",
            "regime": "{regime}",
            "regime_confidence": 0.75
        }}"#
    )
}

// ─── from_cycle_report ───────────────────────────────────────────────────────

#[test]
fn from_cycle_report_parses_basic_fields() {
    let f = write_cycle_json(&minimal_report("TRENDING/Uptrend"));
    let ctx = RegimeContext::from_cycle_report(f.path()).unwrap();

    assert_eq!(ctx.cycle, 5);
    assert_eq!(ctx.regime, "TRENDING/Uptrend");
    assert!((ctx.regime_confidence - 0.75).abs() < 1e-9);
}

#[test]
fn from_cycle_report_single_symbol_parsed() {
    let f = write_cycle_json(&minimal_report("TRENDING/Uptrend"));
    let ctx = RegimeContext::from_cycle_report(f.path()).unwrap();

    assert_eq!(ctx.symbols, vec!["BTC-PERP.BYBIT"]);
}

#[test]
fn from_cycle_report_comma_separated_symbols_split() {
    let json = r#"{
        "cycle": 10,
        "asset": "SOL-PERP.BYBIT, XRP-PERP.BYBIT, DOGE-PERP.BYBIT",
        "regime": "HIGHVOL",
        "regime_confidence": 0.9
    }"#;
    let f = write_cycle_json(json);
    let ctx = RegimeContext::from_cycle_report(f.path()).unwrap();

    assert_eq!(
        ctx.symbols,
        vec!["SOL-PERP.BYBIT", "XRP-PERP.BYBIT", "DOGE-PERP.BYBIT"]
    );
}

#[test]
fn from_cycle_report_optional_fields_populated() {
    let json = r#"{
        "cycle": 1,
        "asset": "ETH-PERP.BYBIT",
        "regime": "MEANREVERTING",
        "regime_confidence": 0.6,
        "thought": "market is ranging",
        "action": "use bollinger",
        "observation": "price bouncing",
        "rationale": "low volatility"
    }"#;
    let f = write_cycle_json(json);
    let ctx = RegimeContext::from_cycle_report(f.path()).unwrap();

    assert_eq!(ctx.thought.as_deref(), Some("market is ranging"));
    assert_eq!(ctx.action.as_deref(), Some("use bollinger"));
    assert_eq!(ctx.observation.as_deref(), Some("price bouncing"));
    assert_eq!(ctx.rationale.as_deref(), Some("low volatility"));
}

#[test]
fn from_cycle_report_optional_fields_absent() {
    let f = write_cycle_json(&minimal_report("TRENDING/Downtrend"));
    let ctx = RegimeContext::from_cycle_report(f.path()).unwrap();

    assert!(ctx.thought.is_none());
    assert!(ctx.action.is_none());
    assert!(ctx.observation.is_none());
    assert!(ctx.rationale.is_none());
}

#[test]
fn from_cycle_report_missing_file_returns_error() {
    let err = RegimeContext::from_cycle_report(std::path::Path::new("/no/such/file.json"))
        .unwrap_err();
    assert!(
        err.to_string().contains("reading") || err.to_string().contains("os error"),
        "unexpected error: {err}"
    );
}

#[test]
fn from_cycle_report_invalid_json_returns_error() {
    let f = write_cycle_json("not json at all");
    let err = RegimeContext::from_cycle_report(f.path()).unwrap_err();
    assert!(
        err.to_string().contains("parsing") || err.to_string().contains("expected"),
        "unexpected error: {err}"
    );
}

#[test]
fn from_cycle_report_missing_required_field_returns_error() {
    // Missing "asset" field.
    let json = r#"{"cycle": 1, "regime": "TRENDING", "regime_confidence": 0.5}"#;
    let f = write_cycle_json(json);
    let err = RegimeContext::from_cycle_report(f.path()).unwrap_err();
    assert!(
        err.to_string().contains("parsing") || err.to_string().contains("missing"),
        "unexpected error: {err}"
    );
}

// ─── Strategy inference ──────────────────────────────────────────────────────

#[test]
fn trending_uptrend_infers_scalping() {
    let f = write_cycle_json(&minimal_report("TRENDING/Uptrend"));
    let ctx = RegimeContext::from_cycle_report(f.path()).unwrap();
    assert_eq!(ctx.strategy_type, "scalping");
}

#[test]
fn trending_downtrend_infers_scalping() {
    let f = write_cycle_json(&minimal_report("TRENDING/Downtrend"));
    let ctx = RegimeContext::from_cycle_report(f.path()).unwrap();
    assert_eq!(ctx.strategy_type, "scalping");
}

#[test]
fn meanreverting_infers_bollinger() {
    let f = write_cycle_json(&minimal_report("MEANREVERTING"));
    let ctx = RegimeContext::from_cycle_report(f.path()).unwrap();
    assert_eq!(ctx.strategy_type, "bollinger");
}

#[test]
fn sideways_infers_bollinger() {
    let f = write_cycle_json(&minimal_report("SIDEWAYS/Low"));
    let ctx = RegimeContext::from_cycle_report(f.path()).unwrap();
    assert_eq!(ctx.strategy_type, "bollinger");
}

#[test]
fn highvol_infers_rsi() {
    let f = write_cycle_json(&minimal_report("HIGHVOL"));
    let ctx = RegimeContext::from_cycle_report(f.path()).unwrap();
    assert_eq!(ctx.strategy_type, "rsi");
}

#[test]
fn unknown_regime_defaults_to_rsi() {
    let f = write_cycle_json(&minimal_report("UNKNOWN_REGIME"));
    let ctx = RegimeContext::from_cycle_report(f.path()).unwrap();
    assert_eq!(ctx.strategy_type, "rsi");
}

// ─── build_agent_prompt ──────────────────────────────────────────────────────

#[test]
fn prompt_contains_regime_and_confidence() {
    let f = write_cycle_json(&minimal_report("TRENDING/Uptrend"));
    let ctx = RegimeContext::from_cycle_report(f.path()).unwrap();
    let prompt = ctx.build_agent_prompt();

    assert!(prompt.contains("TRENDING/Uptrend"), "regime missing from prompt");
    assert!(prompt.contains("75%"), "confidence % missing from prompt");
}

#[test]
fn prompt_contains_strategy_type() {
    let f = write_cycle_json(&minimal_report("TRENDING/Uptrend"));
    let ctx = RegimeContext::from_cycle_report(f.path()).unwrap();
    let prompt = ctx.build_agent_prompt();

    assert!(prompt.contains("scalping"), "strategy type missing from prompt");
}

#[test]
fn prompt_contains_symbol() {
    let f = write_cycle_json(&minimal_report("HIGHVOL"));
    let ctx = RegimeContext::from_cycle_report(f.path()).unwrap();
    let prompt = ctx.build_agent_prompt();

    assert!(prompt.contains("BTC-PERP.BYBIT"), "symbol missing from prompt");
}

#[test]
fn prompt_contains_required_output_sections() {
    let f = write_cycle_json(&minimal_report("HIGHVOL"));
    let ctx = RegimeContext::from_cycle_report(f.path()).unwrap();
    let prompt = ctx.build_agent_prompt();

    assert!(prompt.contains("## Papers Reviewed"),          "Papers Reviewed section missing");
    assert!(prompt.contains("## Aggregated Recommendations"), "Aggregated Recommendations missing");
    assert!(prompt.contains("## Recommended Optimizer Grid"), "Optimizer Grid missing");
    assert!(prompt.contains("```json"),                       "JSON fence missing");
}

#[test]
fn prompt_contains_previous_cycle_context_when_present() {
    let json = r#"{
        "cycle": 3,
        "asset": "SOL-PERP.BYBIT",
        "regime": "TRENDING",
        "regime_confidence": 0.8,
        "observation": "momentum fading",
        "action": "reduce position size"
    }"#;
    let f = write_cycle_json(json);
    let ctx = RegimeContext::from_cycle_report(f.path()).unwrap();
    let prompt = ctx.build_agent_prompt();

    assert!(prompt.contains("Previous Cycle Context"),   "prev context section missing");
    assert!(prompt.contains("momentum fading"),          "observation missing");
    assert!(prompt.contains("reduce position size"),     "action missing");
}

#[test]
fn prompt_omits_previous_cycle_section_when_absent() {
    let f = write_cycle_json(&minimal_report("TRENDING"));
    let ctx = RegimeContext::from_cycle_report(f.path()).unwrap();
    let prompt = ctx.build_agent_prompt();

    assert!(
        !prompt.contains("Previous Cycle Context"),
        "prev context section should be absent"
    );
}

#[test]
fn prompt_includes_at_least_three_search_queries() {
    let f = write_cycle_json(&minimal_report("TRENDING/Downtrend"));
    let ctx = RegimeContext::from_cycle_report(f.path()).unwrap();
    let prompt = ctx.build_agent_prompt();

    // Count numbered list items in the queries block.
    let count = (1..=10).filter(|i| prompt.contains(&format!("  {i}."))).count();
    assert!(count >= 3, "expected ≥3 search queries, found {count}");
}
