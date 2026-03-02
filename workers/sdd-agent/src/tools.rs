// ═══════════════════════════════════════════════════════════════════════════
// MODULE: tools — Tool system with registry and function-calling schemas
// ═══════════════════════════════════════════════════════════════════════════
//
// Parity with Anthropic Agent SDK tools:
//   Read, Write, Edit, Glob, Grep, WebSearch, WebFetch,
//   AskUserQuestion, TodoWrite, Task (subagent delegation)
//
// In CF Workers/WASM, filesystem tools are backed by D1 or KV.
// Bash is sandboxed. WebSearch/WebFetch use native fetch.
// ═══════════════════════════════════════════════════════════════════════════

use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::collections::HashMap;

use crate::types::*;

// ── Tool Definition (mirrors Anthropic's tool schemas) ────────────────────

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ToolParam {
    pub name: String,
    pub description: String,
    pub r#type: String,
    pub required: bool,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ToolDefinition {
    pub name: String,
    pub description: String,
    pub parameters: Vec<ToolParam>,
}

impl ToolDefinition {
    /// Export as OpenAI/DeepSeek function-calling schema
    pub fn to_tool_schema(&self) -> ToolSchema {
        let mut properties = serde_json::Map::new();
        let mut required = Vec::new();

        for p in &self.parameters {
            properties.insert(
                p.name.clone(),
                json!({ "type": p.r#type, "description": p.description }),
            );
            if p.required {
                required.push(Value::String(p.name.clone()));
            }
        }

        ToolSchema {
            r#type: "function".into(),
            function: FunctionSchema {
                name: self.name.clone(),
                description: self.description.clone(),
                parameters: json!({
                    "type": "object",
                    "properties": properties,
                    "required": required,
                }),
            },
        }
    }
}

// ── Tool Registry (parity with Anthropic's tool runtime) ──────────────────

type ToolFn = Box<dyn Fn(Value) -> std::result::Result<Value, String> + Send + Sync>;

/// Registry of callable tools — mirrors the Anthropic Agent SDK's built-in
/// tool dispatch. Tools are registered by name and invoked by the agent loop.
pub struct ToolRegistry {
    tools: HashMap<String, (ToolDefinition, ToolFn)>,
}

impl ToolRegistry {
    pub fn new() -> Self {
        Self { tools: HashMap::new() }
    }

    pub fn register(
        &mut self,
        definition: ToolDefinition,
        f: impl Fn(Value) -> std::result::Result<Value, String> + Send + Sync + 'static,
    ) {
        let name = definition.name.clone();
        self.tools.insert(name, (definition, Box::new(f)));
    }

    pub fn call(&self, name: &str, args: Value) -> std::result::Result<Value, String> {
        match self.tools.get(name) {
            Some((_, f)) => f(args),
            None => {
                let available = self.list_names().join(", ");
                Err(format!("Unknown tool `{name}`. Available: {available}"))
            }
        }
    }

    pub fn get_definition(&self, name: &str) -> Option<&ToolDefinition> {
        self.tools.get(name).map(|(def, _)| def)
    }

    pub fn list_names(&self) -> Vec<String> {
        let mut names: Vec<String> = self.tools.keys().cloned().collect();
        names.sort();
        names
    }

    pub fn list_definitions(&self) -> Vec<&ToolDefinition> {
        self.tools.values().map(|(def, _)| def).collect()
    }

    pub fn to_tool_schemas(&self) -> Vec<ToolSchema> {
        self.tools.values().map(|(def, _)| def.to_tool_schema()).collect()
    }

    /// Filter to only the named tools (for subagent tool subsetting)
    pub fn filter_schemas(&self, tool_names: &[String]) -> Vec<ToolSchema> {
        self.tools.iter()
            .filter(|(name, _)| tool_names.contains(name))
            .map(|(_, (def, _))| def.to_tool_schema())
            .collect()
    }
}

// ── Built-in Tool Definitions ─────────────────────────────────────────────

/// Define all built-in tools (parity with Anthropic Agent SDK's 12 tools)
pub fn define_builtin_tools() -> Vec<ToolDefinition> {
    vec![
        // ── File Operations ──────────────────────────────────────────
        ToolDefinition {
            name: "Read".into(),
            description: "Read a file from the project. Returns file contents.".into(),
            parameters: vec![
                ToolParam { name: "file_path".into(), description: "Path to the file to read".into(), r#type: "string".into(), required: true },
                ToolParam { name: "offset".into(), description: "Line number to start from".into(), r#type: "integer".into(), required: false },
                ToolParam { name: "limit".into(), description: "Max lines to read".into(), r#type: "integer".into(), required: false },
            ],
        },
        ToolDefinition {
            name: "Write".into(),
            description: "Create or overwrite a file with new content.".into(),
            parameters: vec![
                ToolParam { name: "file_path".into(), description: "Path to the file to write".into(), r#type: "string".into(), required: true },
                ToolParam { name: "content".into(), description: "Content to write to the file".into(), r#type: "string".into(), required: true },
            ],
        },
        ToolDefinition {
            name: "Edit".into(),
            description: "Make a precise string replacement in a file.".into(),
            parameters: vec![
                ToolParam { name: "file_path".into(), description: "Path to the file to edit".into(), r#type: "string".into(), required: true },
                ToolParam { name: "old_string".into(), description: "Exact text to find and replace".into(), r#type: "string".into(), required: true },
                ToolParam { name: "new_string".into(), description: "Text to replace with".into(), r#type: "string".into(), required: true },
            ],
        },

        // ── Search Operations ────────────────────────────────────────
        ToolDefinition {
            name: "Glob".into(),
            description: "Find files matching a glob pattern.".into(),
            parameters: vec![
                ToolParam { name: "pattern".into(), description: "Glob pattern (e.g. **/*.rs)".into(), r#type: "string".into(), required: true },
                ToolParam { name: "path".into(), description: "Base directory to search in".into(), r#type: "string".into(), required: false },
            ],
        },
        ToolDefinition {
            name: "Grep".into(),
            description: "Search file contents with regex pattern.".into(),
            parameters: vec![
                ToolParam { name: "pattern".into(), description: "Regex pattern to search for".into(), r#type: "string".into(), required: true },
                ToolParam { name: "path".into(), description: "Path to search in".into(), r#type: "string".into(), required: false },
                ToolParam { name: "glob".into(), description: "Glob filter for files".into(), r#type: "string".into(), required: false },
            ],
        },

        // ── Execution ────────────────────────────────────────────────
        ToolDefinition {
            name: "Bash".into(),
            description: "Execute a shell command. Sandboxed for safety.".into(),
            parameters: vec![
                ToolParam { name: "command".into(), description: "The shell command to execute".into(), r#type: "string".into(), required: true },
                ToolParam { name: "timeout".into(), description: "Timeout in milliseconds".into(), r#type: "integer".into(), required: false },
            ],
        },

        // ── Web Operations ───────────────────────────────────────────
        ToolDefinition {
            name: "WebSearch".into(),
            description: "Search the web for information.".into(),
            parameters: vec![
                ToolParam { name: "query".into(), description: "Search query".into(), r#type: "string".into(), required: true },
            ],
        },
        ToolDefinition {
            name: "WebFetch".into(),
            description: "Fetch content from a URL and extract information.".into(),
            parameters: vec![
                ToolParam { name: "url".into(), description: "URL to fetch".into(), r#type: "string".into(), required: true },
                ToolParam { name: "prompt".into(), description: "What to extract from the page".into(), r#type: "string".into(), required: true },
            ],
        },

        // ── Agent Delegation ─────────────────────────────────────────
        ToolDefinition {
            name: "Task".into(),
            description: "Delegate a task to a subagent. Subagents run independently with their own tools.".into(),
            parameters: vec![
                ToolParam { name: "agent".into(), description: "Name of the subagent to delegate to".into(), r#type: "string".into(), required: true },
                ToolParam { name: "prompt".into(), description: "Task description for the subagent".into(), r#type: "string".into(), required: true },
            ],
        },

        // ── Structured Data ──────────────────────────────────────────
        ToolDefinition {
            name: "TodoWrite".into(),
            description: "Create or update a structured todo list to track progress.".into(),
            parameters: vec![
                ToolParam { name: "todos".into(), description: "JSON array of todo items with content, status, activeForm".into(), r#type: "string".into(), required: true },
            ],
        },

        // ── Database ─────────────────────────────────────────────────
        ToolDefinition {
            name: "D1Query".into(),
            description: "Execute a SQL query against the D1 database.".into(),
            parameters: vec![
                ToolParam { name: "sql".into(), description: "SQL query to execute".into(), r#type: "string".into(), required: true },
                ToolParam { name: "params".into(), description: "JSON array of bind parameters".into(), r#type: "string".into(), required: false },
            ],
        },

        // ── SDD-Specific ─────────────────────────────────────────────
        ToolDefinition {
            name: "SddPhase".into(),
            description: "Execute an SDD phase (explore/propose/spec/design/tasks/apply/verify/archive).".into(),
            parameters: vec![
                ToolParam { name: "phase".into(), description: "SDD phase name".into(), r#type: "string".into(), required: true },
                ToolParam { name: "change_name".into(), description: "Name of the change".into(), r#type: "string".into(), required: true },
                ToolParam { name: "input".into(), description: "Additional input/context for the phase".into(), r#type: "string".into(), required: false },
            ],
        },
    ]
}

/// Build a ToolRegistry with all built-in tools registered.
/// Tool execution is backed by D1 (for file ops) and native fetch (for web).
pub fn build_builtin_registry() -> ToolRegistry {
    let mut registry = ToolRegistry::new();
    let definitions = define_builtin_tools();

    for def in definitions {
        let name = def.name.clone();
        registry.register(def, move |args| {
            // Placeholder implementations — actual execution happens in the
            // async tool executor which has access to D1, Env, etc.
            Ok(json!({
                "tool": name,
                "args": args,
                "status": "dispatched",
                "note": "Execution handled by async ToolExecutor",
            }))
        });
    }

    registry
}

// ── Tool Presets (parity with Anthropic TOOL_PRESETS) ─────────────────────

pub const TOOLS_READONLY: &[&str] = &["Read", "Glob", "Grep"];
pub const TOOLS_FILE_OPS: &[&str] = &["Read", "Write", "Edit", "Glob", "Grep"];
pub const TOOLS_CODING: &[&str] = &["Read", "Write", "Edit", "Bash", "Glob", "Grep"];
pub const TOOLS_WEB: &[&str] = &["WebSearch", "WebFetch"];
pub const TOOLS_SDD: &[&str] = &["Read", "Write", "Edit", "Glob", "Grep", "D1Query", "SddPhase", "Task"];
pub const TOOLS_ALL: &[&str] = &[
    "Read", "Write", "Edit", "Bash", "Glob", "Grep",
    "WebSearch", "WebFetch", "Task", "TodoWrite",
    "D1Query", "SddPhase",
];
