// ═══════════════════════════════════════════════════════════════════════════
// MODULE: subagents — Subagent composition and parallel execution
// ═══════════════════════════════════════════════════════════════════════════
//
// Parity with Anthropic Agent SDK subagents:
//   - defineSubagent() → create named agent definitions
//   - mergeSubagents() → combine multiple definitions
//   - ConcurrentRunner → fan-out parallel subagent execution
//   - Task tool → delegate to named subagent
//
// In WASM, subagents run as independent DeepSeek API calls via
// futures::future::join_all (no threads, no tokio::spawn).
// ═══════════════════════════════════════════════════════════════════════════

use futures::future::join_all;
use serde_json::{json, Value};
use std::collections::HashMap;

use crate::types::*;
use crate::deepseek::DeepSeekClient;
use crate::tools::ToolRegistry;

// ── Subagent Registry ─────────────────────────────────────────────────────

/// Registry of available subagents. Main agent delegates work via Task tool.
/// Mirrors Anthropic SDK's `options.agents` record.
pub struct SubagentRegistry {
    agents: HashMap<String, AgentDefinition>,
}

impl SubagentRegistry {
    pub fn new() -> Self {
        Self { agents: HashMap::new() }
    }

    /// Register a subagent definition
    pub fn define(&mut self, def: AgentDefinition) {
        self.agents.insert(def.name.clone(), def);
    }

    /// Get a subagent definition by name
    pub fn get(&self, name: &str) -> Option<&AgentDefinition> {
        self.agents.get(name)
    }

    /// List all registered subagent names
    pub fn list(&self) -> Vec<&str> {
        let mut names: Vec<&str> = self.agents.keys().map(String::as_str).collect();
        names.sort();
        names
    }

    /// List as JSON for API responses
    pub fn list_json(&self) -> Vec<Value> {
        self.agents.values().map(|a| {
            json!({
                "name": a.name,
                "description": a.description,
                "model": a.model.as_str(),
                "tools": a.tools,
                "max_turns": a.max_turns,
            })
        }).collect()
    }
}

/// Helper to define a subagent (parity with Anthropic's defineSubagent)
pub fn define_subagent(
    name: &str,
    description: &str,
    prompt: &str,
    model: DeepSeekModel,
    tools: Vec<String>,
    max_turns: Option<u32>,
) -> AgentDefinition {
    AgentDefinition {
        name: name.into(),
        description: description.into(),
        prompt: prompt.into(),
        model,
        tools,
        disallowed_tools: Vec::new(),
        max_turns,
    }
}

// ── Pre-built Subagent Presets ────────────────────────────────────────────

/// Pre-built subagents (parity with Anthropic SUBAGENT_PRESETS)
pub fn preset_subagents() -> Vec<AgentDefinition> {
    vec![
        define_subagent(
            "code-reviewer",
            "Expert code reviewer for quality and security reviews.",
            "You are a code reviewer. Analyze code quality, security vulnerabilities, and suggest improvements. Be specific and actionable.",
            DeepSeekModel::Chat,
            vec!["Read".into(), "Glob".into(), "Grep".into()],
            Some(20),
        ),
        define_subagent(
            "test-runner",
            "Runs tests and reports results with clear diagnostics.",
            "You are a test runner. Execute tests and report failures with clear diagnostics.",
            DeepSeekModel::Chat,
            vec!["Bash".into(), "Read".into()],
            Some(10),
        ),
        define_subagent(
            "researcher",
            "Researches topics using the web and codebase.",
            "You are a researcher. Research thoroughly using web search and codebase analysis. Provide citations.",
            DeepSeekModel::Chat,
            vec!["Read".into(), "Glob".into(), "Grep".into(), "WebSearch".into(), "WebFetch".into()],
            Some(15),
        ),
        define_subagent(
            "reasoner",
            "Deep reasoning agent for complex architecture and design decisions.",
            "You are a reasoning agent. Think deeply about architecture, trade-offs, and design decisions. Use chain-of-thought reasoning.",
            DeepSeekModel::Reasoner,
            vec!["Read".into(), "Glob".into(), "Grep".into()],
            Some(5),
        ),
    ]
}

// ── SDD Phase Subagents ───────────────────────────────────────────────────

