use anyhow::{bail, Context, Result};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::sync::Arc;
use std::time::Duration;

const BASE_URL: &str = "https://api.deepseek.com/v1";
const MODEL: &str = "deepseek-chat";

/// Cloneable DeepSeek client — each parallel worker clones this and owns its own connection.
/// `reqwest::Client` is already `Arc`-backed internally, so cloning is cheap.
#[derive(Clone)]
pub struct DeepSeekClient {
    client: Client,
    api_key: Arc<String>,
}

// ── Message types (shared across orchestrator + workers) ─────────────────────

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Message {
    pub role: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub content: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tool_calls: Option<Vec<ToolCall>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tool_call_id: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ToolCall {
    pub id: String,
    #[serde(rename = "type")]
    pub kind: String,
    pub function: FunctionCall,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct FunctionCall {
    pub name: String,
    pub arguments: String,
}

#[derive(Serialize)]
pub struct Tool {
    #[serde(rename = "type")]
    pub kind: &'static str,
    pub function: ToolFunction,
}

#[derive(Serialize)]
pub struct ToolFunction {
    pub name: &'static str,
    pub description: &'static str,
    pub parameters: Value,
}

// ── Request / response ────────────────────────────────────────────────────────

#[derive(Serialize)]
struct ChatRequest<'a> {
    model: &'static str,
    messages: &'a [Message],
    #[serde(skip_serializing_if = "Option::is_none")]
    tools: Option<&'a [Tool]>,
    #[serde(skip_serializing_if = "Option::is_none")]
    tool_choice: Option<&'static str>,
    max_tokens: u32,
}

#[derive(Deserialize)]
pub struct ChatResponse {
    pub choices: Vec<Choice>,
}

#[derive(Deserialize)]
pub struct Choice {
    pub message: ResponseMessage,
    pub finish_reason: String,
}

#[derive(Deserialize)]
pub struct ResponseMessage {
    pub content: Option<String>,
    #[serde(default)]
    pub tool_calls: Option<Vec<ToolCall>>,
}

// ── Client impl ───────────────────────────────────────────────────────────────

impl DeepSeekClient {
    pub fn new(api_key: String) -> Self {
        let client = Client::builder()
            .connect_timeout(Duration::from_secs(10))
            .timeout(Duration::from_secs(300))
            .build()
            .expect("failed to build HTTP client");

        Self { client, api_key: Arc::new(api_key) }
    }

    /// Send a chat completion request. Pass `tools = None` for plain text responses
    /// (decompose / synthesize steps), `Some(&tools)` for tool-calling workers.
    pub async fn chat(&self, messages: &[Message], tools: Option<&[Tool]>) -> Result<ChatResponse> {
        let body = ChatRequest {
            model: MODEL,
            messages,
            tools,
            tool_choice: tools.map(|_| "auto"),
            max_tokens: 4096,
        };

        let resp = self
            .client
            .post(format!("{BASE_URL}/chat/completions"))
            .bearer_auth(self.api_key.as_str())
            .json(&body)
            .send()
            .await
            .context("DeepSeek request failed")?;

        if !resp.status().is_success() {
            let status = resp.status();
            let text = resp.text().await.unwrap_or_default();
            bail!("DeepSeek API error {status}: {text}");
        }

        resp.json::<ChatResponse>().await.context("parsing DeepSeek response")
    }
}
