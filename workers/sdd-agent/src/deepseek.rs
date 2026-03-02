// ═══════════════════════════════════════════════════════════════════════════
// MODULE: deepseek — DeepSeek API client for Cloudflare Workers (WASM)
// ═══════════════════════════════════════════════════════════════════════════
//
// Uses worker::Fetch (CF Workers native fetch) instead of reqwest.
// DeepSeek API is OpenAI-compatible: POST /v1/chat/completions
//
// Model routing (parity with Anthropic multi-model):
//   - deepseek-reasoner (R1) ← deep thinking, architecture, complex analysis
//   - deepseek-chat (V3)     ← fast responses, tool use, standard tasks
// ═══════════════════════════════════════════════════════════════════════════

use worker::*;
use serde_json::json;

use crate::types::*;

const DEEPSEEK_API_URL: &str = "https://api.deepseek.com/v1/chat/completions";

/// DeepSeek API client — WASM-compatible, uses CF Workers native fetch.
pub struct DeepSeekClient {
    api_key: String,
}

impl DeepSeekClient {
    pub fn new(api_key: String) -> Self {
        Self { api_key }
    }

    /// Create client from CF Worker environment secrets
    pub fn from_env(env: &Env) -> Result<Self> {
        let api_key = env.secret("DEEPSEEK_API_KEY")
            .map_err(|_| Error::RustError("DEEPSEEK_API_KEY secret not set".into()))?
            .to_string();
        Ok(Self::new(api_key))
    }

    /// Send a chat completion request to DeepSeek API.
    /// Supports tool/function calling via OpenAI-compatible format.
    pub async fn chat(&self, request: &ChatRequest) -> Result<ChatResponse> {
        let body = serde_json::to_string(request)
            .map_err(|e| Error::RustError(format!("Serialize error: {e}")))?;

        let mut headers = Headers::new();
        headers.set("Content-Type", "application/json")?;
        headers.set("Authorization", &format!("Bearer {}", self.api_key))?;

        let mut init = RequestInit::new();
        init.with_method(Method::Post)
            .with_headers(headers)
            .with_body(Some(worker::wasm_bindgen::JsValue::from_str(&body)));

        let request = Request::new_with_init(DEEPSEEK_API_URL, &init)?;
        let mut response = Fetch::Request(request).send().await?;

        if response.status_code() != 200 {
            let error_text = response.text().await.unwrap_or_default();
            return Err(Error::RustError(format!(
                "DeepSeek API error ({}): {}", response.status_code(), error_text
            )));
        }

        let response_text = response.text().await?;
        let chat_response: ChatResponse = serde_json::from_str(&response_text)
            .map_err(|e| Error::RustError(format!("Deserialize error: {e}")))?;

        Ok(chat_response)
    }

    /// Build a ChatRequest with tool schemas for function calling.
    pub fn build_request(
        model: &DeepSeekModel,
        messages: Vec<ChatMessage>,
        tools: Option<Vec<ToolSchema>>,
        effort: &EffortLevel,
    ) -> ChatRequest {
        ChatRequest {
            model: model.as_str().to_string(),
            messages,
            tools,
            tool_choice: if tools.is_some() { Some(json!("auto")) } else { None },
            temperature: Some(effort.temperature()),
            max_tokens: Some(effort.max_tokens()),
            stream: Some(false),
        }
    }

    /// Create a system message
    pub fn system_msg(content: &str) -> ChatMessage {
        ChatMessage {
            role: "system".into(),
            content: ChatContent::Text(content.into()),
            tool_calls: None,
            tool_call_id: None,
            name: None,
        }
    }

    /// Create a user message
    pub fn user_msg(content: &str) -> ChatMessage {
        ChatMessage {
            role: "user".into(),
            content: ChatContent::Text(content.into()),
            tool_calls: None,
            tool_call_id: None,
            name: None,
        }
    }

