// ═══════════════════════════════════════════════════════════════════════════
// SDD-AGENT: Cloudflare Worker in Rust for Autonomous Spec-Driven Development
// ═══════════════════════════════════════════════════════════════════════════
//
// Full parity with the Anthropic Agent SDK, powered by DeepSeek:
//
//   ANTHROPIC SDK FEATURE              → RUST/WASM EQUIVALENT
//   ─────────────────────────────────────────────────────────────────────
//   query() / streamAgent()            → DeepSeekClient::agent_loop()
//   runAgent() / askAgent()            → POST /agent/query
//   createAgent()                      → POST /agent/create
//   defineSubagent() / mergeSubagents  → SubagentRegistry
//   captureSession / resumeSession     → SessionStore (D1-backed)
//   forkSession                        → POST /sessions/fork
//   Hooks (Pre/PostToolUse, lifecycle) → HookRegistry + HookBuilder
//   ToolPresets (Read,Write,Edit,etc)  → ToolRegistry with D1/fetch backends
//   PermissionMode                     → PermissionMode enum
//   SDD orchestrator (/sdd:*)          → SddPipeline (DAG-based, parallel)
//   Multi-model routing                → DeepSeek Reasoner (R1) + Chat (V3)
//
// All execution is fully parallel via futures::future::{join, join_all}.
// No tokio, no reqwest — pure CF Workers WASM runtime.
// ═══════════════════════════════════════════════════════════════════════════

use serde_json::{json, Value};
use std::collections::HashMap;
use worker::*;

mod types;
mod deepseek;
mod tools;
mod hooks;
mod sessions;
mod subagents;
mod sdd;
mod integrations;
use types::*;

/// Load workflow docs from D1 and enrich a base prompt. Returns base unchanged if
/// workflow_type is empty or docs not found.
async fn enrich_prompt(db: &D1Database, base: &str, phase: &str, workflow_type: &str) -> String {
    if workflow_type.is_empty() {
        return base.to_string();
    }
    match integrations::WorkflowDocsStore::load(db, workflow_type).await {
        Ok(Some(docs)) => docs.enrich(base, phase),
        _ => base.to_string(),
    }
}

/// Load workflow docs from D1 for pipeline injection.
async fn load_workflow_docs(db: &D1Database, workflow_type: &str) -> Option<integrations::WorkflowDocs> {
    if workflow_type.is_empty() {
        return None;
    }
    let _ = integrations::WorkflowDocsStore::ensure_table(db).await;
    integrations::WorkflowDocsStore::load(db, workflow_type).await.ok().flatten()
}

}

// ═══════════════════════════════════════════════════════════════════════════
// ROUTE HANDLERS
// ═══════════════════════════════════════════════════════════════════════════

// ── Health & Discovery ────────────────────────────────────────────────────

/// GET / — Service info and capability discovery
async fn handle_index(_req: Request, _ctx: RouteContext<()>) -> Result<Response> {
    Response::from_json(&ApiResponse::success(json!({
        "service": "sdd-agent",
        "version": "0.1.0",
        "description": "Autonomous Spec-Driven Development agent powered by DeepSeek",
        "parity": "Anthropic Agent SDK (full feature parity in Rust/WASM)",
        "models": {
            "reasoner": "deepseek-reasoner (R1 — deep thinking, architecture, specs)",
            "chat": "deepseek-chat (V3 — fast responses, tool use, implementation)",
        },
        "capabilities": {
            "agent_query": "POST /agent/query — Run agent with tools and session",
            "subagents": "POST /agent/subagent — Delegate to named subagent",
            "sessions": "GET/POST /sessions — Create, resume, fork sessions",
            "hooks": "Pre/PostToolUse, SessionStart/End, SubagentStart/Stop, PrePhase/PostPhase",
            "tools": "GET /tools — 12 built-in tools + custom tool registration",
            "sdd": {
                "explore": "POST /sdd/explore — Investigate an idea",
                "new": "POST /sdd/new — Start a new change",
                "continue": "POST /sdd/continue — Next phase in DAG",
                "ff": "POST /sdd/ff — Fast-forward all planning phases",
                "apply": "POST /sdd/apply — Implement tasks",
                "verify": "POST /sdd/verify — Validate against specs",
                "archive": "POST /sdd/archive — Complete SDD cycle",
                "pipeline": "POST /sdd/pipeline — Full autonomous pipeline",
            },
            "parallel_execution": "Spec + Design phases run concurrently via futures::join",
        },
    })))
}

// ── Agent Query ───────────────────────────────────────────────────────────