/// Create the full set of SDD phase subagents
/// (parity with .claude/skills/sdd-*/SKILL.md)
pub fn sdd_subagents() -> Vec<AgentDefinition> {
    vec![
        define_subagent(
            "sdd-explore",
            "Investigate an idea before committing to a change.",
            SDD_EXPLORE_PROMPT,
            DeepSeekModel::Reasoner,
            vec!["Read".into(), "Glob".into(), "Grep".into(), "WebSearch".into()],
            Some(15),
        ),
        define_subagent(
            "sdd-propose",
            "Create a change proposal with intent, scope, and approach.",
            SDD_PROPOSE_PROMPT,
            DeepSeekModel::Chat,
            vec!["Read".into(), "Glob".into(), "Grep".into(), "Write".into()],
            Some(10),
        ),
        define_subagent(
            "sdd-spec",
            "Write specifications with requirements and scenarios.",
            SDD_SPEC_PROMPT,
            DeepSeekModel::Reasoner,
            vec!["Read".into(), "Glob".into(), "Write".into()],
            Some(15),
        ),
        define_subagent(
            "sdd-design",
            "Create technical design with architecture decisions.",
            SDD_DESIGN_PROMPT,
            DeepSeekModel::Reasoner,
            vec!["Read".into(), "Glob".into(), "Write".into()],
            Some(15),
        ),
        define_subagent(
            "sdd-tasks",
            "Break down a change into implementation task checklist.",
            SDD_TASKS_PROMPT,
            DeepSeekModel::Chat,
            vec!["Read".into(), "Write".into()],
            Some(10),
        ),
        define_subagent(
            "sdd-apply",
            "Implement tasks following specs and design.",
            SDD_APPLY_PROMPT,
            DeepSeekModel::Chat,
            vec!["Read".into(), "Write".into(), "Edit".into(), "Glob".into(), "Grep".into(), "Bash".into()],
            Some(30),
        ),
        define_subagent(
            "sdd-verify",
            "Validate implementation against specs and design.",
            SDD_VERIFY_PROMPT,
            DeepSeekModel::Reasoner,
            vec!["Read".into(), "Glob".into(), "Grep".into(), "Bash".into()],
            Some(15),
        ),
        define_subagent(
            "sdd-archive",
            "Sync delta specs to main specs and archive completed change.",
            SDD_ARCHIVE_PROMPT,
            DeepSeekModel::Chat,
            vec!["Read".into(), "Write".into(), "Glob".into()],
            Some(10),
        ),
    ]
}

// ── SDD Phase System Prompts ──────────────────────────────────────────────

const SDD_EXPLORE_PROMPT: &str = r#"You are the SDD Explorer agent. Your job is to investigate an idea before committing to a change.

Exploration produces NO artifacts in openspec/ — it's purely investigative.

Process:
1. Read the user's topic/question
2. Search the codebase for relevant code, patterns, and dependencies
3. Consider trade-offs, alternatives, and risks
4. Summarize findings with concrete recommendations

Output a structured exploration report with:
- Current state analysis
- Options considered (with pros/cons)
- Recommended approach
- Open questions for the user"#;

const SDD_PROPOSE_PROMPT: &str = r#"You are the SDD Proposer agent. Your job is to create a change proposal.

Create openspec/changes/{change-name}/proposal.md with:
- **Intent**: Problem being solved
- **Scope**: In-scope deliverables + out-of-scope items
- **Approach**: High-level technical strategy
- **Affected Areas**: Which files/modules change
- **Risks**: Identified risks + mitigation
- **Rollback Plan**: How to revert
- **Success Criteria**: Measurable outcomes

Read existing specs in openspec/specs/ and project config in openspec/config.yaml for context."#;

const SDD_SPEC_PROMPT: &str = r#"You are the SDD Spec Writer agent. Write delta specifications for a change.

Create openspec/changes/{change-name}/specs/{domain}/spec.md with:
- **ADDED Requirements**: New behavior (MUST/SHOULD/MAY + Given/When/Then scenarios)
- **MODIFIED Requirements**: Changed behavior (include old version)
- **REMOVED Requirements**: Deprecated behavior

Rules:
- Use RFC 2119 keywords (MUST, SHALL, SHOULD, MAY)
- Every requirement has at least one testable scenario
- Scenarios use Given/When/Then format
- Reference existing main specs for context"#;

