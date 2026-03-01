use anyhow::Result;
use serde_json::{json, Value};
use tracing::debug;

use crate::cache::Cache;
use crate::deepseek::DeepSeek;
use crate::rules::RulesEngine;

const SYSTEM_PROMPT: &str = r#"You are evaluating whether a coding assistant has completed its task. You receive the assistant's last message.

Analyze if:
1. The task appears complete (code written, tests mentioned, files created)
2. There are obvious follow-ups the assistant forgot
3. Any errors were left unresolved

Respond ONLY with JSON:
- {"ok": true} if the assistant can stop
- {"ok": false, "reason": "what still needs to be done"} to keep working

Be lenient — only block if something obvious was clearly missed.
"#;

pub async fn handle(
    input: &Value,
    deepseek: &DeepSeek,
    rules: &RulesEngine,
) -> Result<Option<String>> {
    if input["stop_hook_active"].as_bool().unwrap_or(false) {
        debug!("stop_hook_active=true, allowing stop");
        return Ok(None);
    }

    if !rules.should_evaluate("Stop") {
        return Ok(None);
    }

    let last_msg = input["last_assistant_message"].as_str().unwrap_or("");
    if last_msg.is_empty() {
        return Ok(None);
    }

    let cache_key = Cache::key("Stop", None, last_msg);
    let user_prompt = format!("Assistant's last message:\n{last_msg}");

    let decision = deepseek
        .evaluate(SYSTEM_PROMPT, &user_prompt, Some(&cache_key))
        .await?;

    if decision.ok {
        Ok(None)
    } else {
        let reason = decision
            .reason
            .unwrap_or_else(|| "DeepSeek thinks more work is needed".into());
        Ok(Some(json!({"decision": "block", "reason": reason}).to_string()))
    }
}
