/// Integration tests for `DeepSeekAgent::prompt`.
///
/// Each test spins up an in-process axum server on an ephemeral port, registers
/// pre-programmed responses, and drives the agent's tool-use loop against it.
/// No real network calls are made.
use std::{
    collections::VecDeque,
    sync::{Arc, Mutex},
};

use axum::{
    Json, Router,
    extract::State,
    http::{HeaderMap, StatusCode},
    response::{IntoResponse, Response},
    routing::post,
};
use research_agent::agent::{Client, Tool, ToolDefinition};
use serde_json::{Value, json};
use tokio::net::TcpListener;

// ─── Mock-server infrastructure ──────────────────────────────────────────────

/// A request captured by the mock server.
#[derive(Debug, Clone)]
struct Capture {
    body: Value,
    auth: String,
}

#[derive(Clone)]
struct MockState {
    /// Responses to serve (FIFO).
    responses: Arc<Mutex<VecDeque<Value>>>,
    /// Requests captured so far.
    captures: Arc<Mutex<Vec<Capture>>>,
}

async fn completions_handler(
    State(state): State<MockState>,
    headers: HeaderMap,
    Json(body): Json<Value>,
) -> Response {
    let auth = headers
        .get("authorization")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("")
        .to_string();

    state.captures.lock().unwrap().push(Capture { body, auth });

    let mut queue = state.responses.lock().unwrap();
    match queue.pop_front() {
        Some(r) => {
            // Convention: `{"_status": N, "body": {...}}` returns an HTTP error.
            if let Some(code) = r["_status"].as_u64() {
                let status = StatusCode::from_u16(code as u16).unwrap_or(StatusCode::INTERNAL_SERVER_ERROR);
                return (status, Json(r["body"].clone())).into_response();
            }
            Json(r).into_response()
        }
        None => (StatusCode::INTERNAL_SERVER_ERROR, "mock exhausted").into_response(),
    }
}

struct MockServer {
    pub base_url: String,
    pub captures: Arc<Mutex<Vec<Capture>>>,
}

async fn start_mock(responses: Vec<Value>) -> MockServer {
    let state = MockState {
        responses: Arc::new(Mutex::new(responses.into_iter().collect())),
        captures: Arc::new(Mutex::new(Vec::new())),
    };
    let captures = state.captures.clone();

    let app = Router::new()
        .route("/v1/chat/completions", post(completions_handler))
        .with_state(state);

    let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();

    tokio::spawn(async move {
        axum::serve(listener, app).await.unwrap();
    });

    MockServer {
        base_url: format!("http://{addr}"),
        captures,
    }
}

// ─── Minimal no-op tool for tests ─────────────────────────────────────────────

struct EchoTool;

#[async_trait::async_trait]
impl Tool for EchoTool {
    fn name(&self) -> &str { "echo" }

    fn definition(&self) -> ToolDefinition {
        ToolDefinition {
            name: "echo".into(),
            description: "Echoes the input back.".into(),
            parameters: json!({
                "type": "object",
                "properties": {
                    "text": { "type": "string" }
                },
                "required": ["text"]
            }),
        }
    }

    async fn call_json(&self, args: Value) -> anyhow::Result<String> {
        Ok(args["text"].as_str().unwrap_or("").to_string())
    }
}

struct FailingTool;

#[async_trait::async_trait]
impl Tool for FailingTool {
    fn name(&self) -> &str { "failing_tool" }

    fn definition(&self) -> ToolDefinition {
        ToolDefinition {
            name: "failing_tool".into(),
            description: "Always fails.".into(),
            parameters: json!({ "type": "object", "properties": {} }),
        }
    }