/// POST /agent/query — Run an agent query with tools and session support.
/// Parity with Anthropic's query() / runAgent().
///
/// Body:
/// {
///   "prompt": "string",
///   "model": "chat|reasoner" (default: "chat"),
///   "tools": ["Read", "Grep", ...] (default: all),
///   "system_prompt": "optional override",
///   "max_turns": 10,
///   "effort": "low|medium|high|max",
///   "session_id": "optional — resume session",
///   "fork": false
/// }
async fn handle_agent_query(mut req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let body: Value = req.json().await?;
    let env = ctx.env;

    let prompt = body["prompt"].as_str().unwrap_or("");
    if prompt.is_empty() {
        return error_response("'prompt' is required");
    }

    let client = deepseek::DeepSeekClient::from_env(&env)?;
    let db = env.d1("DB")?;

    // Ensure tables exist
    sessions::SessionStore::ensure_table(&db).await?;

    let model = body["model"].as_str()
        .map(DeepSeekModel::from_alias)
        .unwrap_or_default();
    let effort: EffortLevel = match body["effort"].as_str() {
        Some("low") => EffortLevel::Low,
        Some("medium") => EffortLevel::Medium,
        Some("high") => EffortLevel::High,
        Some("max") => EffortLevel::Max,
        _ => EffortLevel::High,
    };
    let _max_turns = body["max_turns"].as_u64().unwrap_or(10) as u32;
    let system_prompt = body["system_prompt"].as_str().unwrap_or(
        "You are an autonomous development agent. Use tools to read, write, and modify code. Follow project conventions."
    );

    // Session handling
    let session_id = body["session_id"].as_str();
    let fork = body["fork"].as_bool().unwrap_or(false);

    let session = match (session_id, fork) {
        (Some(id), true) => sessions::SessionStore::fork(&db, id).await?,
        (Some(id), false) => sessions::SessionStore::load(&db, id).await?,
        (None, _) => Some(sessions::SessionStore::create(&db, "query", &model).await?),
    };

    let session = match session {
        Some(s) => s,
        None => return error_response("Session not found"),
    };

    // Build tool schemas
    let tool_names: Vec<String> = body["tools"].as_array()
        .map(|arr| arr.iter().filter_map(|v| v.as_str().map(String::from)).collect())
        .unwrap_or_else(|| tools::TOOLS_ALL.iter().map(|s| s.to_string()).collect());

    let registry = tools::build_builtin_registry();
    let tool_schemas = registry.filter_schemas(&tool_names);

    // Create async tool executor backed by D1
    let executor = tools::ToolExecutor::new(env.clone());

    // Run agent loop with real tool execution
    let mut agent_result = client.agent_loop(
        system_prompt,
        prompt,
        &model,
        &tool_schemas,
        |name, args| {
            let executor_ref = &executor;
            async move { executor_ref.execute(&name, args).await }
        },
        _max_turns,
        &effort,
    ).await?;

    // Update session with result
    let mut updated_session = session;
    updated_session.messages.push(deepseek::DeepSeekClient::user_msg(prompt));
    if let Some(ref result_text) = agent_result.result {
        updated_session.messages.push(deepseek::DeepSeekClient::assistant_msg(result_text));
    }
    updated_session.turn_count += agent_result.turns;
    updated_session.total_usage.prompt_tokens += agent_result.usage.prompt_tokens;
    updated_session.total_usage.completion_tokens += agent_result.usage.completion_tokens;
    updated_session.total_usage.total_tokens += agent_result.usage.total_tokens;
    agent_result.session_id = Some(updated_session.id.clone());
    sessions::SessionStore::update(&db, &updated_session).await?;

    Response::from_json(&ApiResponse::success(json!({
        "result": agent_result.result,
        "session_id": updated_session.id,
        "model": model.as_str(),
        "turns": agent_result.turns,
        "usage": agent_result.usage,
        "tool_calls_made": agent_result.tool_calls_made,
        "success": agent_result.success,
    })))
}

// ── Subagent Delegation ───────────────────────────────────────────────────

/// POST /agent/subagent — Delegate to a named subagent.
/// Parity with Anthropic's Task tool / defineSubagent().
async fn handle_subagent(mut req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let body: Value = req.json().await?;
    let env = ctx.env;

    let agent_name = body["agent"].as_str().unwrap_or("");
    let prompt = body["prompt"].as_str().unwrap_or("");

    if agent_name.is_empty() || prompt.is_empty() {
        return error_response("'agent' and 'prompt' are required");
    }

    // Build subagent registry
    let mut registry = subagents::SubagentRegistry::new();
    for agent in subagents::preset_subagents() {
        registry.define(agent);
    }
    for agent in subagents::sdd_subagents() {
        registry.define(agent);
    }

    let agent_def = match registry.get(agent_name) {
        Some(def) => def.clone(),
        None => return error_response(&format!(
            "Unknown agent '{}'. Available: {}",
            agent_name,
            registry.list().join(", ")
        )),
    };

    let client = deepseek::DeepSeekClient::from_env(&env)?;
    let tool_registry = tools::build_builtin_registry();
    let tool_schemas = tool_registry.filter_schemas(&agent_def.tools);
    let max_turns = agent_def.max_turns.unwrap_or(10);

    // Create async tool executor
    let executor = tools::ToolExecutor::new(env);

    let agent_result = client.agent_loop(
        &agent_def.prompt,
        prompt,
        &agent_def.model,
        &tool_schemas,
        |name, args| {
            let executor_ref = &executor;
            async move { executor_ref.execute(&name, args).await }
        },
        max_turns,
        &EffortLevel::High,
    ).await?;

    Response::from_json(&ApiResponse::success(json!({
        "agent": agent_name,
        "model": agent_def.model.as_str(),
        "result": agent_result.result,
        "tool_calls_made": agent_result.tool_calls_made,
        "turns": agent_result.turns,
        "usage": agent_result.usage,
        "success": agent_result.success,
    })))
}