    /// Create an assistant message
    pub fn assistant_msg(content: &str) -> ChatMessage {
        ChatMessage {
            role: "assistant".into(),
            content: ChatContent::Text(content.into()),
            tool_calls: None,
            tool_call_id: None,
            name: None,
        }
    }

    /// Create a tool result message
    pub fn tool_result_msg(tool_call_id: &str, content: &str) -> ChatMessage {
        ChatMessage {
            role: "tool".into(),
            content: ChatContent::Text(content.into()),
            tool_calls: None,
            tool_call_id: Some(tool_call_id.into()),
            name: None,
        }
    }

    /// Run the agent loop: send prompt, handle tool calls, iterate until done.
    /// This is the core query() equivalent from the Anthropic Agent SDK.
    pub async fn agent_loop(
        &self,
        system_prompt: &str,
        user_prompt: &str,
        model: &DeepSeekModel,
        tools: &[ToolSchema],
        tool_executor: &dyn Fn(&str, serde_json::Value) -> std::result::Result<serde_json::Value, String>,
        max_turns: u32,
        effort: &EffortLevel,
    ) -> Result<AgentResult> {
        let mut messages = vec![
            Self::system_msg(system_prompt),
            Self::user_msg(user_prompt),
        ];

        let tool_schemas = if tools.is_empty() { None } else { Some(tools.to_vec()) };
        let mut total_usage = UsageInfo { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
        let mut tool_calls_made: Vec<String> = Vec::new();
        let mut turn = 0;

        loop {
            if turn >= max_turns {
                return Ok(AgentResult {
                    success: false,
                    result: None,
                    error: Some(format!("Max turns ({max_turns}) exceeded")),
                    turns: turn,
                    usage: total_usage,
                    tool_calls_made: Some(tool_calls_made),
                    session_id: None,
                });
            }

            let request = Self::build_request(model, messages.clone(), tool_schemas.clone(), effort);
            let response = self.chat(&request).await?;

            // Accumulate usage
            if let Some(usage) = &response.usage {
                total_usage.prompt_tokens += usage.prompt_tokens;
                total_usage.completion_tokens += usage.completion_tokens;
                total_usage.total_tokens += usage.total_tokens;
            }

            let choice = response.choices.first()
                .ok_or_else(|| Error::RustError("No choices in response".into()))?;

            // Check if the model wants to call tools
            if let Some(ref calls) = choice.message.tool_calls {
                if !calls.is_empty() {
                    // Add assistant message with tool calls to history
                    messages.push(ChatMessage {
                        role: "assistant".into(),
                        content: ChatContent::Null,
                        tool_calls: Some(calls.clone()),
                        tool_call_id: None,
                        name: None,
                    });

                    // Execute each tool call and add results
                    for call in calls {
                        tool_calls_made.push(call.function.name.clone());

                        let args: serde_json::Value = serde_json::from_str(&call.function.arguments)
                            .unwrap_or(json!({}));

                        let result = tool_executor.execute(&call.function.name, args).await;
                        let result_str = match result {
                            Ok(v) => serde_json::to_string(&v).unwrap_or_default(),
                            Err(e) => json!({"error": e}).to_string(),
                        };

                        messages.push(Self::tool_result_msg(&call.id, &result_str));
                    }

                    turn += 1;
                    continue;
                }
            }

            // No tool calls — model is done, return result
            let result_text = choice.message.content.as_str().to_string();
            return Ok(AgentResult {
                success: true,
                result: Some(result_text),
                error: None,
                turns: turn + 1,
                usage: total_usage,
                tool_calls_made: Some(tool_calls_made),
                session_id: None,
            });
        }
    }
}

// ── Tool Executor ─────────────────────────────────────────────────────────

/// Tool executor function type for the agent loop.
/// In WASM, we use a simple function pointer instead of async_trait.
/// The caller provides a closure that dispatches tool calls to the registry.
pub type ToolExecutorFn = Box<dyn Fn(&str, serde_json::Value) -> std::pin::Pin<
    Box<dyn std::future::Future<Output = std::result::Result<serde_json::Value, String>>>
>>;
