// ═══════════════════════════════════════════════════════════════════════════
// MODULE: types — Core type definitions for the SDD Agent worker
// ═══════════════════════════════════════════════════════════════════════════

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

// ── API Response ──────────────────────────────────────────────────────────

#[derive(Serialize)]
pub struct ApiResponse<T: Serialize> {
    pub ok: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub data: Option<T>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

impl<T: Serialize> ApiResponse<T> {
    pub fn success(data: T) -> Self {
        Self { ok: true, data: Some(data), error: None }
    }
}

pub fn error_response(msg: &str) -> worker::Result<worker::Response> {
    worker::Response::from_json(&serde_json::json!({
        "ok": false, "error": msg
    }))
}

// ── DeepSeek Models ───────────────────────────────────────────────────────

/// DeepSeek model identifiers — parity with Anthropic's multi-model routing
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum DeepSeekModel {
    /// DeepSeek-R1 — Reasoning model (equivalent to Opus for deep thinking)
    #[serde(rename = "deepseek-reasoner")]
    Reasoner,
    /// DeepSeek-V3 — Fast chat model (equivalent to Sonnet for speed)
    #[serde(rename = "deepseek-chat")]
    Chat,
}

impl DeepSeekModel {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Reasoner => "deepseek-reasoner",
            Self::Chat => "deepseek-chat",
        }
    }

    pub fn from_alias(alias: &str) -> Self {
        match alias {
            "reasoner" | "r1" | "deep" | "opus" => Self::Reasoner,
            "chat" | "v3" | "fast" | "sonnet" | "haiku" => Self::Chat,
            _ => Self::Chat,
        }
    }
}

impl Default for DeepSeekModel {
    fn default() -> Self { Self::Chat }
}

// ── DeepSeek API Types (OpenAI-compatible) ────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatMessage {
    pub role: String,
    pub content: ChatContent,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reasoning_content: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tool_calls: Option<Vec<ToolCall>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tool_call_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,
}

#[derive(Debug, Clone)]
pub enum ChatContent {
    Text(String),
    Null,
}

impl ChatContent {
    pub fn as_str(&self) -> &str {
        match self {
            Self::Text(s) => s,
            Self::Null => "",
        }
    }
}

impl Serialize for ChatContent {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error> {
        match self {
            Self::Text(s) => serializer.serialize_str(s),
            Self::Null => serializer.serialize_none(),
        }
    }
}