/// GET /agent/subagents — List available subagents
async fn handle_list_subagents(_req: Request, _ctx: RouteContext<()>) -> Result<Response> {
    let mut registry = subagents::SubagentRegistry::new();
    for agent in subagents::preset_subagents() {
        registry.define(agent);
    }
    for agent in subagents::sdd_subagents() {
        registry.define(agent);
    }

    Response::from_json(&ApiResponse::success(json!({
        "subagents": registry.list_json(),
        "presets": ["code-reviewer", "test-runner", "researcher", "reasoner"],
        "sdd_agents": ["sdd-explore", "sdd-propose", "sdd-spec", "sdd-design", "sdd-tasks", "sdd-apply", "sdd-verify", "sdd-archive"],
    })))
}

// ── Tools ─────────────────────────────────────────────────────────────────

/// GET /tools — List available tools with function-calling schemas
async fn handle_tools(req: Request, _ctx: RouteContext<()>) -> Result<Response> {
    let url = req.url()?;
    let params: HashMap<String, String> = url.query_pairs().into_owned().collect();

    let registry = tools::build_builtin_registry();

    if let Some(name) = params.get("name") {
        return match registry.get_definition(name) {
            Some(def) => Response::from_json(&ApiResponse::success(json!({
                "tool": def,
                "schema": def.to_tool_schema(),
            }))),
            None => error_response(&format!("Unknown tool '{name}'")),
        };
    }

    let definitions = registry.list_definitions();
    let schemas: Vec<ToolSchema> = registry.to_tool_schemas();

    Response::from_json(&ApiResponse::success(json!({
        "tools": definitions,
        "function_schemas": schemas,
        "presets": {
            "readonly": tools::TOOLS_READONLY,
            "file_ops": tools::TOOLS_FILE_OPS,
            "coding": tools::TOOLS_CODING,
            "web": tools::TOOLS_WEB,
            "sdd": tools::TOOLS_SDD,
            "all": tools::TOOLS_ALL,
        },
    })))
}

// ── Sessions ──────────────────────────────────────────────────────────────

/// GET /sessions — List recent sessions
async fn handle_list_sessions(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let db = ctx.env.d1("DB")?;
    sessions::SessionStore::ensure_table(&db).await?;

    let url = req.url()?;
    let params: HashMap<String, String> = url.query_pairs().into_owned().collect();
    let limit = params.get("limit").and_then(|v| v.parse().ok()).unwrap_or(20);

    let sessions = sessions::SessionStore::list_recent(&db, limit).await?;

    Response::from_json(&ApiResponse::success(json!({
        "sessions": sessions,
    })))
}

/// GET /sessions/:id — Load a session
async fn handle_get_session(_req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let db = ctx.env.d1("DB")?;
    sessions::SessionStore::ensure_table(&db).await?;

    let id = ctx.param("id").unwrap_or(&String::new()).clone();
    let session = sessions::SessionStore::load(&db, &id).await?;

    match session {
        Some(s) => Response::from_json(&ApiResponse::success(json!({
            "session": s,
        }))),
        None => error_response("Session not found"),
    }
}

/// POST /sessions/fork — Fork a session
async fn handle_fork_session(mut req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let body: Value = req.json().await?;
    let db = ctx.env.d1("DB")?;
    sessions::SessionStore::ensure_table(&db).await?;

    let parent_id = body["session_id"].as_str().unwrap_or("");
    if parent_id.is_empty() {
        return error_response("'session_id' is required");
    }

    let forked = sessions::SessionStore::fork(&db, parent_id).await?;
    match forked {
        Some(s) => Response::from_json(&ApiResponse::success(json!({
            "session": s,
            "parent_session_id": parent_id,
        }))),
        None => error_response("Parent session not found"),
    }
}

// ── SDD Pipeline ──────────────────────────────────────────────────────────

/// POST /sdd/new — Start a new SDD change
async fn handle_sdd_new(mut req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let body: Value = req.json().await?;
    let env = ctx.env;
    let db = env.d1("DB")?;

    let name = body["name"].as_str().unwrap_or("");
    let description = body["description"].as_str().unwrap_or("");
    if name.is_empty() || description.is_empty() {
        return error_response("'name' and 'description' are required");
    }

    sdd::SddChangeStore::ensure_table(&db).await?;

    let now = worker::Date::now().to_string();
    let mut change = SddChange {
        name: name.into(),
        description: description.into(),
        phases_completed: Vec::new(),
        phases_in_progress: Vec::new(),
        artifacts: HashMap::new(),
        created_at: now.clone(),
        updated_at: now,
    };

    // Run proposal phase
    let client = deepseek::DeepSeekClient::from_env(&env)?;
    let workflow_type = body["workflow_type"].as_str().unwrap_or("");
    let mut pipeline = sdd::SddPipeline::new(client).with_workflow_type(workflow_type);
    if let Some(docs) = load_workflow_docs(&db, workflow_type).await {
        pipeline = pipeline.with_workflow_docs(docs);
    }
    let pipeline = pipeline;
    let context = body["context"].as_str().unwrap_or("");

    let result = pipeline.execute_phase(SddPhase::Propose, &change, context).await?;
    change.artifacts.insert("proposal".into(), result.clone());
    change.phases_completed.push(SddPhase::Propose);

    sdd::SddChangeStore::save(&db, &change).await?;

    Response::from_json(&ApiResponse::success(json!({
        "change": change.name,
        "phase": "propose",
        "result": result,
        "next_phases": ["spec", "design"],
    })))
}

