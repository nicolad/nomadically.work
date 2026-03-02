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

// ── Async Tool Executor (real tool execution with D1 + fetch) ──────────────

/// Async tool executor that actually runs tools against D1 and fetch backends.
/// This is what the agent loop calls for each tool invocation.
pub struct ToolExecutor {
    env: worker::Env,
}

impl ToolExecutor {
    pub fn new(env: worker::Env) -> Self {
        Self { env }
    }

    fn db(&self) -> std::result::Result<worker::D1Database, String> {
        self.env.d1("DB").map_err(|e| format!("D1 binding error: {e}"))
    }

    /// Execute a tool by name with given arguments.
    /// Returns the tool result as JSON.
    pub async fn execute(&self, name: &str, args: Value) -> std::result::Result<Value, String> {
        match name {
            "Read" => self.exec_read(args).await,
            "Write" => self.exec_write(args).await,
            "Edit" => self.exec_edit(args).await,
            "Glob" => self.exec_glob(args).await,
            "Grep" => self.exec_grep(args).await,
            "Bash" => Ok(json!({
                "error": "Bash is not available in WASM runtime. Use D1Query for database operations or WebFetch for HTTP requests."
            })),
            "WebFetch" => self.exec_web_fetch(args).await,
            "WebSearch" => Ok(json!({
                "note": "WebSearch is not directly available. Use WebFetch with a search engine URL instead."
            })),
            "D1Query" => self.exec_d1_query(args).await,
            "TodoWrite" => self.exec_todo_write(args).await,
            "Task" | "SddPhase" => Ok(json!({
                "error": format!("Tool `{name}` requires delegation and cannot be executed inline. The agent loop handles this.")
            })),
            _ => Err(format!("Unknown tool: {name}")),
        }
    }

    // ── File Operations (backed by D1 file_store table) ──────────────

