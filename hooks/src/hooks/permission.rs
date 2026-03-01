use anyhow::Result;
use serde_json::{json, Value};
use tracing::info;

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

    match tool_name {
        "Read" | "Glob" | "Grep" => {
            info!("[Permission] {tool_name} → AUTO-ALLOW (read-only)");
            metrics.record_local_allow(input_chars);
            return Ok(Some(allow_json()));
        }
        "Bash" => {
            let cmd = tool_input["command"].as_str().unwrap_or("");
            let cmd_short_end = cmd.floor_char_boundary(60);
            let cmd_short = if cmd.len() > 60 { &cmd[..cmd_short_end] } else { cmd };
            match rules.check_command(cmd) {
                RuleVerdict::Allow => {
                    info!("[Permission] Bash → AUTO-ALLOW (safe cmd) | {cmd_short}");
                    metrics.record_local_allow(input_chars);
                    return Ok(Some(allow_json()));
                }
                RuleVerdict::Deny(reason) => {
                    info!("[Permission] Bash → DENY (blocked cmd) | {cmd_short}");
                    metrics.record_local_deny(input_chars);
                    return Ok(Some(deny_json(&reason)));
                }
                RuleVerdict::NeedsEval => {
                    info!("[Permission] Bash → PASS-THROUGH (ask user) | {cmd_short}");
                }
            }
        }
        "Write" | "Edit" => {
            let path = tool_input["file_path"].as_str().unwrap_or("");
            if let RuleVerdict::Deny(reason) = rules.check_file_path(path) {
                info!("[Permission] {tool_name} → DENY (protected) | {path}");
                metrics.record_local_deny(input_chars);
                return Ok(Some(deny_json(&reason)));
            }
            info!("[Permission] {tool_name} → PASS-THROUGH (ask user) | {path}");
        }
        _ => {
            info!("[Permission] {tool_name} → PASS-THROUGH (no rule)");
        }
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