/// POST /sdd/continue — Continue to next phase in DAG
async fn handle_sdd_continue(mut req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let body: Value = req.json().await?;
    let env = ctx.env;
    let db = env.d1("DB")?;

    let name = body["name"].as_str().unwrap_or("");
    if name.is_empty() {
        return error_response("'name' is required");
    }

    sdd::SddChangeStore::ensure_table(&db).await?;
    let mut change = match sdd::SddChangeStore::load(&db, name).await? {
        Some(c) => c,
        None => return error_response(&format!("Change '{}' not found", name)),
    };

    let client = deepseek::DeepSeekClient::from_env(&env)?;
    let workflow_type = body["workflow_type"].as_str().unwrap_or("");
    let mut pipeline = sdd::SddPipeline::new(client).with_workflow_type(workflow_type);
    if let Some(docs) = load_workflow_docs(&db, workflow_type).await {
        pipeline = pipeline.with_workflow_docs(docs);
    }
    let pipeline = pipeline;
    let context = body["context"].as_str().unwrap_or("");

    let result = pipeline.continue_change(&mut change, context).await?;
    change.updated_at = worker::Date::now().to_string();
    sdd::SddChangeStore::save(&db, &change).await?;

    Response::from_json(&ApiResponse::success(result))
}

/// POST /sdd/ff — Fast-forward all planning phases (parallel spec+design)
async fn handle_sdd_ff(mut req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let body: Value = req.json().await?;
    let env = ctx.env;
    let db = env.d1("DB")?;

    let name = body["name"].as_str().unwrap_or("");
    let description = body["description"].as_str().unwrap_or("");
    if name.is_empty() || description.is_empty() {
        return error_response("'name' and 'description' are required");
    }

    sdd::SddChangeStore::ensure_table(&db).await?;

    let now = worker::Date::now().to_string();
    let mut change = sdd::SddChangeStore::load(&db, name).await?
        .unwrap_or_else(|| SddChange {
            name: name.into(),
            description: description.into(),
            phases_completed: Vec::new(),
            phases_in_progress: Vec::new(),
            artifacts: HashMap::new(),
            created_at: now.clone(),
            updated_at: now,
        });

    let client = deepseek::DeepSeekClient::from_env(&env)?;
    let workflow_type = body["workflow_type"].as_str().unwrap_or("");
    let mut pipeline = sdd::SddPipeline::new(client).with_workflow_type(workflow_type);
    if let Some(docs) = load_workflow_docs(&db, workflow_type).await {
        pipeline = pipeline.with_workflow_docs(docs);
    }
    let pipeline = pipeline;
    let context = body["context"].as_str().unwrap_or("");

    let result = pipeline.fast_forward(&mut change, context).await?;
    change.updated_at = worker::Date::now().to_string();
    sdd::SddChangeStore::save(&db, &change).await?;

    Response::from_json(&ApiResponse::success(result))
}

/// POST /sdd/pipeline — Full autonomous pipeline (all phases)
async fn handle_sdd_pipeline(mut req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let body: Value = req.json().await?;
    let env = ctx.env;
    let db = env.d1("DB")?;

    let name = body["name"].as_str().unwrap_or("");
    let description = body["description"].as_str().unwrap_or("");
    if name.is_empty() || description.is_empty() {
        return error_response("'name' and 'description' are required");
    }

    sdd::SddChangeStore::ensure_table(&db).await?;

    let now = worker::Date::now().to_string();
    let mut change = sdd::SddChangeStore::load(&db, name).await?
        .unwrap_or_else(|| SddChange {
            name: name.into(),
            description: description.into(),
            phases_completed: Vec::new(),
            phases_in_progress: Vec::new(),
            artifacts: HashMap::new(),
            created_at: now.clone(),
            updated_at: now,
        });

    let client = deepseek::DeepSeekClient::from_env(&env)?;
    let workflow_type = body["workflow_type"].as_str().unwrap_or("");
    let mut pipeline = sdd::SddPipeline::new(client).with_workflow_type(workflow_type);
    if let Some(docs) = load_workflow_docs(&db, workflow_type).await {
        pipeline = pipeline.with_workflow_docs(docs);
    }
    let pipeline = pipeline;
    let context = body["context"].as_str().unwrap_or("");

    // Run phases one by one, updating task progress in D1
    let phases = [
        (SddPhase::Propose, "Generating proposal", 15),
        (SddPhase::Spec, "Writing specifications", 30),
        (SddPhase::Design, "Creating design", 45),
        (SddPhase::Tasks, "Breaking down tasks", 60),
        (SddPhase::Apply, "Implementing changes", 75),
        (SddPhase::Verify, "Verifying implementation", 90),
        (SddPhase::Archive, "Archiving artifacts", 100),
    ];

    let mut results: Vec<Value> = Vec::new();

    for (phase, step_label, checkpoint) in &phases {
        if change.phases_completed.contains(phase) {
            continue;
        }

        match pipeline.execute_phase(*phase, &change, context).await {
            Ok(r) => {
                change.artifacts.insert(phase.as_str().into(), r.clone());
                change.phases_completed.push(*phase);
                results.push(r);
            }
            Err(e) => {
                return Err(e);
            }
        }
    }

    change.updated_at = worker::Date::now().to_string();
    sdd::SddChangeStore::save(&db, &change).await?;

    let output = results.iter()
        .enumerate()
        .map(|(i, r)| {
            let phase_name = phases.get(i).map(|p| p.0.as_str()).unwrap_or("unknown");
            format!("## Phase: {}\n\n{}", phase_name, r.as_str().unwrap_or(""))
        })
        .collect::<Vec<_>>()
        .join("\n\n---\n\n");


    let result = json!({
        "mode": "full-pipeline",
        "change": change.name,
        "phases_completed": change.phases_completed.iter().map(|p| p.as_str()).collect::<Vec<_>>(),
        "total_phases": results.len(),
        "results": results,
    });

    Response::from_json(&ApiResponse::success(result))
}

