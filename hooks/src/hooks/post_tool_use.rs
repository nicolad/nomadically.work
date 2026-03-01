use anyhow::Result;
use serde_json::{json, Value};
use tracing::debug;

use crate::deepseek::DeepSeek;

pub async fn handle(input: &Value) -> Result<Option<String>> {
    let tool_name = input["tool_name"].as_str().unwrap_or("");
    debug!("PostToolUse: {tool_name} succeeded");
    Ok(None)
}

const FAILURE_SYSTEM_PROMPT: &str = r#"You are analyzing a tool failure in a coding assistant. Given the tool name, input, and error, provide a brief helpful suggestion for what went wrong and how to fix it.

Respond ONLY with JSON: {"ok": true, "reason": "your suggestion"}
"#;

pub async fn handle_failure(
    input: &Value,
    deepseek: &DeepSeek,
) -> Result<Option<String>> {
    let tool_name = input["tool_name"].as_str().unwrap_or("");
    let error = input["error"].as_str().unwrap_or("");

    debug!("PostToolUseFailure: {tool_name} — {error}");

    let user_prompt = format!(
        "Tool: {tool_name}\nInput: {}\nError: {error}",
        serde_json::to_string_pretty(&input["tool_input"]).unwrap_or_default()
    );

    let decision = deepseek
        .evaluate(FAILURE_SYSTEM_PROMPT, &user_prompt, None)
        .await?;

    if let Some(suggestion) = decision.reason {
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
        Ok(None)
    }
}
