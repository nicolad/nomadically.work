use anyhow::Result;
use serde_json::{json, Value};
use tracing::info;

use crate::deepseek::DeepSeek;
use crate::metrics::Metrics;

pub async fn handle(input: &Value, metrics: &Metrics) -> Result<Option<String>> {
    let tool_name = input["tool_name"].as_str().unwrap_or("");
    let input_chars = serde_json::to_string(&input["tool_input"])
        .unwrap_or_default()
        .len();
    info!("[PostToolUse] {tool_name} succeeded");
    metrics.record_local_allow(input_chars);
    Ok(None)
}

const FAILURE_SYSTEM_PROMPT: &str = r#"You are analyzing a tool failure in a coding assistant. Given the tool name, input, and error, provide a brief helpful suggestion for what went wrong and how to fix it.

Respond ONLY with JSON: {"ok": true, "reason": "your suggestion"}
"#;

pub async fn handle_failure(
    input: &Value,
    deepseek: &DeepSeek,
    metrics: &Metrics,
) -> Result<Option<String>> {
    let tool_name = input["tool_name"].as_str().unwrap_or("");
    let error = input["error"].as_str().unwrap_or("");
    let error_short = if error.len() > 120 { &error[..120] } else { error };
    info!("[PostToolUseFailure] {tool_name} failed | {error_short}");

    let user_prompt = format!(
        "Tool: {tool_name}\nInput: {}\nError: {error}",
        serde_json::to_string_pretty(&input["tool_input"]).unwrap_or_default()
    );
    let input_chars = user_prompt.len();

    let decision = deepseek
        .evaluate(FAILURE_SYSTEM_PROMPT, &user_prompt, None, metrics, input_chars)
        .await?;

    if let Some(ref suggestion) = decision.reason {
        info!("[PostToolUseFailure] DeepSeek suggestion | {suggestion}");
        Ok(Some(
            json!({
                "hookSpecificOutput": {
                    "hookEventName": "PostToolUseFailure",
                    "additionalContext": suggestion
                }
            })
            .to_string(),
        ))
    } else {
        info!("[PostToolUseFailure] no suggestion from DeepSeek");
        Ok(None)
    }
}