/// Phase ordering for step-by-step pipeline execution.
const STEP_PHASES: [(SddPhase, &str, u32); 7] = [
    (SddPhase::Propose, "Generating proposal", 15),
    (SddPhase::Spec, "Writing specifications", 30),
    (SddPhase::Design, "Creating design", 45),
    (SddPhase::Tasks, "Breaking down tasks", 60),
    (SddPhase::Apply, "Implementing changes", 75),
    (SddPhase::Verify, "Verifying implementation", 90),
    (SddPhase::Archive, "Archiving artifacts", 100),
];

/// POST /sdd/step — Run one SDD phase, update D1, then self-chain to the next.
/// Each invocation fits within the 30s CPU limit.
async fn handle_sdd_step(mut req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let body: Value = req.json().await?;
    let env = ctx.env;
    let db = env.d1("DB")?;

    let name = body["name"].as_str().unwrap_or("");
    let description = body["description"].as_str().unwrap_or("");
    let workflow_type = body["workflow_type"].as_str().unwrap_or("");
    let context = body["context"].as_str().unwrap_or("");

    if name.is_empty() || description.is_empty() {
        return error_response("'name' and 'description' are required");
    }

    sdd::SddChangeStore::ensure_table(&db).await?;

    let now = worker::Date::now().to_string();
    let mut change = sdd::SddChangeStore::load(&db, name).await?
        .unwrap_or_else(|| SddChange {
            name: name.into(),
            description: description.into(),
            phases_completed: Vec::new(),
            phases_in_progress: Vec::new(),
            artifacts: HashMap::new(),
            created_at: now.clone(),
            updated_at: now,
        });

    // Find the next phase to execute
    let next = STEP_PHASES.iter().find(|(phase, _, _)| !change.phases_completed.contains(phase));

    let (phase, step_label, checkpoint) = match next {
        Some(p) => p,
        None => {
            // All phases done — mark task complete
            let output = STEP_PHASES.iter()
                .filter_map(|(p, _, _)| change.artifacts.get(p.as_str()).map(|a| format!("## Phase: {}\n\n{}", p.as_str(), a.as_str().unwrap_or(""))))
                .collect::<Vec<_>>()
                .join("\n\n---\n\n");
            return Response::from_json(&ApiResponse::success(json!({
                "mode": "step-complete",
                "change": name,
                "phases_completed": change.phases_completed.iter().map(|p| p.as_str()).collect::<Vec<_>>(),
            })));
        }
    };

    // Execute the single phase
    let client = deepseek::DeepSeekClient::from_env(&env)?;
    let mut pipeline = sdd::SddPipeline::new(client).with_workflow_type(workflow_type);
    if let Some(docs) = load_workflow_docs(&db, workflow_type).await {
        pipeline = pipeline.with_workflow_docs(docs);
    }

    match pipeline.execute_phase(*phase, &change, context).await {
        Ok(r) => {
            change.artifacts.insert(phase.as_str().into(), r.clone());
            change.phases_completed.push(*phase);
            change.updated_at = worker::Date::now().to_string();
            sdd::SddChangeStore::save(&db, &change).await?;

            Response::from_json(&ApiResponse::success(json!({
                "mode": "step",
                "change": name,
                "phase": phase.as_str(),
                "result": r,
                "next": STEP_PHASES.iter()
                    .find(|(p, _, _)| !change.phases_completed.contains(p))
                    .map(|(p, _, _)| p.as_str()),
            })))
        }
        Err(e) => {
            Err(e)
        }
    }
}

/// POST /sdd/phase — Execute a specific SDD phase
async fn handle_sdd_phase(mut req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let body: Value = req.json().await?;
    let env = ctx.env;
    let db = env.d1("DB")?;

    let name = body["name"].as_str().unwrap_or("");
    let phase_str = body["phase"].as_str().unwrap_or("");
    if name.is_empty() || phase_str.is_empty() {
        return error_response("'name' and 'phase' are required");
    }

    let phase = match SddPhase::from_str(phase_str) {
        Some(p) => p,
        None => return error_response(&format!("Unknown phase '{phase_str}'")),
    };

    sdd::SddChangeStore::ensure_table(&db).await?;
    let mut change = match sdd::SddChangeStore::load(&db, name).await? {
        Some(c) => c,
        None => return error_response(&format!("Change '{}' not found", name)),
    };

    let client = deepseek::DeepSeekClient::from_env(&env)?;
    let workflow_type = body["workflow_type"].as_str().unwrap_or("");
    let mut pipeline = sdd::SddPipeline::new(client).with_workflow_type(workflow_type);
    if let Some(docs) = load_workflow_docs(&db, workflow_type).await {
        pipeline = pipeline.with_workflow_docs(docs);
    }
    let pipeline = pipeline;
    let context = body["context"].as_str().unwrap_or("");

    let result = pipeline.execute_phase(phase, &change, context).await?;
    change.artifacts.insert(phase.as_str().into(), result.clone());
    change.phases_completed.push(phase);
    change.updated_at = worker::Date::now().to_string();
    sdd::SddChangeStore::save(&db, &change).await?;

    Response::from_json(&ApiResponse::success(json!({
        "change": name,
        "phase": phase_str,
        "result": result,
    })))
}

