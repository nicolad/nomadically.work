/// Light DeepSeek agentic client — replaces `rig-core`.
///
/// Uses the DeepSeek OpenAI-compatible API directly via `reqwest`.
/// Implements the standard tool-use loop:
///   1. POST messages + tool definitions
///   2. Execute any tool_calls returned by the model
///   3. Append results and repeat until `finish_reason == "stop"`
use anyhow::{Context, Result};
use async_trait::async_trait;
use serde_json::{Value, json};

// ─── ToolDefinition ──────────────────────────────────────────────────────────

pub struct ToolDefinition {
    pub name: String,
    pub description: String,
    pub parameters: Value,
}

// ─── Tool trait ──────────────────────────────────────────────────────────────

#[async_trait]
pub trait Tool: Send + Sync {
    fn name(&self) -> &str;
    fn definition(&self) -> ToolDefinition;
    async fn call_json(&self, args: Value) -> Result<String>;
}

// ─── Client ──────────────────────────────────────────────────────────────────

pub struct Client {
    api_key: String,
}

impl Client {
    pub fn new(api_key: &str) -> Self {
        Self { api_key: api_key.into() }
    }

    pub fn agent(&self, model: &str) -> AgentBuilder {
        AgentBuilder {
            api_key: self.api_key.clone(),
            model: model.into(),
            preamble: String::new(),
            tools: Vec::new(),
            base_url: "https://api.deepseek.com".into(),
        }
    }
}

// ─── AgentBuilder ────────────────────────────────────────────────────────────

pub struct AgentBuilder {
    api_key: String,
    model: String,
    preamble: String,
    tools: Vec<Box<dyn Tool>>,
    base_url: String,
}

impl AgentBuilder {
    pub fn preamble(mut self, p: &str) -> Self {
        self.preamble = p.into();
        self
    }

    pub fn tool(mut self, t: impl Tool + 'static) -> Self {
        self.tools.push(Box::new(t));
        self
    }

    /// Override the API base URL (default: `https://api.deepseek.com`).
    /// Primarily useful in tests to point at a local mock server.
    pub fn base_url(mut self, url: &str) -> Self {
        self.base_url = url.trim_end_matches('/').into();
        self
    }

    pub fn build(self) -> DeepSeekAgent {
        DeepSeekAgent {
            api_key: self.api_key,
            model: self.model,
            preamble: self.preamble,
            tools: self.tools,
            base_url: self.base_url,
            http: reqwest::Client::new(),
        }
    }
}

// ─── DeepSeekAgent ───────────────────────────────────────────────────────────

pub struct DeepSeekAgent {
    api_key: String,
    model: String,
    preamble: String,
    tools: Vec<Box<dyn Tool>>,
    base_url: String,
    http: reqwest::Client,
}

impl DeepSeekAgent {
    /// Run the agentic tool-use loop and return the final text response.
    pub async fn prompt(&self, user_prompt: String) -> Result<String> {
        let tools_json: Vec<Value> = self
            .tools
            .iter()
            .map(|t| {
                let def = t.definition();
                json!({
                    "type": "function",
                    "function": {
                        "name": def.name,
                        "description": def.description,
                        "parameters": def.parameters,
                    }
                })
            })
            .collect();

        let mut messages: Vec<Value> = vec![
            json!({"role": "system", "content": self.preamble}),
            json!({"role": "user",   "content": user_prompt}),
        ];

        loop {
            let mut body = json!({
                "model": self.model,
                "messages": messages,
            });
            if !tools_json.is_empty() {
                body["tools"] = json!(tools_json);
            }

            let url = format!("{}/v1/chat/completions", self.base_url);
            let resp: Value = self
                .http
                .post(&url)
                .bearer_auth(&self.api_key)
                .json(&body)
                .send()
                .await
                .context("DeepSeek HTTP request failed")?
                .error_for_status()
                .context("DeepSeek API returned an error status")?
                .json()
                .await
                .context("parsing DeepSeek JSON response")?;

            let choice = &resp["choices"][0];
            let finish_reason = choice["finish_reason"].as_str().unwrap_or("stop");
            let message = &choice["message"];

            match finish_reason {
                "tool_calls" => {
                    // Append the assistant turn (with tool_calls)
                    messages.push(message.clone());

                    let calls = message["tool_calls"]
                        .as_array()
                        .context("expected tool_calls array from model")?;

                    for call in calls {
                        let call_id = call["id"].as_str().unwrap_or("").to_string();
                        let fn_name = call["function"]["name"].as_str().unwrap_or("");
                        let args_str = call["function"]["arguments"].as_str().unwrap_or("{}");
                        let args: Value =
                            serde_json::from_str(args_str).unwrap_or(json!({}));

                        let result = match self.tools.iter().find(|t| t.name() == fn_name) {
                            Some(tool) => tool
                                .call_json(args)
                                .await
                                .unwrap_or_else(|e| format!("Tool error: {e}")),
                            None => format!("Unknown tool: {fn_name}"),
                        };

                        messages.push(json!({
                            "role":        "tool",
                            "tool_call_id": call_id,
                            "content":     result,
                        }));
                    }
                }
                _ => {
                    // "stop" or any other terminal reason — return the content
                    return message["content"]
                        .as_str()
                        .map(String::from)
                        .ok_or_else(|| {
                            anyhow::anyhow!("No content in DeepSeek response: {resp}")
                        });
                }
            }
        }
    }
}
