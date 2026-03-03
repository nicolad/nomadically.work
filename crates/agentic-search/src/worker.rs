use anyhow::{bail, Result};
use std::path::PathBuf;
use tracing::{info, warn};

use crate::deepseek::{DeepSeekClient, Message, Tool, ToolFunction};
use crate::tools;

/// A parallel worker agent — each instance runs its own independent DeepSeek
/// tool-calling loop with its own context window. Workers are spawned via
/// `tokio::spawn` by the orchestrator and run concurrently.
pub struct Worker {
    root: PathBuf,
    client: DeepSeekClient,
    max_turns: usize,
    /// Short label for log output, e.g. "Database layer".
    pub label: String,
}

impl Worker {
    pub fn new(root: PathBuf, client: DeepSeekClient, max_turns: usize, label: String) -> Self {
        Self { root, client, max_turns, label }
    }

    /// Run this worker's agent loop for the given sub-query.
    /// Returns a findings string to be synthesized by the orchestrator.
    pub async fn run(&self, query: &str) -> Result<String> {
        let tools = tool_definitions();

        let system = format!(
            "You are a parallel codebase search worker.\n\
             Your angle: \"{label}\".\n\
             Project root: {root}.\n\
             Use tools cheapest-first — glob (near-zero cost) before grep (lightweight) before read (heavy).\n\
             Be focused. Return all relevant findings with file:line references.",
            label = self.label,
            root = self.root.display()
        );

        let mut messages: Vec<Message> = vec![
            Message { role: "system".into(), content: Some(system), tool_calls: None, tool_call_id: None },
            Message { role: "user".into(), content: Some(query.to_string()), tool_calls: None, tool_call_id: None },
        ];

        for turn in 0..self.max_turns {
            info!("[{}] turn {}/{}", self.label, turn + 1, self.max_turns);

            let resp = self.client.chat(&messages, Some(&tools)).await?;
            let choice = resp.choices.into_iter().next()
                .ok_or_else(|| anyhow::anyhow!("[{}] empty response", self.label))?;

            let assistant = Message {
                role: "assistant".into(),
                content: choice.message.content.clone(),
                tool_calls: choice.message.tool_calls.clone(),
                tool_call_id: None,
            };
            messages.push(assistant);

            match choice.finish_reason.as_str() {
                "stop" | "end_turn" => {
                    return Ok(choice.message.content.unwrap_or_default());
                }
                "tool_calls" => {
                    let calls = match choice.message.tool_calls {
                        Some(c) if !c.is_empty() => c,
                        _ => {
                            warn!("[{}] tool_calls reason but no calls in message", self.label);
                            break;
                        }
                    };

                    for tc in &calls {
                        let result = self.execute(&tc.function.name, &tc.function.arguments);
                        info!(
                            "[{}] {} → {} lines",
                            self.label,
                            tc.function.name,
                            result.lines().count()
                        );
                        messages.push(Message {
                            role: "tool".into(),
                            content: Some(result),
                            tool_calls: None,
                            tool_call_id: Some(tc.id.clone()),
                        });
                    }
                }
                other => {
                    warn!("[{}] unexpected finish_reason: {other}", self.label);
                    if let Some(content) = choice.message.content {
                        return Ok(content);
                    }
                    break;
                }
            }
        }

        bail!("[{}] max_turns ({}) reached without final answer", self.label, self.max_turns)
    }

    fn execute(&self, name: &str, args_json: &str) -> String {
        tools::execute(name, args_json, &self.root)
    }
}

fn tool_definitions() -> Vec<Tool> {
    vec![
        Tool {
            kind: "function",
            function: ToolFunction {
                name: "glob",
                description: "Match file paths by glob pattern. Near-zero token cost — returns \
                              paths only. Always use this first before reading files.",
                parameters: serde_json::json!({
                    "type": "object",
                    "properties": {
                        "pattern": { "type": "string", "description": "Glob pattern, e.g. 'src/**/*.ts'" }
                    },
                    "required": ["pattern"]
                }),
            },
        },
        Tool {
            kind: "function",
            function: ToolFunction {
                name: "grep",
                description: "Regex content search. Lightweight — returns matching lines with \
                              file:line context. Use to locate symbols after glob.",
                parameters: serde_json::json!({
                    "type": "object",
                    "properties": {
                        "pattern": { "type": "string", "description": "Regex pattern" },
                        "glob":    { "type": "string", "description": "Optional file filter, e.g. '*.ts'" }
                    },
                    "required": ["pattern"]
                }),
            },
        },
        Tool {
            kind: "function",
            function: ToolFunction {
                name: "read",
                description: "Read full file contents with line numbers. Heavy — 500-5000 tokens. \
                              Only call after glob/grep confirms the file is relevant.",
                parameters: serde_json::json!({
                    "type": "object",
                    "properties": {
                        "path": { "type": "string", "description": "Relative file path from project root" }
                    },
                    "required": ["path"]
                }),
            },
        },
    ]
}
