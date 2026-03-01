use anyhow::Result;
use serde_json::{json, Value};
use tracing::info;

use crate::cache::Cache;
use crate::deepseek::DeepSeek;
use crate::metrics::Metrics;
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
    metrics: &Metrics,
) -> Result<Option<String>> {
    let tool_name = input["tool_name"].as_str().unwrap_or("");
    let tool_input = &input["tool_input"];
    let input_str = serde_json::to_string(tool_input).unwrap_or_default();
    let input_chars = input_str.len();

    if rules.should_skip_tool(tool_name) {
        info!("[PreToolUse] {tool_name} → ALLOW (skip list)");
        metrics.record_local_allow(input_chars);
        return Ok(None);
    }

    match tool_name {
        "Bash" => {
            let cmd = tool_input["command"].as_str().unwrap_or("");
            let cmd_short = truncate(cmd, 80);
            match rules.check_command(cmd) {
                RuleVerdict::Deny(reason) => {
                    info!("[PreToolUse] Bash → DENY (local rule) | {cmd_short}");
                    metrics.record_local_deny(input_chars);
                    return Ok(Some(deny_json(&reason)));
                }
                RuleVerdict::Allow => {
                    info!("[PreToolUse] Bash → ALLOW (local rule) | {cmd_short}");
                    metrics.record_local_allow(input_chars);
                    return Ok(None);
                }
                RuleVerdict::NeedsEval => {
                    info!("[PreToolUse] Bash → needs DeepSeek eval | {cmd_short}");
                }
            }
        }
        "Write" | "Edit" => {
            let path = tool_input["file_path"].as_str().unwrap_or("");
            match rules.check_file_path(path) {
                RuleVerdict::Deny(reason) => {
                    info!("[PreToolUse] {tool_name} → DENY (protected path) | {path}");
                    metrics.record_local_deny(input_chars);
                    return Ok(Some(deny_json(&reason)));
                }
                RuleVerdict::Allow => {
                    info!("[PreToolUse] {tool_name} → ALLOW (local rule) | {path}");
                    metrics.record_local_allow(input_chars);
                    return Ok(None);
                }
                RuleVerdict::NeedsEval => {
                    info!("[PreToolUse] {tool_name} → needs DeepSeek eval | {path}");
                }
            }
        }
        "Read" | "Glob" | "Grep" => {
            info!("[PreToolUse] {tool_name} → ALLOW (read-only)");
            metrics.record_local_allow(input_chars);
            return Ok(None);
        }
        _ => {
            info!("[PreToolUse] {tool_name} → needs DeepSeek eval");
        }
    }

    if !rules.should_evaluate("PreToolUse") {
        info!("[PreToolUse] {tool_name} → ALLOW (eval disabled)");
        return Ok(None);
    }

    let user_prompt = format!(
        "Tool: {tool_name}\nInput: {}",
        serde_json::to_string_pretty(tool_input).unwrap_or_default()
    );

    let cache_key = Cache::key("PreToolUse", Some(tool_name), &input_str);

    let decision = deepseek
        .evaluate(SYSTEM_PROMPT, &user_prompt, Some(&cache_key), metrics, input_chars)
        .await?;

    if decision.ok {
        info!("[PreToolUse] {tool_name} → ALLOW (DeepSeek)");
        Ok(None)
    } else {
        let reason = decision
            .reason
            .unwrap_or_else(|| "Blocked by DeepSeek review".into());
        info!("[PreToolUse] {tool_name} → DENY (DeepSeek) | {reason}");
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

fn truncate(s: &str, max: usize) -> String {
    if s.len() <= max {
        s.to_string()
    } else {
        let boundary = s.floor_char_boundary(max);
        format!("{}...", &s[..boundary])
    }
}