/// POST /sdd/explore — Dedicated explore endpoint
async fn handle_sdd_explore(mut req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let body: Value = req.json().await?;
    let env = ctx.env;
    let db = env.d1("DB")?;

    let topic = body["topic"].as_str().unwrap_or("");
    if topic.is_empty() {
        return error_response("'topic' is required");
    }

    let client = deepseek::DeepSeekClient::from_env(&env)?;
    let tool_registry = tools::build_builtin_registry();
    let tool_schemas = tool_registry.filter_schemas(
        &["Read", "Glob", "Grep", "WebSearch"].iter().map(|s| s.to_string()).collect::<Vec<_>>()
    );
    let executor = tools::ToolExecutor::new(env.clone());

    let workflow_type = body["workflow_type"].as_str().unwrap_or("");
    let system_prompt = enrich_prompt(
        &db,
        crate::subagents::SDD_EXPLORE_PROMPT,
        "explore",
        workflow_type,
    ).await;

    let agent_result = client.agent_loop(
        &system_prompt,
        topic,
        &DeepSeekModel::Reasoner,
        &tool_schemas,
        |name, args| {
            let executor_ref = &executor;
            async move { executor_ref.execute(&name, args).await }
        },
        15,
        &EffortLevel::Max,
    ).await?;

    Response::from_json(&ApiResponse::success(json!({
        "phase": "explore",
        "topic": topic,
        "result": agent_result.result,
        "turns": agent_result.turns,
        "tool_calls_made": agent_result.tool_calls_made,
        "usage": agent_result.usage,
    })))
}

/// POST /sdd/apply — Dedicated apply endpoint
async fn handle_sdd_apply(mut req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let body: Value = req.json().await?;
    let env = ctx.env;
    let db = env.d1("DB")?;

    let name = body["name"].as_str().unwrap_or("");
    if name.is_empty() {
        return error_response("'name' is required");
    }

    sdd::SddChangeStore::ensure_table(&db).await?;
    let mut change = match sdd::SddChangeStore::load(&db, name).await? {
        Some(c) => c,
        None => return error_response(&format!("Change '{}' not found", name)),
    };

    let client = deepseek::DeepSeekClient::from_env(&env)?;
    let tool_registry = tools::build_builtin_registry();
    let tool_schemas = tool_registry.filter_schemas(
        &["Read", "Write", "Edit", "Glob", "Grep"].iter().map(|s| s.to_string()).collect::<Vec<_>>()
    );
    let executor = tools::ToolExecutor::new(env.clone());
    let context = body["context"].as_str().unwrap_or("");

    let user_prompt = format!(
        "## Change: {}\n\n{}\n\n## Artifacts\n{}\n\n## Additional Context\n{}",
        change.name, change.description,
        serde_json::to_string_pretty(&change.artifacts).unwrap_or_default(),
        context,
    );

    let workflow_type = body["workflow_type"].as_str().unwrap_or("");
    let apply_system_prompt = enrich_prompt(
        &db,
        crate::subagents::SDD_APPLY_PROMPT,
        "apply",
        workflow_type,
    ).await;

    let agent_result = client.agent_loop(
        &apply_system_prompt,
        &user_prompt,
        &DeepSeekModel::Chat,
        &tool_schemas,
        |name, args| {
            let executor_ref = &executor;
            async move { executor_ref.execute(&name, args).await }
        },
        30,
        &EffortLevel::High,
    ).await?;

    change.artifacts.insert("apply".into(), json!({ "result": agent_result.result }));
    change.phases_completed.push(SddPhase::Apply);
    change.updated_at = worker::Date::now().to_string();
    sdd::SddChangeStore::save(&db, &change).await?;

    Response::from_json(&ApiResponse::success(json!({
        "change": name,
        "phase": "apply",
        "result": agent_result.result,
        "turns": agent_result.turns,
        "tool_calls_made": agent_result.tool_calls_made,
        "usage": agent_result.usage,
    })))
}

/// POST /sdd/verify — Dedicated verify endpoint
async fn handle_sdd_verify(mut req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let body: Value = req.json().await?;
    let env = ctx.env;
    let db = env.d1("DB")?;

    let name = body["name"].as_str().unwrap_or("");
    if name.is_empty() {
        return error_response("'name' is required");
    }

    sdd::SddChangeStore::ensure_table(&db).await?;
    let mut change = match sdd::SddChangeStore::load(&db, name).await? {
        Some(c) => c,
        None => return error_response(&format!("Change '{}' not found", name)),
    };

    let client = deepseek::DeepSeekClient::from_env(&env)?;
    let tool_registry = tools::build_builtin_registry();
    let tool_schemas = tool_registry.filter_schemas(
        &["Read", "Glob", "Grep"].iter().map(|s| s.to_string()).collect::<Vec<_>>()
    );
    let executor = tools::ToolExecutor::new(env.clone());
    let context = body["context"].as_str().unwrap_or("");

    let user_prompt = format!(
        "## Change: {}\n\n{}\n\n## Artifacts\n{}\n\n## Additional Context\n{}",
        change.name, change.description,
        serde_json::to_string_pretty(&change.artifacts).unwrap_or_default(),
        context,
    );

    let workflow_type = body["workflow_type"].as_str().unwrap_or("");
    let verify_system_prompt = enrich_prompt(
        &db,
        crate::subagents::SDD_VERIFY_PROMPT,
        "verify",
        workflow_type,
    ).await;

    let agent_result = client.agent_loop(
        &verify_system_prompt,
        &user_prompt,
        &DeepSeekModel::Reasoner,
        &tool_schemas,
        |name, args| {
            let executor_ref = &executor;
            async move { executor_ref.execute(&name, args).await }
        },
        15,
        &EffortLevel::High,
    ).await?;

    change.artifacts.insert("verify".into(), json!({ "result": agent_result.result }));
    change.phases_completed.push(SddPhase::Verify);
    change.updated_at = worker::Date::now().to_string();
    sdd::SddChangeStore::save(&db, &change).await?;

    Response::from_json(&ApiResponse::success(json!({
        "change": name,
        "phase": "verify",
        "result": agent_result.result,
        "turns": agent_result.turns,
        "tool_calls_made": agent_result.tool_calls_made,
        "usage": agent_result.usage,
    })))
}

