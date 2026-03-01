use anyhow::Result;
use serde_json::{json, Value};
use tracing::debug;

use crate::rules::{RuleVerdict, RulesEngine};

pub async fn handle(
    input: &Value,
    rules: &RulesEngine,
) -> Result<Option<String>> {
    let tool_name = input["tool_name"].as_str().unwrap_or("");
    let tool_input = &input["tool_input"];

    debug!("PermissionRequest for {tool_name}");

    match tool_name {
        "Read" | "Glob" | "Grep" => {
            return Ok(Some(allow_json()));
        }
        "Bash" => {
            let cmd = tool_input["command"].as_str().unwrap_or("");
            match rules.check_command(cmd) {
                RuleVerdict::Allow => return Ok(Some(allow_json())),
                RuleVerdict::Deny(reason) => return Ok(Some(deny_json(&reason))),
                RuleVerdict::NeedsEval => {}
            }
        }
        "Write" | "Edit" => {
            let path = tool_input["file_path"].as_str().unwrap_or("");
            if let RuleVerdict::Deny(reason) = rules.check_file_path(path) {
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