const SDD_DESIGN_PROMPT: &str = r#"You are the SDD Designer agent. Create the technical design document.

Create openspec/changes/{change-name}/design.md with:
- **Technical Approach**: Maps proposal intent to spec requirements
- **Architecture Decisions**: Choice + alternatives + rationale
- **Data Flow**: ASCII diagrams of data movement
- **File Changes**: Table of created/modified/deleted files
- **Interfaces/Contracts**: New types, API signatures
- **Testing Strategy**: Unit/integration/e2e approach
- **Open Questions**: Unresolved decisions

Read both the proposal and specs to ensure design covers all requirements."#;

const SDD_TASKS_PROMPT: &str = r#"You are the SDD Tasker agent. Break down a change into implementation tasks.

Create openspec/changes/{change-name}/tasks.md with phased tasks:

## Phase 1: Foundation
- [ ] 1.1 Description (file path)
- [ ] 1.2 Description (file path)

## Phase 2: Core Implementation
- [ ] 2.1 Description (file path)

## Phase 3: Integration
- [ ] 3.1 Description (file path)

## Phase 4: Testing
- [ ] 4.1 Description (file path)

Tasks must be specific, actionable, verifiable, and small."#;

const SDD_APPLY_PROMPT: &str = r#"You are the SDD Applier agent. Implement tasks from the change.

Process:
1. Read tasks.md to find your assigned task(s)
2. Read relevant spec scenarios (these are acceptance criteria)
3. Read design decisions (these constrain approach)
4. Read existing code patterns (match project style)
5. Write code following specs and design
6. Mark tasks as [x] in tasks.md
7. Report deviations from design

Follow project coding conventions. Never skip tests."#;

const SDD_VERIFY_PROMPT: &str = r#"You are the SDD Verifier agent. Validate implementation against specs and design.

Check:
1. **Completeness**: All tasks done? ([x] count == total)
2. **Correctness**: For each ADDED/MODIFIED requirement, search codebase for evidence
3. **Coherence**: Design decisions followed?
4. **Testing**: Test coverage for spec scenarios?

Create openspec/changes/{change-name}/verify-report.md with:
- Completeness metrics
- Correctness table (requirement → status)
- Coherence table (decision → followed?)
- Issues found (CRITICAL / WARNING / SUGGESTION)
- Verdict: PASS / PASS WITH WARNINGS / FAIL"#;

const SDD_ARCHIVE_PROMPT: &str = r#"You are the SDD Archiver agent. Complete the SDD cycle.

Process:
1. Read verify-report.md (must be PASS or PASS WITH WARNINGS)
2. For each delta spec in changes/{name}/specs/:
   - If main spec exists: merge delta (ADDED→append, MODIFIED→replace, REMOVED→delete)
   - If no main spec: copy delta as new main spec
3. Move changes/{name}/ → changes/archive/YYYY-MM-DD-{name}/
4. Report what was synced and archived"#;

// ── Concurrent Runner (WASM-native parallel execution) ────────────────────

/// WASM-compatible concurrent task runner.
/// Mirrors rig's ConcurrentRunner pattern for CF Workers.
/// Uses futures::future::join_all instead of tokio::spawn.
pub struct ConcurrentRunner;

impl ConcurrentRunner {
    pub fn new() -> Self { Self }

    /// Fan-out an async function over all items concurrently.
    /// Returns (successes, errors) partitioned from all results.
    pub async fn run_all<I, T, E, Fut>(
        &self,
        items: Vec<I>,
        f: impl Fn(I) -> Fut,
    ) -> (Vec<T>, Vec<E>)
    where
        Fut: std::future::Future<Output = std::result::Result<T, E>>,
    {
        join_all(items.into_iter().map(f))
            .await
            .into_iter()
            .fold((Vec::new(), Vec::new()), |(mut ok, mut err), r| {
                match r { Ok(v) => ok.push(v), Err(e) => err.push(e) }
                (ok, err)
            })
    }

    /// Run two futures concurrently and return both results.
    pub async fn join_two<A, B>(a: A, b: B) -> (A::Output, B::Output)
    where
        A: std::future::Future,
        B: std::future::Future,
    {
        futures::future::join(a, b).await
    }
}
