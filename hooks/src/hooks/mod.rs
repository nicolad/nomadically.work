pub mod permission;
pub mod post_tool_use;
pub mod pre_tool_use;
pub mod session;
pub mod stop;
pub mod user_prompt;

use anyhow::Result;
use serde_json::Value;

use crate::deepseek::DeepSeek;
use crate::metrics::Metrics;
use crate::rules::RulesEngine;

pub async fn dispatch(
    event: &str,
    input: &Value,
    deepseek: &DeepSeek,
    rules: &RulesEngine,
    metrics: &Metrics,
) -> Result<Option<String>> {
    match event {
        "PreToolUse" => pre_tool_use::handle(input, deepseek, rules, metrics).await,
        "PostToolUse" => post_tool_use::handle(input, metrics).await,
        "PostToolUseFailure" => post_tool_use::handle_failure(input, deepseek, metrics).await,
        "Stop" => stop::handle(input, deepseek, rules, metrics).await,
        "SubagentStop" => stop::handle(input, deepseek, rules, metrics).await,
        "UserPromptSubmit" => user_prompt::handle(input, deepseek, rules, metrics).await,
        "PermissionRequest" => permission::handle(input, rules, metrics).await,
        "SessionStart" => session::handle_start(input).await,
        "SessionEnd" => session::handle_end(input).await,
        "Notification" => Ok(None),
        _ => Ok(None),
    }
}
