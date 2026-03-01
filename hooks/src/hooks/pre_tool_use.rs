use anyhow::Result;
use serde_json::{json, Value};
use tracing::debug;

use crate::cache::Cache;
use crate::deepseek::DeepSeek;
use crate::rules::{RuleVerdict, RulesEngine};

const SYSTEM_PROMPT: &str = r#"You are a security reviewer for a coding assistant. You receive tool call details and must decide if the action is safe.

Respond ONLY with JSON: {"ok": true} to allow, or {"ok": false, "reason": "explanation"} to block.

Guidelines:
- Block destructive filesystem operations (rm -rf /, deleting system files)
- Block commands that exfiltrate data (curl with sensitive files, piping secrets)
- Block writes to sensitive config files (.env, SSH keys, credentials)
- Allow normal development operations (testing, building, linting, reading files)
- Allow git operations that don't force-push to main/master
- When uncertain, allow — false positives are worse than false negatives
"#;

pub async fn handle(
    input: &Value,
    deepseek: &DeepSeek,
    rules: &RulesEngine,
) -> Result<Option<String>> {
    let tool_name = input["tool_name"].as_str().unwrap_or("");
    let tool_input = &input["tool_input"];

    if rules.should_skip_tool(tool_name) {
        debug!("skipping tool {tool_name} (in skip list)");
        return Ok(None);
    }

    // Fast path: local rules
    match tool_name {
        "Bash" => {
            let cmd = tool_input["command"].as_str().unwrap_or("");
            match rules.check_command(cmd) {
                RuleVerdict::Deny(reason) => return Ok(Some(deny_json(&reason))),
                RuleVerdict::Allow => return Ok(None),
                RuleVerdict::NeedsEval => {}
            }
        }
        "Write" | "Edit" => {
            let path = tool_input["file_path"].as_str().unwrap_or("");
            match rules.check_file_path(path) {
                RuleVerdict::Deny(reason) => return Ok(Some(deny_json(&reason))),
                RuleVerdict::Allow => return Ok(None),
                RuleVerdict::NeedsEval => {}
            }
        }
        "Read" | "Glob" | "Grep" => return Ok(None),
        _ => {}
    }

    // Slow path: DeepSeek Reasoner
    if !rules.should_evaluate("PreToolUse") {
        return Ok(None);
    }

    let user_prompt = format!(
        "Tool: {tool_name}\nInput: {}",
        serde_json::to_string_pretty(tool_input).unwrap_or_default()
    );

    let cache_key = Cache::key(
        "PreToolUse",
        Some(tool_name),
        &serde_json::to_string(tool_input).unwrap_or_default(),
    );

    let decision = deepseek
        .evaluate(SYSTEM_PROMPT, &user_prompt, Some(&cache_key))
        .await?;

    if decision.ok {
        Ok(None)
    } else {
        let reason = decision
            .reason
            .unwrap_or_else(|| "Blocked by DeepSeek review".into());
        Ok(Some(deny_json(&reason)))
    }
}

fn deny_json(reason: &str) -> String {
    json!({
        "hookSpecificOutput": {
            "hookEventName": "PreToolUse",
            "permissionDecision": "deny",
            "permissionDecisionReason": reason
        }
    })
    .to_string()
}