    async fn call_json(&self, _args: Value) -> anyhow::Result<String> {
        anyhow::bail!("tool exploded")
    }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

fn stop_response(content: &str) -> Value {
    json!({
        "choices": [{
            "finish_reason": "stop",
            "message": { "role": "assistant", "content": content }
        }]
    })
}

fn tool_call_response(calls: Vec<Value>) -> Value {
    json!({
        "choices": [{
            "finish_reason": "tool_calls",
            "message": {
                "role": "assistant",
                "content": null,
                "tool_calls": calls
            }
        }]
    })
}

fn call(id: &str, name: &str, arguments: &str) -> Value {
    json!({
        "id": id,
        "type": "function",
        "function": { "name": name, "arguments": arguments }
    })
}

// ─── Tests ───────────────────────────────────────────────────────────────────

#[tokio::test]
async fn single_turn_no_tools_returns_content() {
    let mock = start_mock(vec![stop_response("Hello, world!")]).await;
    let agent = Client::new("sk-test")
        .agent("deepseek-reasoner")
        .base_url(&mock.base_url)
        .build();

    let result = agent.prompt("Say hello".into()).await.unwrap();
    assert_eq!(result, "Hello, world!");
}

#[tokio::test]
async fn one_tool_call_round_trip() {
    // Turn 1: model requests echo("hello"), Turn 2: model gives final answer.
    let mock = start_mock(vec![
        tool_call_response(vec![call("c1", "echo", r#"{"text":"hello"}"#)]),
        stop_response("The echo returned: hello"),
    ])
    .await;

    let result = Client::new("sk-test")
        .agent("deepseek-chat")
        .base_url(&mock.base_url)
        .tool(EchoTool)
        .build()
        .prompt("Test echo".into())
        .await
        .unwrap();

    assert_eq!(result, "The echo returned: hello");

    // Two HTTP calls were made.
    assert_eq!(mock.captures.lock().unwrap().len(), 2);
}

#[tokio::test]
async fn tool_result_appended_to_messages() {
    let mock = start_mock(vec![
        tool_call_response(vec![call("c1", "echo", r#"{"text":"ping"}"#)]),
        stop_response("done"),
    ])
    .await;

    Client::new("sk-test")
        .agent("deepseek-chat")
        .base_url(&mock.base_url)
        .tool(EchoTool)
        .build()
        .prompt("ping it".into())
        .await
        .unwrap();

    let caps = mock.captures.lock().unwrap();
    // Second request must contain a tool result message.
    let second_messages = caps[1].body["messages"].as_array().unwrap();
    let tool_msg = second_messages
        .iter()
        .find(|m| m["role"] == "tool")
        .expect("tool message missing from second request");

    assert_eq!(tool_msg["tool_call_id"], "c1");
    assert_eq!(tool_msg["content"], "ping");
}

#[tokio::test]
async fn two_tool_calls_same_turn_both_executed() {
    // Model requests two echo calls in one turn.
    let mock = start_mock(vec![
        tool_call_response(vec![
            call("c1", "echo", r#"{"text":"alpha"}"#),
            call("c2", "echo", r#"{"text":"beta"}"#),
        ]),
        stop_response("got both"),
    ])
    .await;

    let result = Client::new("sk-test")
        .agent("deepseek-chat")
        .base_url(&mock.base_url)
        .tool(EchoTool)
        .build()
        .prompt("dual".into())
        .await
        .unwrap();

    assert_eq!(result, "got both");

    let caps = mock.captures.lock().unwrap();
    let second = caps[1].body["messages"].as_array().unwrap();
    let tool_msgs: Vec<_> = second.iter().filter(|m| m["role"] == "tool").collect();
    assert_eq!(tool_msgs.len(), 2, "expected 2 tool result messages");
    assert_eq!(tool_msgs[0]["content"], "alpha");
    assert_eq!(tool_msgs[1]["content"], "beta");
}

#[tokio::test]
async fn sequential_multi_turn_tool_calls() {
    // Turn 1 → tool_call, Turn 2 → tool_call again, Turn 3 → stop.
    let mock = start_mock(vec![
        tool_call_response(vec![call("c1", "echo", r#"{"text":"first"}"#)]),
        tool_call_response(vec![call("c2", "echo", r#"{"text":"second"}"#)]),
        stop_response("all done"),
    ])
    .await;

    let result = Client::new("sk-test")
        .agent("deepseek-chat")
        .base_url(&mock.base_url)
        .tool(EchoTool)
        .build()
        .prompt("chain".into())
        .await
        .unwrap();

    assert_eq!(result, "all done");
    assert_eq!(mock.captures.lock().unwrap().len(), 3);
}

#[tokio::test]
async fn unknown_tool_name_produces_error_string_in_message() {
    let mock = start_mock(vec![
        tool_call_response(vec![call("c1", "nonexistent_tool", r#"{}"#)]),
        stop_response("noted"),
    ])
    .await;

    // No tool registered — agent should gracefully pass "Unknown tool:" message back.
    Client::new("sk-test")
        .agent("deepseek-chat")
        .base_url(&mock.base_url)
        .build()
        .prompt("call unknown".into())
        .await
        .unwrap();

    let caps = mock.captures.lock().unwrap();
    let msgs = caps[1].body["messages"].as_array().unwrap();
    let tool_msg = msgs.iter().find(|m| m["role"] == "tool").unwrap();
    assert!(
        tool_msg["content"].as_str().unwrap().starts_with("Unknown tool:"),
        "expected 'Unknown tool:' prefix, got: {}",
        tool_msg["content"]
    );
}

#[tokio::test]
async fn failing_tool_produces_tool_error_string() {
    let mock = start_mock(vec![
        tool_call_response(vec![call("c1", "failing_tool", r#"{}"#)]),
        stop_response("ok"),
    ])
    .await;

    Client::new("sk-test")
        .agent("deepseek-chat")
        .base_url(&mock.base_url)
        .tool(FailingTool)
        .build()
        .prompt("break it".into())
        .await
        .unwrap();

    let caps = mock.captures.lock().unwrap();
    let msgs = caps[1].body["messages"].as_array().unwrap();
    let tool_msg = msgs.iter().find(|m| m["role"] == "tool").unwrap();
    assert!(
        tool_msg["content"].as_str().unwrap().starts_with("Tool error:"),
        "expected 'Tool error:' prefix"
    );
}

#[tokio::test]
async fn http_500_propagates_as_error() {
    let mock = start_mock(vec![json!({ "_status": 500, "body": {"error": "oops"} })]).await;

    let err = Client::new("sk-test")
        .agent("deepseek-chat")
        .base_url(&mock.base_url)
        .build()
        .prompt("fail".into())
        .await
        .unwrap_err();

    let msg = err.to_string();
    assert!(
        msg.contains("error status") || msg.contains("500"),
        "unexpected error message: {msg}"
    );
}

#[tokio::test]
async fn http_401_propagates_as_error() {
    let mock = start_mock(vec![json!({ "_status": 401, "body": {"error": "unauthorized"} })]).await;

    let err = Client::new("sk-test")
        .agent("deepseek-chat")
        .base_url(&mock.base_url)
        .build()
        .prompt("auth test".into())
        .await
        .unwrap_err();

    let msg = err.to_string();
    assert!(
        msg.contains("error status") || msg.contains("401"),
        "unexpected error: {msg}"
    );
}

#[tokio::test]
async fn missing_content_on_stop_returns_error() {
    // Model says stop but content is null.
    let mock = start_mock(vec![json!({
        "choices": [{ "finish_reason": "stop", "message": { "content": null } }]
    })])
    .await;

    let err = Client::new("sk-test")
        .agent("deepseek-chat")
        .base_url(&mock.base_url)
        .build()
        .prompt("oops".into())
        .await
        .unwrap_err();

    assert!(err.to_string().contains("No content"), "unexpected: {err}");
}

#[tokio::test]
async fn bearer_auth_header_sent() {
    let mock = start_mock(vec![stop_response("ok")]).await;
    Client::new("my-secret-key")
        .agent("deepseek-chat")
        .base_url(&mock.base_url)
        .build()
        .prompt("check header".into())
        .await
        .unwrap();

    let caps = mock.captures.lock().unwrap();
    assert_eq!(caps[0].auth, "Bearer my-secret-key");
}

#[tokio::test]
async fn request_body_contains_model_name() {
    let mock = start_mock(vec![stop_response("ok")]).await;
    Client::new("sk-test")
        .agent("deepseek-reasoner")
        .base_url(&mock.base_url)
        .build()
        .prompt("check model".into())
        .await
        .unwrap();

    assert_eq!(
        mock.captures.lock().unwrap()[0].body["model"],
        "deepseek-reasoner"
    );
}

#[tokio::test]
async fn request_contains_system_preamble_and_user_prompt() {
    let mock = start_mock(vec![stop_response("ok")]).await;
    Client::new("sk-test")
        .agent("deepseek-chat")
        .preamble("You are a trading assistant.")
        .base_url(&mock.base_url)
        .build()
        .prompt("What is the regime?".into())
        .await
        .unwrap();

    let caps = mock.captures.lock().unwrap();
    let messages = caps[0].body["messages"].as_array().unwrap();

    let sys = messages.iter().find(|m| m["role"] == "system").unwrap();
    assert_eq!(sys["content"], "You are a trading assistant.");

    let usr = messages.iter().find(|m| m["role"] == "user").unwrap();
    assert_eq!(usr["content"], "What is the regime?");
}

#[tokio::test]
async fn tool_definitions_serialized_in_request() {
    let mock = start_mock(vec![stop_response("ok")]).await;
    Client::new("sk-test")
        .agent("deepseek-chat")
        .base_url(&mock.base_url)
        .tool(EchoTool)
        .build()
        .prompt("check tools".into())
        .await
        .unwrap();

    let caps = mock.captures.lock().unwrap();
    let tools = caps[0].body["tools"].as_array().unwrap();
    assert_eq!(tools.len(), 1);
    assert_eq!(tools[0]["type"], "function");
    assert_eq!(tools[0]["function"]["name"], "echo");
    assert!(tools[0]["function"]["description"].is_string());
    assert!(tools[0]["function"]["parameters"].is_object());
}

#[tokio::test]
async fn no_tools_field_in_request_when_none_registered() {
    let mock = start_mock(vec![stop_response("ok")]).await;
    Client::new("sk-test")
        .agent("deepseek-chat")
        .base_url(&mock.base_url)
        .build() // no .tool(...)
        .prompt("no tools".into())
        .await
        .unwrap();

    let caps = mock.captures.lock().unwrap();
    // When tool list is empty the `tools` key should be absent from the request.
    assert!(
        caps[0].body.get("tools").is_none(),
        "tools key should be absent when no tools registered"
    );
}