/// POST /sdd/archive — Dedicated archive endpoint
async fn handle_sdd_archive(mut req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let body: Value = req.json().await?;
    let env = ctx.env;
    let db = env.d1("DB")?;

    let name = body["name"].as_str().unwrap_or("");
    if name.is_empty() {
        return error_response("'name' is required");
    }

    sdd::SddChangeStore::ensure_table(&db).await?;
    let mut change = match sdd::SddChangeStore::load(&db, name).await? {
        Some(c) => c,
        None => return error_response(&format!("Change '{}' not found", name)),
    };

    let client = deepseek::DeepSeekClient::from_env(&env)?;
    let tool_registry = tools::build_builtin_registry();
    let tool_schemas = tool_registry.filter_schemas(
        &["Read", "Write", "Glob"].iter().map(|s| s.to_string()).collect::<Vec<_>>()
    );
    let executor = tools::ToolExecutor::new(env.clone());
    let context = body["context"].as_str().unwrap_or("");

    let user_prompt = format!(
        "## Change: {}\n\n{}\n\n## Artifacts\n{}\n\n## Additional Context\n{}",
        change.name, change.description,
        serde_json::to_string_pretty(&change.artifacts).unwrap_or_default(),
        context,
    );

    let agent_result = client.agent_loop(
        crate::subagents::SDD_ARCHIVE_PROMPT,
        &user_prompt,
        &DeepSeekModel::Chat,
        &tool_schemas,
        |name, args| {
            let executor_ref = &executor;
            async move { executor_ref.execute(&name, args).await }
        },
        10,
        &EffortLevel::Medium,
    ).await?;

    change.artifacts.insert("archive".into(), json!({ "result": agent_result.result }));
    change.phases_completed.push(SddPhase::Archive);
    change.updated_at = worker::Date::now().to_string();
    sdd::SddChangeStore::save(&db, &change).await?;

    Response::from_json(&ApiResponse::success(json!({
        "change": name,
        "phase": "archive",
        "result": agent_result.result,
        "turns": agent_result.turns,
        "tool_calls_made": agent_result.tool_calls_made,
        "usage": agent_result.usage,
    })))
}

/// GET /sdd/changes — List all SDD changes
async fn handle_sdd_list(_req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let db = ctx.env.d1("DB")?;
    sdd::SddChangeStore::ensure_table(&db).await?;
    let changes = sdd::SddChangeStore::list(&db).await?;

    Response::from_json(&ApiResponse::success(json!({
        "changes": changes,
        "dag": {
            "explore": { "depends_on": [], "parallel_with": [] },
            "propose": { "depends_on": [], "parallel_with": [] },
            "spec": { "depends_on": ["propose"], "parallel_with": ["design"] },
            "design": { "depends_on": ["propose"], "parallel_with": ["spec"] },
            "tasks": { "depends_on": ["spec", "design"], "parallel_with": [] },
            "apply": { "depends_on": ["tasks"], "parallel_with": [] },
            "verify": { "depends_on": ["apply"], "parallel_with": [] },
            "archive": { "depends_on": ["verify"], "parallel_with": [] },
        },
    })))
}

// ── Hooks Endpoint ────────────────────────────────────────────────────────

/// GET /hooks — List available hook events
async fn handle_hooks(_req: Request, _ctx: RouteContext<()>) -> Result<Response> {
    Response::from_json(&ApiResponse::success(json!({
        "events": [
            { "name": "PreToolUse", "description": "Before a tool runs. Block, modify input, or add context." },
            { "name": "PostToolUse", "description": "After a tool succeeds. Log results, add context." },
            { "name": "PostToolUseFailure", "description": "After a tool fails. Log errors, add recovery context." },
            { "name": "SessionStart", "description": "When a session starts (create, resume, fork)." },
            { "name": "SessionEnd", "description": "When a session ends." },
            { "name": "SubagentStart", "description": "When a subagent is spawned." },
            { "name": "SubagentStop", "description": "When a subagent finishes." },
            { "name": "PrePhase", "description": "Before an SDD phase executes. Can block phase transitions." },
            { "name": "PostPhase", "description": "After an SDD phase completes. Inspect results." },
        ],
        "factories": {
            "console_log": "Log tool/phase events to console",
            "block_tools": "Block specific tool names",
            "context_injection": "Add context after tool use",
            "sdd_phase_guard": "Validate SDD phase dependencies",
            "timing": "Track tool execution timing",
        },
    })))
}