impl<'de> Deserialize<'de> for ChatContent {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> std::result::Result<Self, D::Error> {
        let value = serde_json::Value::deserialize(deserializer)?;
        match value {
            serde_json::Value::String(s) => Ok(Self::Text(s)),
            serde_json::Value::Null => Ok(Self::Null),
            other => Ok(Self::Text(other.to_string())),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolCall {
    pub id: String,
    pub r#type: String,
    pub function: FunctionCall,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FunctionCall {
    pub name: String,
    pub arguments: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct ChatRequest {
    pub model: String,
    pub messages: Vec<ChatMessage>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tools: Option<Vec<ToolSchema>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tool_choice: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub temperature: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub max_tokens: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub stream: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolSchema {
    pub r#type: String,
    pub function: FunctionSchema,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FunctionSchema {
    pub name: String,
    pub description: String,
    pub parameters: serde_json::Value,
}

#[derive(Debug, Clone, Deserialize)]
pub struct ChatResponse {
    pub id: String,
    pub choices: Vec<Choice>,
    pub usage: Option<UsageInfo>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct Choice {
    pub index: u32,
    pub message: ChatMessage,
    pub finish_reason: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct UsageInfo {
    pub prompt_tokens: u32,
    pub completion_tokens: u32,
    pub total_tokens: u32,
}

// ── Agent Result (parity with Anthropic AgentResult) ──────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentResult {
    pub success: bool,
    pub result: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
    pub turns: u32,
    pub usage: UsageInfo,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tool_calls_made: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub session_id: Option<String>,
}

// ── Agent Definition (parity with Anthropic AgentDefinition) ──────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentDefinition {
    pub name: String,
    pub description: String,
    pub prompt: String,
    #[serde(default)]
    pub model: DeepSeekModel,
    #[serde(default)]
    pub tools: Vec<String>,
    #[serde(default)]
    pub disallowed_tools: Vec<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub max_turns: Option<u32>,
}

// ── Hook Types (parity with Anthropic hooks) ──────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum HookEvent {
    PreToolUse,
    PostToolUse,
    PostToolUseFailure,
    SessionStart,
    SessionEnd,
    SubagentStart,
    SubagentStop,
    PrePhase,
    PostPhase,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HookInput {
    pub event: HookEvent,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tool_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tool_input: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tool_output: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub phase_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub session_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub agent_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HookOutput {
    #[serde(default)]
    pub allow: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub deny_reason: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub additional_context: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub modified_input: Option<serde_json::Value>,
}

impl Default for HookOutput {
    fn default() -> Self {
        Self { allow: true, deny_reason: None, additional_context: None, modified_input: None }
    }
}

// ── Session Types (parity with Anthropic session management) ──────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Session {
    pub id: String,
    pub messages: Vec<ChatMessage>,
    pub agent_name: String,
    pub model: DeepSeekModel,
    pub created_at: String,
    pub updated_at: String,
    pub turn_count: u32,
    pub total_usage: UsageInfo,
    #[serde(default)]
    pub metadata: HashMap<String, serde_json::Value>,
}

// ── SDD Phase Types ───────────────────────────────────────────────────────

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum SddPhase {
    Explore,
    Propose,
    Spec,
    Design,
    Tasks,
    Apply,
    Verify,
    Archive,
}

impl SddPhase {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Explore => "explore",
            Self::Propose => "propose",
            Self::Spec => "spec",
            Self::Design => "design",
            Self::Tasks => "tasks",
            Self::Apply => "apply",
            Self::Verify => "verify",
            Self::Archive => "archive",
        }
    }

    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "explore" => Some(Self::Explore),
            "propose" => Some(Self::Propose),
            "spec" => Some(Self::Spec),
            "design" => Some(Self::Design),
            "tasks" => Some(Self::Tasks),
            "apply" => Some(Self::Apply),
            "verify" => Some(Self::Verify),
            "archive" => Some(Self::Archive),
            _ => None,
        }
    }

    /// Dependencies: which phases must complete before this one can start
    pub fn dependencies(&self) -> &[SddPhase] {
        match self {
            Self::Explore => &[],
            Self::Propose => &[],
            Self::Spec => &[Self::Propose],
            Self::Design => &[Self::Propose],
            Self::Tasks => &[Self::Spec, Self::Design],
            Self::Apply => &[Self::Tasks],
            Self::Verify => &[Self::Apply],
            Self::Archive => &[Self::Verify],
        }
    }

    /// Phases that can run in parallel with this one
    pub fn parallel_with(&self) -> &[SddPhase] {
        match self {
            Self::Spec => &[Self::Design],
            Self::Design => &[Self::Spec],
            _ => &[],
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SddChange {
    pub name: String,
    pub description: String,
    #[serde(default)]
    pub phases_completed: Vec<SddPhase>,
    #[serde(default)]
    pub phases_in_progress: Vec<SddPhase>,
    #[serde(default)]
    pub artifacts: HashMap<String, serde_json::Value>,
    pub created_at: String,
    pub updated_at: String,
}

// ── Permission Mode (parity with Anthropic PermissionMode) ────────────────

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum PermissionMode {
    Default,
    AcceptEdits,
    BypassPermissions,
    Plan,
    DontAsk,
}

impl Default for PermissionMode {
    fn default() -> Self { Self::Default }
}

// ── Effort Level (parity with Anthropic adaptive thinking) ────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum EffortLevel {
    Low,
    Medium,
    High,
    Max,
}

impl EffortLevel {
    /// Map effort to DeepSeek temperature (lower = more focused)
    pub fn temperature(&self) -> f64 {
        match self {
            Self::Low => 0.1,
            Self::Medium => 0.5,
            Self::High => 0.7,
            Self::Max => 1.0,
        }
    }

    /// Map effort to max tokens
    pub fn max_tokens(&self) -> u32 {
        match self {
            Self::Low => 2048,
            Self::Medium => 4096,
            Self::High => 8192,
            Self::Max => 16384,
        }
    }
}

impl Default for EffortLevel {
    fn default() -> Self { Self::High }
}
