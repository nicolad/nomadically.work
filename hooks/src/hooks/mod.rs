pub mod pre_tool_use;
pub mod post_tool_use;
pub mod stop;
pub mod user_prompt;
pub mod permission;
pub mod session;

use anyhow::Result;
use serde_json::Value;

use crate::deepseek::DeepSeek;
use crate::rules::RulesEngine;

pub async fn dispatch(
    event: &str,
    input: &Value,
    deepseek: &DeepSeek,
    rules: &RulesEngine,
) -> Result<Option<String>> {
    match event {
        "PreToolUse"         => pre_tool_use::handle(input, deepseek, rules).await,
        "PostToolUse"        => post_tool_use::handle(input).await,
        "PostToolUseFailure" => post_tool_use::handle_failure(input, deepseek).await,
        "Stop"               => stop::handle(input, deepseek, rules).await,
        "SubagentStop"       => stop::handle(input, deepseek, rules).await,
        "UserPromptSubmit"   => user_prompt::handle(input, deepseek, rules).await,
        "PermissionRequest"  => permission::handle(input, rules).await,
        "SessionStart"       => session::handle_start(input).await,
        "SessionEnd"         => session::handle_end(input).await,
        "Notification"       => Ok(None),
        _ => Ok(None),
    }
}
