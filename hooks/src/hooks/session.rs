use anyhow::Result;
use serde_json::{json, Value};
use tracing::{debug, info};

pub async fn handle_start(input: &Value) -> Result<Option<String>> {
    let source = input["source"].as_str().unwrap_or("unknown");
    let model = input["model"].as_str().unwrap_or("unknown");
    info!("session started: source={source} model={model}");

    Ok(Some(
        json!({
            "hookSpecificOutput": {
                "hookEventName": "SessionStart",
                "additionalContext": "DeepSeek Reasoner hooks active. Safe operations auto-approved, dangerous ones blocked. Bash read commands, git status/log/diff, and test/build commands run without delay."
            }
        })
        .to_string(),
    ))
}

pub async fn handle_end(input: &Value) -> Result<Option<String>> {
    let reason = input["reason"].as_str().unwrap_or("unknown");
    debug!("session ended: reason={reason}");
    Ok(None)
}
