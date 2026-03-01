use anyhow::Result;
use serde_json::{json, Value};
use tracing::debug;

use crate::metrics::Metrics;
use crate::rules::{RuleVerdict, RulesEngine};

pub async fn handle(
    input: &Value,
    rules: &RulesEngine,
    metrics: &Metrics,
) -> Result<Option<String>> {
    let tool_name = input["tool_name"].as_str().unwrap_or("");
    let tool_input = &input["tool_input"];
    let input_chars = serde_json::to_string(tool_input).unwrap_or_default().len();

    debug!("PermissionRequest for {tool_name}");

    match tool_name {
        "Read" | "Glob" | "Grep" => {
            metrics.record_local_allow(input_chars);
            return Ok(Some(allow_json()));
        }
        "Bash" => {
            let cmd = tool_input["command"].as_str().unwrap_or("");
            match rules.check_command(cmd) {
                RuleVerdict::Allow => {
                    metrics.record_local_allow(input_chars);
                    return Ok(Some(allow_json()));
                }
                RuleVerdict::Deny(reason) => {
                    metrics.record_local_deny(input_chars);
                    return Ok(Some(deny_json(&reason)));
                }
                RuleVerdict::NeedsEval => {}
            }
        }
        "Write" | "Edit" => {
            let path = tool_input["file_path"].as_str().unwrap_or("");
            if let RuleVerdict::Deny(reason) = rules.check_file_path(path) {
                metrics.record_local_deny(input_chars);
                return Ok(Some(deny_json(&reason)));
            }
        }
        _ => {}
    }

    Ok(None)
}

fn allow_json() -> String {
    json!({
        "hookSpecificOutput": {
            "hookEventName": "PermissionRequest",
            "decision": {"behavior": "allow"}
        }
    })
    .to_string()
}

fn deny_json(reason: &str) -> String {
    json!({
        "hookSpecificOutput": {
            "hookEventName": "PermissionRequest",
            "decision": {"behavior": "deny", "message": reason}
        }
    })
    .to_string()
}
