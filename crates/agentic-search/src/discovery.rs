use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tokio::sync::mpsc;
use tracing::{info, warn};

use crate::deepseek::{DeepSeekClient, Message, Tool, ToolFunction};
use crate::tools;

// ── Output schema (written to discovery.json) ────────────────────────────────

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct SourceLocation {
    pub path: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub line: Option<u32>,
    pub note: String,
}

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct Alternative {
    pub name: String,
    pub reason_not_chosen: String,
}

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct DiscoveredEntry {
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub version: Option<String>,
    pub role: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub url: Option<String>,
    pub details: String,
    pub facts: Vec<String>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub source_locations: Vec<SourceLocation>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub why_chosen: Option<String>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub pros: Vec<String>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub cons: Vec<String>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub alternatives_considered: Vec<Alternative>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub trade_offs: Vec<String>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub patterns_used: Vec<String>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub interview_points: Vec<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct DiscoveredGroup {
    pub label: String,
    pub color: String,
    pub entries: Vec<DiscoveredEntry>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct DiscoveryOutput {
    pub generated_at: String,
    pub root: String,
    pub groups: Vec<DiscoveredGroup>,
}

// ── Predefined targets (one parallel worker per group) ───────────────────────

struct Target {
    label: &'static str,
    color: &'static str,
    technologies: &'static str,
    /// Hints telling the worker where to look in the codebase.
    hints: &'static str,
}

const TARGETS: &[Target] = &[
    Target {
        label: "Frontend",
        color: "violet",
        technologies: "Next.js, React, Radix UI (Themes + Icons), Clerk",
        hints: "Read package.json for exact versions. Glob src/app/**/* to count routes. \
                Glob src/components/**/* to count components. Read next.config.ts and vercel.json.",
    },
    Target {
        label: "API",
        color: "blue",
        technologies: "Apollo Server 5, GraphQL, Vercel routes",
        hints: "Glob schema/**/*.graphql and count types/queries/mutations. \
                Glob src/app/api/**/* to list API routes. \
                Read src/apollo/context.ts. Read vercel.json for timeout config.",
    },
    Target {
        label: "Database",
        color: "cyan",
        technologies: "Cloudflare D1, Drizzle ORM, D1 Gateway Worker",
        hints: "Read src/db/schema.ts and count table definitions. \
                Glob migrations/*.sql and count files. \
                Read workers/d1-gateway.ts for gateway details. \
                Read wrangler.d1-gateway.toml for binding config. \
                Check src/db/d1-http.ts to understand the gateway pattern. \
                Look for Turso/libSQL references for migration history. \
                Grep for 'hasMore' to find pagination patterns.",
    },
    Target {
        label: "AI / ML",
        color: "orange",
        technologies: "DeepSeek, Anthropic Claude, Vercel AI SDK, OpenRouter, Google ADK",
        hints: "Read package.json for AI SDK versions. Glob src/agents/**/* and count agents. \
                Glob src/anthropic/**/* for Claude integrations. \
                Read workers/process-jobs/wrangler.jsonc for classification worker config. \
                Grep for 'deepseek' and 'claude' in src/ to find actual usage sites. \
                Check src/observability/prompts.ts for eval-first patterns. \
                Look for multi-model routing patterns across agents.",
    },
    Target {
        label: "Observability",
        color: "green",
        technologies: "Langfuse, LangSmith, OpenTelemetry",
        hints: "Read .env.example for LANGFUSE_ and LANGCHAIN_ vars. \
                Grep for 'langfuse' in src/ to find tracing call sites. \
                Read .claude/hooks/stop_hook.py for scoring pipeline. \
                Check package.json for observability deps.",
    },
    Target {
        label: "Workers",
        color: "amber",
        technologies: "janitor, insert-jobs, process-jobs, ashby-crawler (Rust/WASM), resume-rag (Python)",
        hints: "Glob workers/**/wrangler*.toml and read each one for: runtime, cron triggers, \
                queue bindings, D1 bindings. Read workers/ashby-crawler/Cargo.toml for Rust deps. \
                Count source files in each worker directory. \
                Check workers/ashby-crawler/src/lib.rs for rig_compat patterns and BM25 search. \
                Look for language choice rationale (Rust for CPU-bound, Python for LLM, TS for I/O).",
    },
    Target {
        label: "Background Jobs",
        color: "indigo",
        technologies: "Trigger.dev",
        hints: "Read trigger.config.ts. Glob src/trigger/**/*.ts and count task files. \
                Grep for 'task(' in src/trigger/ to find task definitions and their IDs. \
                Check package.json for @trigger.dev version.",
    },
    Target {
        label: "Evaluation",
        color: "crimson",
        technologies: "Promptfoo, Vitest",
        hints: "Glob src/evals/**/*.ts and list eval files. \
                Read src/evals/ files to find what each tests. \
                Check package.json for promptfoo and vitest versions. \
                Look for promptfoo config files in the root.",
    },
];

// ── Discovery worker ─────────────────────────────────────────────────────────

struct DiscoveryWorker {
    root: PathBuf,
    client: DeepSeekClient,
    max_turns: usize,
    target: &'static Target,
}

impl DiscoveryWorker {
    fn new(root: PathBuf, client: DeepSeekClient, max_turns: usize, target: &'static Target) -> Self {
        Self { root, client, max_turns, target }
    }

    async fn run(&self) -> Result<DiscoveredGroup> {
        let tools = tool_definitions();

        let system = format!(
            "You are a codebase discovery agent investigating the \"{label}\" layer.\n\
             Technologies: {technologies}\n\
             Project root: {root}\n\n\
             INSTRUCTIONS:\n\
             1. Use glob to find relevant files (cheap — do this first)\n\
             2. Use grep to find versions, config values, usage patterns (lightweight)\n\
             3. Use read to confirm details only in the most important files (expensive)\n\
             4. Discover REAL data: actual versions from package.json/Cargo.toml, actual file counts,\n\
                actual cron schedules, actual table names, actual env var names, etc.\n\
             5. For each entry, find the EXACT files and line numbers where that technology is used.\n\
                Use grep to locate import statements, config keys, or usage sites. Record file paths\n\
                relative to project root (e.g. src/db/schema.ts) and the first relevant line number.\n\
             6. Reason about WHY this technology was chosen based on code evidence — what alternatives\n\
                exist in the ecosystem and why this project chose differently.\n\
             7. Identify design patterns visible in the implementation (e.g. gateway pattern, DataLoader,\n\
                lazy initialization, schema-first development).\n\
             8. Write 3-5 interview talking points — concise, opinionated, experience-based. Each should\n\
                be a sentence you could say in a technical interview to demonstrate deep understanding.\n\
             9. When done, respond with ONLY a valid JSON object — no markdown, no explanation.\n\n\
             OUTPUT SCHEMA (respond with ONLY this JSON, nothing else):\n\
             {{\n\
               \"label\": \"{label}\",\n\
               \"color\": \"{color}\",\n\
               \"entries\": [\n\
                 {{\n\
                   \"name\": \"Technology name with version\",\n\
                   \"version\": \"x.y.z or null\",\n\
                   \"role\": \"One-line role in this project\",\n\
                   \"url\": \"https://official-site.com or null\",\n\
                   \"details\": \"2-3 sentences on actual usage — mention specific files, patterns, configs discovered\",\n\
                   \"facts\": [\"Concrete discovered fact with numbers\", \"Another specific fact\"],\n\
                   \"source_locations\": [\n\
                     {{ \"path\": \"src/db/schema.ts\", \"line\": 1, \"note\": \"Drizzle schema entrypoint\" }},\n\
                     {{ \"path\": \"package.json\", \"line\": 73, \"note\": \"drizzle-orm dependency\" }}\n\
                   ],\n\
                   \"why_chosen\": \"1-2 sentences on WHY this tech was chosen over alternatives, based on code evidence\",\n\
                   \"pros\": [\"Advantage 1\", \"Advantage 2\", \"Advantage 3\"],\n\
                   \"cons\": [\"Drawback 1\", \"Drawback 2\"],\n\
                   \"alternatives_considered\": [\n\
                     {{ \"name\": \"AlternativeTech\", \"reason_not_chosen\": \"Why it was not chosen\" }}\n\
                   ],\n\
                   \"trade_offs\": [\"Trade-off decision 1\", \"Trade-off decision 2\"],\n\
                   \"patterns_used\": [\"Pattern visible in implementation\"],\n\
                   \"interview_points\": [\"Concise talking point for a technical interview\"]\n\
                 }}\n\
               ]\n\
             }}",
            label = self.target.label,
            color = self.target.color,
            technologies = self.target.technologies,
            root = self.root.display(),
        );

        let query = format!(
            "Investigate the {} layer. Search hints: {}",
            self.target.label, self.target.hints
        );

        let mut messages: Vec<Message> = vec![
            Message { role: "system".into(), content: Some(system), tool_calls: None, tool_call_id: None },
            Message { role: "user".into(), content: Some(query), tool_calls: None, tool_call_id: None },
        ];

        for turn in 0..self.max_turns {
            // On the second-to-last turn, stop accepting tool calls and force JSON output.
            let is_last_research_turn = turn == self.max_turns - 2;

            info!("[{}] discovery turn {}/{}", self.target.label, turn + 1, self.max_turns);

            let resp = self.client.chat(&messages, Some(&tools)).await?;
            let choice = resp.choices.into_iter().next()
                .context("empty discovery response")?;

            let assistant = Message {
                role: "assistant".into(),
                content: choice.message.content.clone(),
                tool_calls: choice.message.tool_calls.clone(),
                tool_call_id: None,
            };
            messages.push(assistant);

            match choice.finish_reason.as_str() {
                "stop" | "end_turn" => {
                    let content = choice.message.content.unwrap_or_default();
                    return parse_group_json(&content, self.target);
                }
                "tool_calls" => {
                    let calls = match choice.message.tool_calls {
                        Some(c) if !c.is_empty() => c,
                        _ => {
                            warn!("[{}] tool_calls reason but no calls", self.target.label);
                            break;
                        }
                    };
                    for tc in &calls {
                        let result = tools::execute(&tc.function.name, &tc.function.arguments, &self.root);
                        info!(
                            "[{}] {} → {} lines",
                            self.target.label,
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

                    if is_last_research_turn {
                        // Budget exhausted — force JSON output with no tools available.
                        info!("[{}] forcing JSON output (budget exhausted)", self.target.label);
                        return self.force_json_output(&messages).await;
                    }
                }
                other => {
                    warn!("[{}] unexpected finish_reason: {other}", self.target.label);
                    if let Some(content) = choice.message.content {
                        return parse_group_json(&content, self.target);
                    }
                    break;
                }
            }
        }

        // Fallback: loop exited without JSON — make one final forced call.
        info!("[{}] loop exited — forcing JSON output", self.target.label);
        self.force_json_output(&messages).await
    }

    /// Send one final message with no tools — forces the model to output JSON text.
    async fn force_json_output(&self, messages: &[Message]) -> Result<DiscoveredGroup> {
        let mut forced = messages.to_vec();
        forced.push(Message {
            role: "user".into(),
            content: Some(
                "You have gathered enough information. \
                 Stop all tool calls now. \
                 Respond with ONLY the raw JSON object as specified in your system prompt — \
                 no markdown fences, no explanation, just the JSON."
                    .into(),
            ),
            tool_calls: None,
            tool_call_id: None,
        });

        // tools = None → model cannot call any tools, must respond with text
        let resp = self.client.chat(&forced, None).await?;
        let content = resp
            .choices
            .into_iter()
            .next()
            .context("empty force-JSON response")?
            .message
            .content
            .unwrap_or_default();

        parse_group_json(&content, self.target)
    }
}

fn parse_group_json(raw: &str, target: &Target) -> Result<DiscoveredGroup> {
    // Strip markdown fences if present
    let cleaned = raw
        .trim()
        .trim_start_matches("```json")
        .trim_start_matches("```")
        .trim_end_matches("```")
        .trim();

    serde_json::from_str::<DiscoveredGroup>(cleaned)
        .with_context(|| format!("[{}] failed to parse discovery JSON: {}", target.label, &cleaned[..cleaned.len().min(200)]))
}

// ── Orchestrator ──────────────────────────────────────────────────────────────

pub struct DiscoveryOrchestrator {
    client: DeepSeekClient,
    root: PathBuf,
    max_turns_per_worker: usize,
}

impl DiscoveryOrchestrator {
    pub fn new(client: DeepSeekClient, root: PathBuf, max_turns_per_worker: usize) -> Self {
        Self { client, root, max_turns_per_worker }
    }

    /// Run all discovery workers in parallel — one per stack group.
    /// Returns the full discovery output ready to serialize to JSON.
    pub async fn run(&self) -> Result<DiscoveryOutput> {
        info!("starting self-discovery across {} parallel workers", TARGETS.len());

        let (tx, mut rx) = mpsc::channel::<(usize, Result<DiscoveredGroup>)>(TARGETS.len());
        let mut handles = Vec::with_capacity(TARGETS.len());

        for (idx, target) in TARGETS.iter().enumerate() {
            let client = self.client.clone();
            let root = self.root.clone();
            let tx = tx.clone();
            let max_turns = self.max_turns_per_worker;

            let handle = tokio::spawn(async move {
                info!("[{}] worker started", target.label);
                let worker = DiscoveryWorker::new(root, client, max_turns, target);
                let result = worker.run().await;
                let _ = tx.send((idx, result)).await;
            });

            handles.push(handle);
        }

        drop(tx);

        // Collect — preserve original order by index
        let mut results: Vec<Option<DiscoveredGroup>> = vec![None; TARGETS.len()];

        while let Some((idx, result)) = rx.recv().await {
            match result {
                Ok(group) => {
                    info!("[{}] completed — {} entries", group.label, group.entries.len());
                    results[idx] = Some(group);
                }
                Err(e) => {
                    warn!("[{}] discovery failed: {e:#}", TARGETS[idx].label);
                    // Insert a placeholder so the page still renders this group
                    results[idx] = Some(DiscoveredGroup {
                        label: TARGETS[idx].label.to_string(),
                        color: TARGETS[idx].color.to_string(),
                        entries: vec![DiscoveredEntry {
                            name: format!("{} (discovery failed)", TARGETS[idx].label),
                            role: "See hardcoded fallback in stack page".into(),
                            details: format!("Error: {e:#}"),
                            facts: vec![],
                            ..Default::default()
                        }],
                    });
                }
            }
        }

        for h in handles {
            let _ = h.await;
        }

        let groups = results.into_iter().flatten().collect();

        Ok(DiscoveryOutput {
            generated_at: chrono_now(),
            root: self.root.to_string_lossy().to_string(),
            groups,
        })
    }
}

fn chrono_now() -> String {
    // Simple ISO-8601 without pulling in chrono dependency
    use std::time::{SystemTime, UNIX_EPOCH};
    let secs = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    // Format as rough ISO-8601 (good enough for display)
    let s = secs;
    let sec = s % 60;
    let min = (s / 60) % 60;
    let hour = (s / 3600) % 24;
    let days = s / 86400;
    // Days since 1970-01-01 → approximate date
    let year = 1970 + days / 365;
    let day_of_year = days % 365;
    let month = day_of_year / 30 + 1;
    let day = day_of_year % 30 + 1;
    format!("{year:04}-{month:02}-{day:02}T{hour:02}:{min:02}:{sec:02}Z")
}

// ── Tool definitions (same as worker.rs) ─────────────────────────────────────

fn tool_definitions() -> Vec<Tool> {
    vec![
        Tool {
            kind: "function",
            function: ToolFunction {
                name: "glob",
                description: "Match file paths by glob pattern. Near-zero cost — paths only. Use first.",
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
                description: "Regex content search. Lightweight — returns matching lines with file:line.",
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
                description: "Read full file contents. Heavy — only after glob/grep confirms relevance.",
                parameters: serde_json::json!({
                    "type": "object",
                    "properties": {
                        "path": { "type": "string", "description": "File path relative to project root" }
                    },
                    "required": ["path"]
                }),
            },
        },
    ]
}

#[cfg(test)]
mod tests {
    use super::*;

    fn dummy_target() -> &'static Target {
        // Use the first predefined target so we don't have to construct one manually
        &TARGETS[0]
    }

    #[test]
    fn parse_clean_json() {
        let raw = r#"{"label":"Frontend","color":"violet","entries":[{"name":"Next.js","version":"16.1.6","role":"App Router","url":"https://nextjs.org","details":"Used for SSR.","facts":["1 fact"],"source_locations":[{"path":"package.json","line":80,"note":"dep"}]}]}"#;
        let group = parse_group_json(raw, dummy_target()).unwrap();
        assert_eq!(group.label, "Frontend");
        assert_eq!(group.entries.len(), 1);
        assert_eq!(group.entries[0].source_locations.len(), 1);
        assert_eq!(group.entries[0].source_locations[0].line, Some(80));
    }

    #[test]
    fn strips_markdown_fences() {
        let raw = "```json\n{\"label\":\"API\",\"color\":\"blue\",\"entries\":[]}\n```";
        let group = parse_group_json(raw, dummy_target()).unwrap();
        assert_eq!(group.label, "API");
    }

    #[test]
    fn strips_plain_fences() {
        let raw = "```\n{\"label\":\"DB\",\"color\":\"cyan\",\"entries\":[]}\n```";
        let group = parse_group_json(raw, dummy_target()).unwrap();
        assert_eq!(group.color, "cyan");
    }

    #[test]
    fn invalid_json_returns_error() {
        let result = parse_group_json("not json at all", dummy_target());
        assert!(result.is_err());
    }

    #[test]
    fn source_location_line_is_optional() {
        let raw = r#"{"label":"Frontend","color":"violet","entries":[{"name":"X","role":"r","url":null,"details":"d","facts":[],"source_locations":[{"path":"src/foo.ts","note":"entry"}]}]}"#;
        let group = parse_group_json(raw, dummy_target()).unwrap();
        assert!(group.entries[0].source_locations[0].line.is_none());
    }

    #[test]
    fn entry_without_source_locations_deserializes() {
        let raw = r#"{"label":"Frontend","color":"violet","entries":[{"name":"X","role":"r","details":"d","facts":[]}]}"#;
        let group = parse_group_json(raw, dummy_target()).unwrap();
        assert!(group.entries[0].source_locations.is_empty());
    }

    #[test]
    fn old_json_without_new_fields_deserializes() {
        // Backward compat: old discovery.json without interview fields
        let raw = r#"{"label":"Frontend","color":"violet","entries":[{"name":"Next.js","version":"16.0.0","role":"App Router","url":"https://nextjs.org","details":"Details here.","facts":["fact1"],"source_locations":[{"path":"package.json","line":1,"note":"dep"}]}]}"#;
        let group = parse_group_json(raw, dummy_target()).unwrap();
        let entry = &group.entries[0];
        assert_eq!(entry.name, "Next.js");
        assert!(entry.why_chosen.is_none());
        assert!(entry.pros.is_empty());
        assert!(entry.cons.is_empty());
        assert!(entry.alternatives_considered.is_empty());
        assert!(entry.trade_offs.is_empty());
        assert!(entry.patterns_used.is_empty());
        assert!(entry.interview_points.is_empty());
    }

    #[test]
    fn new_json_with_all_fields_deserializes() {
        let raw = r#"{
            "label": "Database",
            "color": "cyan",
            "entries": [{
                "name": "D1",
                "role": "Edge DB",
                "details": "SQLite on CF.",
                "facts": ["fact"],
                "source_locations": [],
                "why_chosen": "Native Worker bindings.",
                "pros": ["Fast", "Free tier"],
                "cons": ["Beta"],
                "alternatives_considered": [
                    {"name": "Turso", "reason_not_chosen": "No native binding"},
                    {"name": "Neon", "reason_not_chosen": "TCP overhead"}
                ],
                "trade_offs": ["Accepted gateway hop"],
                "patterns_used": ["Gateway pattern"],
                "interview_points": ["We migrated from Turso to D1 for native bindings"]
            }]
        }"#;
        let group = parse_group_json(raw, dummy_target()).unwrap();
        let entry = &group.entries[0];
        assert_eq!(entry.why_chosen.as_deref(), Some("Native Worker bindings."));
        assert_eq!(entry.pros.len(), 2);
        assert_eq!(entry.cons.len(), 1);
        assert_eq!(entry.alternatives_considered.len(), 2);
        assert_eq!(entry.alternatives_considered[0].name, "Turso");
        assert_eq!(entry.trade_offs.len(), 1);
        assert_eq!(entry.patterns_used.len(), 1);
        assert_eq!(entry.interview_points.len(), 1);
    }

    #[test]
    fn alternative_struct_serialization_round_trip() {
        let alt = Alternative {
            name: "Prisma".to_string(),
            reason_not_chosen: "Binary engine can't run on Workers".to_string(),
        };
        let json = serde_json::to_string(&alt).unwrap();
        let parsed: Alternative = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed.name, "Prisma");
        assert_eq!(parsed.reason_not_chosen, "Binary engine can't run on Workers");
    }
}