// ── Workflow Docs (D1-backed integration context) ────────────────────────

/// GET /sdd/docs — List workflow doc types
async fn handle_sdd_docs_list(_req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let db = ctx.env.d1("DB")?;
    integrations::WorkflowDocsStore::ensure_table(&db).await?;
    let docs = integrations::WorkflowDocsStore::list(&db).await?;
    Response::from_json(&ApiResponse::success(json!({ "workflow_docs": docs })))
}

/// GET /sdd/docs/:type — Get workflow docs by type
async fn handle_sdd_docs_get(_req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let db = ctx.env.d1("DB")?;
    integrations::WorkflowDocsStore::ensure_table(&db).await?;
    let wt = ctx.param("type").unwrap_or(&String::new()).clone();
    match integrations::WorkflowDocsStore::load(&db, &wt).await? {
        Some(docs) => Response::from_json(&ApiResponse::success(json!({
            "workflow_type": wt,
            "reference_docs": docs.reference_docs,
            "phase_contexts": docs.phase_contexts,
        }))),
        None => error_response(&format!("Workflow docs '{}' not found", wt)),
    }
}

/// POST /sdd/docs — Upsert workflow docs
/// Body: { "workflow_type": "...", "reference_docs": "...", "phase_contexts": { "explore": "...", ... } }
async fn handle_sdd_docs_upsert(mut req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let body: Value = req.json().await?;
    let db = ctx.env.d1("DB")?;
    integrations::WorkflowDocsStore::ensure_table(&db).await?;

    let wt = body["workflow_type"].as_str().unwrap_or("");
    if wt.is_empty() {
        return error_response("'workflow_type' is required");
    }
    let reference_docs = body["reference_docs"].as_str().unwrap_or("");
    let phase_contexts = &body["phase_contexts"];

    integrations::WorkflowDocsStore::save(&db, wt, reference_docs, phase_contexts).await?;
    Response::from_json(&ApiResponse::success(json!({
        "workflow_type": wt,
        "saved": true,
    })))
}

/// DELETE /sdd/docs/:type — Delete workflow docs
async fn handle_sdd_docs_delete(_req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let db = ctx.env.d1("DB")?;
    let wt = ctx.param("type").unwrap_or(&String::new()).clone();
    integrations::WorkflowDocsStore::delete(&db, &wt).await?;
    Response::from_json(&ApiResponse::success(json!({
        "workflow_type": wt,
        "deleted": true,
    })))
}

/// POST /sdd/docs/seed — Seed default adapter integration docs
async fn handle_sdd_docs_seed(_req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let db = ctx.env.d1("DB")?;
    integrations::WorkflowDocsStore::ensure_table(&db).await?;
    let seeded = integrations::WorkflowDocsStore::seed_defaults(&db).await?;
    Response::from_json(&ApiResponse::success(json!({
        "seeded": seeded,
        "workflow_type": "adapter_integration",
    })))
}

// ═══════════════════════════════════════════════════════════════════════════
// WORKER ENTRY POINT
// ═══════════════════════════════════════════════════════════════════════════

#[event(fetch)]
async fn main(req: Request, env: Env, _ctx: Context) -> Result<Response> {
    let router = Router::new();

    router
        // ── Discovery ────────────────────────────────────────────
        .get_async("/", handle_index)

        // ── Agent ────────────────────────────────────────────────
        .post_async("/agent/query", handle_agent_query)
        .post_async("/agent/subagent", handle_subagent)
        .get_async("/agent/subagents", handle_list_subagents)

        // ── Tools ────────────────────────────────────────────────
        .get_async("/tools", handle_tools)

        // ── Sessions ─────────────────────────────────────────────
        .get_async("/sessions", handle_list_sessions)
        .get_async("/sessions/:id", handle_get_session)
        .post_async("/sessions/fork", handle_fork_session)

        // ── SDD Pipeline ─────────────────────────────────────────
        .post_async("/sdd/new", handle_sdd_new)
        .post_async("/sdd/continue", handle_sdd_continue)
        .post_async("/sdd/ff", handle_sdd_ff)
        .post_async("/sdd/pipeline", handle_sdd_pipeline)
        .post_async("/sdd/step", handle_sdd_step)
        .post_async("/sdd/phase", handle_sdd_phase)
        .post_async("/sdd/explore", handle_sdd_explore)
        .post_async("/sdd/apply", handle_sdd_apply)
        .post_async("/sdd/verify", handle_sdd_verify)
        .post_async("/sdd/archive", handle_sdd_archive)
        .get_async("/sdd/changes", handle_sdd_list)

        // ── Workflow Docs ───────────────────────────────────────
        .get_async("/sdd/docs", handle_sdd_docs_list)
        .get_async("/sdd/docs/:type", handle_sdd_docs_get)
        .post_async("/sdd/docs", handle_sdd_docs_upsert)
        .delete_async("/sdd/docs/:type", handle_sdd_docs_delete)
        .post_async("/sdd/docs/seed", handle_sdd_docs_seed)

        // ── Hooks ────────────────────────────────────────────────
        .get_async("/hooks", handle_hooks)

        .run(req, env)
        .await
        .or_else(|e| {
            console_error!("Worker error: {:?}", e);
            Response::error(format!("Worker error: {e}"), 500)
        })
}
