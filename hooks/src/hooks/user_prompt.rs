use anyhow::Result;
use serde_json::{json, Value};
use tracing::info;

use crate::deepseek::DeepSeek;
use crate::metrics::Metrics;
use crate::rules::RulesEngine;

const SYSTEM_PROMPT: &str = r#"You are a prompt advisor for a coding assistant. You receive the user's prompt and decide if it needs extra context or clarification hints.

Respond ONLY with JSON:
- {"ok": true} if the prompt is fine as-is
- {"ok": true, "reason": "helpful context to add"} to inject context that will help the assistant
- {"ok": false, "reason": "why this is problematic"} only for clearly harmful requests

Almost all prompts should be ok=true. Only block genuinely harmful requests.
"#;

pub async fn handle(
    input: &Value,
    deepseek: &DeepSeek,
    rules: &RulesEngine,
    metrics: &Metrics,
) -> Result<Option<String>> {
    if !rules.should_evaluate("UserPromptSubmit") {
        info!("[UserPrompt] → ALLOW (eval disabled)");
        return Ok(None);
    }

    let prompt = input["prompt"].as_str().unwrap_or("");
    if prompt.len() < 10 {
        info!("[UserPrompt] → ALLOW (short prompt, {} chars)", prompt.len());
        metrics.record_local_allow(prompt.len());
        return Ok(None);
    }

    let prompt_preview = if prompt.len() > 80 { &prompt[..80] } else { prompt };
    info!("[UserPrompt] evaluating ({} chars) | {}...", prompt.len(), prompt_preview.replace('\n', " "));

    let input_chars = prompt.len();
    let user_prompt = format!("User prompt:\n{prompt}");

    let decision = deepseek
        .evaluate(SYSTEM_PROMPT, &user_prompt, None, metrics, input_chars)
        .await?;

    if !decision.ok {
        let reason = decision
            .reason
            .unwrap_or_else(|| "Prompt blocked by review".into());
        info!("[UserPrompt] → BLOCK (DeepSeek) | {reason}");
        return Ok(Some(
            json!({"decision": "block", "reason": reason}).to_string(),
        ));
    }

    if let Some(ref context) = decision.reason {
        info!("[UserPrompt] → ALLOW + context (DeepSeek) | {context}");
        Ok(Some(
            json!({
                "hookSpecificOutput": {
                    "hookEventName": "UserPromptSubmit",
                    "additionalContext": context
                }
            })
            .to_string(),
        ))
    } else {
        info!("[UserPrompt] → ALLOW (DeepSeek)");
        Ok(None)
    }
}