    async fn ensure_file_store(&self) -> std::result::Result<(), String> {
        self.db()?.exec(
            "CREATE TABLE IF NOT EXISTS file_store (
                path TEXT PRIMARY KEY,
                content TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now'))
            )"
        ).await.map_err(|e| format!("Failed to create file_store: {e}"))?;
        Ok(())
    }

    async fn exec_read(&self, args: Value) -> std::result::Result<Value, String> {
        let file_path = args["file_path"].as_str().ok_or("file_path is required")?;
        let offset = args["offset"].as_u64().unwrap_or(0) as usize;
        let limit = args["limit"].as_u64().unwrap_or(0) as usize;

        self.ensure_file_store().await?;

        let row = self.db()?.prepare("SELECT content FROM file_store WHERE path = ?1")
            .bind(&[file_path.into()])
            .map_err(|e| format!("Bind error: {e}"))?
            .first::<Value>(None)
            .await
            .map_err(|e| format!("Query error: {e}"))?;

        match row {
            Some(r) => {
                let content = r["content"].as_str().unwrap_or("");
                let lines: Vec<&str> = content.lines().collect();
                let total = lines.len();

                let start = offset.min(total);
                let end = if limit > 0 { (start + limit).min(total) } else { total };
                let selected: Vec<String> = lines[start..end]
                    .iter()
                    .enumerate()
                    .map(|(i, line)| format!("{:>4}\t{}", start + i + 1, line))
                    .collect();

                Ok(json!({
                    "file_path": file_path,
                    "content": selected.join("\n"),
                    "total_lines": total,
                }))
            }
            None => Err(format!("File not found: {file_path}")),
        }
    }

    async fn exec_write(&self, args: Value) -> std::result::Result<Value, String> {
        let file_path = args["file_path"].as_str().ok_or("file_path is required")?;
        let content = args["content"].as_str().ok_or("content is required")?;

        self.ensure_file_store().await?;

        self.db()?.prepare(
            "INSERT INTO file_store (path, content) VALUES (?1, ?2) ON CONFLICT(path) DO UPDATE SET content = ?2, updated_at = datetime('now')"
        )
            .bind(&[file_path.into(), content.into()])
            .map_err(|e| format!("Bind error: {e}"))?
            .run()
            .await
            .map_err(|e| format!("Write error: {e}"))?;

        Ok(json!({
            "file_path": file_path,
            "bytes_written": content.len(),
        }))
    }

    async fn exec_edit(&self, args: Value) -> std::result::Result<Value, String> {
        let file_path = args["file_path"].as_str().ok_or("file_path is required")?;
        let old_string = args["old_string"].as_str().ok_or("old_string is required")?;
        let new_string = args["new_string"].as_str().ok_or("new_string is required")?;

        self.ensure_file_store().await?;

        let row = self.db()?.prepare("SELECT content FROM file_store WHERE path = ?1")
            .bind(&[file_path.into()])
            .map_err(|e| format!("Bind error: {e}"))?
            .first::<Value>(None)
            .await
            .map_err(|e| format!("Query error: {e}"))?;

        let content = match row {
            Some(r) => r["content"].as_str().unwrap_or("").to_string(),
            None => return Err(format!("File not found: {file_path}")),
        };

        let count = content.matches(old_string).count();
        if count == 0 {
            return Err(format!("old_string not found in {file_path}"));
        }
        if count > 1 {
            return Err(format!("old_string found {count} times in {file_path} — must be unique"));
        }

        let new_content = content.replacen(old_string, new_string, 1);

        self.db()?.prepare(
            "UPDATE file_store SET content = ?1, updated_at = datetime('now') WHERE path = ?2"
        )
            .bind(&[new_content.as_str().into(), file_path.into()])
            .map_err(|e| format!("Bind error: {e}"))?
            .run()
            .await
            .map_err(|e| format!("Update error: {e}"))?;

        Ok(json!({
            "file_path": file_path,
            "replacements": 1,
        }))
    }

    // ── Search Operations (backed by D1 LIKE queries) ────────────────

    async fn exec_glob(&self, args: Value) -> std::result::Result<Value, String> {
        let pattern = args["pattern"].as_str().ok_or("pattern is required")?;

        self.ensure_file_store().await?;

        // Convert glob to SQL LIKE: **/*.rs → %%.rs, src/**/* → src/%
        let like_pattern = pattern
            .replace("**", "%")
            .replace('*', "%")
            .replace('?', "_");

        let rows = self.db()?.prepare(
            "SELECT path FROM file_store WHERE path LIKE ?1 ORDER BY updated_at DESC LIMIT 100"
        )
            .bind(&[like_pattern.as_str().into()])
            .map_err(|e| format!("Bind error: {e}"))?
            .all()
            .await
            .map_err(|e| format!("Query error: {e}"))?
            .results::<Value>()
            .map_err(|e| format!("Parse error: {e}"))?;

        let paths: Vec<&str> = rows.iter()
            .filter_map(|r| r["path"].as_str())
            .collect();

        Ok(json!({
            "pattern": pattern,
            "matches": paths,
            "count": paths.len(),
        }))
    }

    async fn exec_grep(&self, args: Value) -> std::result::Result<Value, String> {
        let pattern = args["pattern"].as_str().ok_or("pattern is required")?;

        self.ensure_file_store().await?;

        // Use SQL LIKE for basic content search (no regex in SQLite by default)
        let like_pattern = format!("%{pattern}%");

        let rows = self.db()?.prepare(
            "SELECT path, content FROM file_store WHERE content LIKE ?1 LIMIT 50"
        )
            .bind(&[like_pattern.as_str().into()])
            .map_err(|e| format!("Bind error: {e}"))?
            .all()
            .await
            .map_err(|e| format!("Query error: {e}"))?
            .results::<Value>()
            .map_err(|e| format!("Parse error: {e}"))?;

        let mut matches: Vec<Value> = Vec::new();
        for row in &rows {
            let path = row["path"].as_str().unwrap_or("");
            let content = row["content"].as_str().unwrap_or("");
            let matching_lines: Vec<Value> = content.lines()
                .enumerate()
                .filter(|(_, line)| line.contains(pattern))
                .take(10)
                .map(|(i, line)| json!({ "line": i + 1, "content": line }))
                .collect();

            if !matching_lines.is_empty() {
                matches.push(json!({
                    "path": path,
                    "matches": matching_lines,
                }));
            }
        }

        Ok(json!({
            "pattern": pattern,
            "files": matches,
            "total_files": matches.len(),
        }))
    }

    // ── Web Operations (backed by worker::Fetch) ─────────────────────

    async fn exec_web_fetch(&self, args: Value) -> std::result::Result<Value, String> {
        let url = args["url"].as_str().ok_or("url is required")?;
        let prompt = args["prompt"].as_str().unwrap_or("Extract the main content");

        let request = worker::Request::new(url, worker::Method::Get)
            .map_err(|e| format!("Request error: {e}"))?;

        let mut response = worker::Fetch::Request(request)
            .send()
            .await
            .map_err(|e| format!("Fetch error: {e}"))?;

        let status = response.status_code();
        let text = response.text().await.map_err(|e| format!("Read error: {e}"))?;

        // Truncate to avoid blowing up context
        let truncated = if text.len() > 8000 {
            format!("{}...[truncated at 8000 chars]", &text[..8000])
        } else {
            text
        };

        Ok(json!({
            "url": url,
            "status": status,
            "prompt": prompt,
            "content": truncated,
        }))
    }

    // ── Database Operations (direct D1 query) ────────────────────────

    async fn exec_d1_query(&self, args: Value) -> std::result::Result<Value, String> {
        let sql = args["sql"].as_str().ok_or("sql is required")?;

        let stmt = self.db()?.prepare(sql);

        // Bind params if provided — convert JSON values to JsValue for D1
        let stmt = if let Some(params_str) = args["params"].as_str() {
            let params: Vec<Value> = serde_json::from_str(params_str)
                .map_err(|e| format!("Invalid params JSON: {e}"))?;

            let jv_params: Vec<worker::wasm_bindgen::JsValue> = params.iter().map(|v| {
                match v {
                    Value::String(s) => worker::wasm_bindgen::JsValue::from_str(s),
                    Value::Number(n) => {
                        if let Some(f) = n.as_f64() {
                            worker::wasm_bindgen::JsValue::from_f64(f)
                        } else {
                            worker::wasm_bindgen::JsValue::from_str(&n.to_string())
                        }
                    }
                    Value::Null => worker::wasm_bindgen::JsValue::NULL,
                    Value::Bool(b) => worker::wasm_bindgen::JsValue::from_bool(*b),
                    other => worker::wasm_bindgen::JsValue::from_str(&other.to_string()),
                }
            }).collect();

            stmt.bind(&jv_params)
                .map_err(|e| format!("Bind error: {e}"))?
        } else {
            stmt.bind(&[]).map_err(|e| format!("Bind error: {e}"))?
        };

        // Detect if it's a SELECT/read query
        let is_read = sql.trim_start().to_uppercase().starts_with("SELECT")
            || sql.trim_start().to_uppercase().starts_with("PRAGMA")
            || sql.trim_start().to_uppercase().starts_with("EXPLAIN");

        if is_read {
            let result = stmt.all().await.map_err(|e| format!("Query error: {e}"))?;
            let rows = result.results::<Value>().map_err(|e| format!("Parse error: {e}"))?;
            Ok(json!({
                "rows": rows,
                "count": rows.len(),
            }))
        } else {
            stmt.run().await.map_err(|e| format!("Exec error: {e}"))?;
            Ok(json!({ "success": true }))
        }
    }

    // ── Structured Data ──────────────────────────────────────────────

    async fn exec_todo_write(&self, args: Value) -> std::result::Result<Value, String> {
        let todos_str = args["todos"].as_str().ok_or("todos is required")?;
        let todos: Value = serde_json::from_str(todos_str)
            .map_err(|e| format!("Invalid todos JSON: {e}"))?;

        // Store in D1 for persistence
        self.ensure_file_store().await?;

        let content = serde_json::to_string_pretty(&todos)
            .map_err(|e| format!("Serialize error: {e}"))?;

        self.db()?.prepare(
            "INSERT INTO file_store (path, content) VALUES ('__todos__.json', ?1) ON CONFLICT(path) DO UPDATE SET content = ?1, updated_at = datetime('now')"
        )
            .bind(&[content.as_str().into()])
            .map_err(|e| format!("Bind error: {e}"))?
            .run()
            .await
            .map_err(|e| format!("Write error: {e}"))?;

        Ok(json!({
            "todos_saved": true,
            "count": todos.as_array().map(|a| a.len()).unwrap_or(0),
        }))
    }
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
