// ═══════════════════════════════════════════════════════════════════════════
// MODULE: sdd — Spec-Driven Development pipeline with parallel phases
// ═══════════════════════════════════════════════════════════════════════════
//
// Implements the full SDD workflow as an autonomous pipeline:
//   explore → propose → spec ⟂ design → tasks → apply → verify → archive
//                       ↑ parallel ↑
//
// Key properties:
//   - DAG-based dependency resolution
//   - Parallel execution of independent phases (spec + design)
//   - Each phase delegates to a DeepSeek-powered subagent
//   - All artifacts persisted to D1 for session continuity
//   - Hook system for phase lifecycle events
// ═══════════════════════════════════════════════════════════════════════════

use futures::future::join;
use serde_json::{json, Value};
use std::collections::HashMap;
use worker::*;

use crate::types::*;
use crate::deepseek::DeepSeekClient;
use crate::hooks::HookRegistry;
use crate::nautilus;

// ── SDD Pipeline ──────────────────────────────────────────────────────────

/// The SDD pipeline orchestrator — drives changes through all phases.
/// Equivalent to the SDD orchestrator in .claude/commands/sdd.md but
/// implemented as a Rust state machine with DeepSeek for reasoning.
pub struct SddPipeline {
    client: DeepSeekClient,
    hooks: Option<HookRegistry>,
    workflow_type: String,
}

impl SddPipeline {
    pub fn new(client: DeepSeekClient) -> Self {
        Self { client, hooks: None, workflow_type: String::new() }
    }

    pub fn with_hooks(mut self, hooks: HookRegistry) -> Self {
        self.hooks = Some(hooks);
        self
    }

    pub fn with_workflow_type(mut self, wt: &str) -> Self {
        self.workflow_type = wt.into();
        self
    }

    fn is_nautilus(&self) -> bool {
        self.workflow_type == "nautilus_trader_integration"
    }

    /// Run a single SDD phase. Sends context to the appropriate DeepSeek model
    /// and returns the phase output.
    async fn run_phase(
        &self,
        phase: SddPhase,
        change: &SddChange,
        additional_context: &str,
    ) -> Result<Value> {
        // Fire pre-phase hook
        if let Some(ref hooks) = self.hooks {
            let input = HookInput {
                event: HookEvent::PrePhase,
                phase_name: Some(phase.as_str().into()),
                tool_name: None,
                tool_input: None,
                tool_output: None,
                session_id: None,
                agent_name: Some(format!("sdd-{}", phase.as_str())),
                error: None,
            };
            let output = hooks.fire(&input);
            if !output.allow {
                return Err(Error::RustError(format!(
                    "Phase `{}` blocked by hook: {}",
                    phase.as_str(),
                    output.deny_reason.unwrap_or_default()
                )));
            }
        }

        // Select model based on phase (reasoning for complex, chat for fast)
        let model = match phase {
            SddPhase::Explore | SddPhase::Spec | SddPhase::Design | SddPhase::Verify => {
                DeepSeekModel::Reasoner
            }
            _ => DeepSeekModel::Chat,
        };

        // Build the system prompt for this phase
        let system_prompt = self.phase_system_prompt(phase);

        // Build user prompt with change context
        let user_prompt = format!(
            "## Change: {}\n\n{}\n\n## Completed Phases\n{}\n\n## Existing Artifacts\n{}\n\n## Additional Context\n{}",
            change.name,
            change.description,
            change.phases_completed.iter().map(|p| p.as_str()).collect::<Vec<_>>().join(", "),
            serde_json::to_string_pretty(&change.artifacts).unwrap_or_default(),
            additional_context,
        );

        let effort = match phase {
            SddPhase::Explore | SddPhase::Spec | SddPhase::Design => EffortLevel::Max,
            SddPhase::Verify => EffortLevel::High,
            _ => EffortLevel::Medium,
        };

        let request = DeepSeekClient::build_request(
            &model,
            vec![
                DeepSeekClient::system_msg(&system_prompt),
                DeepSeekClient::user_msg(&user_prompt),
            ],
            None, // No tool calling for phase execution (pure generation)
            &effort,
        );

        let response = self.client.chat(&request).await?;

        let result = response.choices.first()
            .map(|c| c.message.content.as_str().to_string())
            .unwrap_or_default();

        // Fire post-phase hook
        if let Some(ref hooks) = self.hooks {
            let input = HookInput {
                event: HookEvent::PostPhase,
                phase_name: Some(phase.as_str().into()),
                tool_name: None,
                tool_input: None,
                tool_output: Some(json!({ "result": &result })),
                session_id: None,
                agent_name: Some(format!("sdd-{}", phase.as_str())),
                error: None,
            };
            hooks.fire(&input);
        }

        Ok(json!({
            "phase": phase.as_str(),
            "model": model.as_str(),
            "result": result,
            "usage": response.usage,
        }))
    }

    fn phase_system_prompt(&self, phase: SddPhase) -> String {
        let base = match phase {
            SddPhase::Explore => "You are the SDD Explorer. Investigate the idea thoroughly. Analyze the codebase, consider trade-offs, and recommend an approach. Output a structured exploration report.",
            SddPhase::Propose => "You are the SDD Proposer. Create a change proposal with: Intent, Scope (in/out), Approach, Affected Areas, Risks, Rollback Plan, Success Criteria.",
            SddPhase::Spec => "You are the SDD Spec Writer. Write delta specifications with ADDED/MODIFIED/REMOVED requirements using RFC 2119 keywords. Every requirement needs Given/When/Then scenarios.",
            SddPhase::Design => "You are the SDD Designer. Create technical design with: Architecture Decisions (choice + alternatives + rationale), Data Flow, File Changes, Interfaces, Testing Strategy.",
            SddPhase::Tasks => "You are the SDD Tasker. Break the change into phased implementation tasks. Each task must be specific (file path), actionable, verifiable, and small.",
            SddPhase::Apply => "You are the SDD Applier. Implement the assigned tasks following specs and design. Match project coding conventions. Mark tasks [x] as complete.",
            SddPhase::Verify => "You are the SDD Verifier. Check Completeness (all tasks done?), Correctness (specs matched?), Coherence (design followed?), Testing (coverage?). Output PASS/FAIL verdict.",
            SddPhase::Archive => "You are the SDD Archiver. Merge delta specs into main specs (ADDED→append, MODIFIED→replace, REMOVED→delete). Archive the change folder.",
        };

        if self.is_nautilus() {
            let nt_phase_ctx = nautilus::nt_phase_context(phase.as_str());
            format!(
                "{base}\n\n{nt_phase_ctx}\n\n--- NAUTILUS TRADER REFERENCE ---\n{}",
                nautilus::NAUTILUS_TRADER_DOCS
            )
        } else {
            base.into()
        }
    }

    // ── Pipeline Execution Modes ──────────────────────────────────────────

    /// Execute a single phase
    pub async fn execute_phase(
        &self,
        phase: SddPhase,
        change: &SddChange,
        context: &str,
    ) -> Result<Value> {
        // Validate dependencies
        for dep in phase.dependencies() {
            if !change.phases_completed.contains(dep) {
                return Err(Error::RustError(format!(
                    "Phase `{}` requires `{}` to complete first. Completed: {:?}",
                    phase.as_str(),
                    dep.as_str(),
                    change.phases_completed.iter().map(|p| p.as_str()).collect::<Vec<_>>(),
                )));
            }
        }

        self.run_phase(phase, change, context).await
    }

    /// Execute spec + design in parallel (the key SDD optimization).
    /// Both phases depend only on the proposal, so they can run concurrently.
    pub async fn execute_parallel_spec_design(
        &self,
        change: &SddChange,
        context: &str,
    ) -> Result<(Value, Value)> {
        // Both require proposal to be done
        if !change.phases_completed.contains(&SddPhase::Propose) {
            return Err(Error::RustError(
                "Parallel spec+design requires proposal to complete first".into()
            ));
        }

        let spec_future = self.run_phase(SddPhase::Spec, change, context);
        let design_future = self.run_phase(SddPhase::Design, change, context);

        let (spec_result, design_result) = join(spec_future, design_future).await;

        Ok((spec_result?, design_result?))
    }

    /// Fast-forward: run all planning phases (propose → spec ⟂ design → tasks).
    /// This is the /sdd:ff command equivalent.
    pub async fn fast_forward(
        &self,
        change: &mut SddChange,
        context: &str,
    ) -> Result<Value> {
        let mut results: Vec<Value> = Vec::new();

        // Phase 1: Propose (if not done)
        if !change.phases_completed.contains(&SddPhase::Propose) {
            let proposal = self.run_phase(SddPhase::Propose, change, context).await?;
            change.artifacts.insert("proposal".into(), proposal.clone());
            change.phases_completed.push(SddPhase::Propose);
            results.push(proposal);
        }

        // Phase 2: Spec + Design in parallel
        let (spec, design) = self.execute_parallel_spec_design(change, context).await?;
        change.artifacts.insert("spec".into(), spec.clone());
        change.artifacts.insert("design".into(), design.clone());
        change.phases_completed.push(SddPhase::Spec);
        change.phases_completed.push(SddPhase::Design);
        results.push(spec);
        results.push(design);

        // Phase 3: Tasks (depends on both spec + design)
        let tasks = self.run_phase(SddPhase::Tasks, change, context).await?;
        change.artifacts.insert("tasks".into(), tasks.clone());
        change.phases_completed.push(SddPhase::Tasks);
        results.push(tasks);

        Ok(json!({
            "mode": "fast-forward",
            "phases_completed": change.phases_completed.iter().map(|p| p.as_str()).collect::<Vec<_>>(),
            "results": results,
        }))
    }

    /// Continue: detect next phase in DAG and execute it.
    /// This is the /sdd:continue command equivalent.
    pub async fn continue_change(
        &self,
        change: &mut SddChange,
        context: &str,
    ) -> Result<Value> {
        let next = self.detect_next_phase(change);

        match next {
            Some(phase) => {
                let result = self.execute_phase(phase, change, context).await?;
                change.artifacts.insert(phase.as_str().into(), result.clone());
                change.phases_completed.push(phase);

                Ok(json!({
                    "mode": "continue",
                    "phase_executed": phase.as_str(),
                    "phases_completed": change.phases_completed.iter().map(|p| p.as_str()).collect::<Vec<_>>(),
                    "result": result,
                }))
            }
            None => {
                Ok(json!({
                    "mode": "continue",
                    "message": "All phases complete. Change is ready for archive.",
                    "phases_completed": change.phases_completed.iter().map(|p| p.as_str()).collect::<Vec<_>>(),
                }))
            }
        }
    }

    /// Execute the full pipeline end-to-end (autonomous mode).
    /// Runs all phases in dependency order with parallel spec+design.
    pub async fn full_pipeline(
        &self,
        change: &mut SddChange,
        context: &str,
    ) -> Result<Value> {
        let mut results: Vec<Value> = Vec::new();

        // Explore (optional, skip if already done or not needed)
        if !change.phases_completed.contains(&SddPhase::Explore) {
            // Skip explore in full pipeline — it's investigative only
        }

        // Propose
        if !change.phases_completed.contains(&SddPhase::Propose) {
            let r = self.run_phase(SddPhase::Propose, change, context).await?;
            change.artifacts.insert("proposal".into(), r.clone());
            change.phases_completed.push(SddPhase::Propose);
            results.push(r);
        }

        // Spec + Design (parallel)
        if !change.phases_completed.contains(&SddPhase::Spec) ||
           !change.phases_completed.contains(&SddPhase::Design) {
            let (spec, design) = self.execute_parallel_spec_design(change, context).await?;
            change.artifacts.insert("spec".into(), spec.clone());
            change.artifacts.insert("design".into(), design.clone());
            if !change.phases_completed.contains(&SddPhase::Spec) {
                change.phases_completed.push(SddPhase::Spec);
            }
            if !change.phases_completed.contains(&SddPhase::Design) {
                change.phases_completed.push(SddPhase::Design);
            }
            results.push(spec);
            results.push(design);
        }

        // Tasks
        if !change.phases_completed.contains(&SddPhase::Tasks) {
            let r = self.run_phase(SddPhase::Tasks, change, context).await?;
            change.artifacts.insert("tasks".into(), r.clone());
            change.phases_completed.push(SddPhase::Tasks);
            results.push(r);
        }

        // Apply
        if !change.phases_completed.contains(&SddPhase::Apply) {
            let r = self.run_phase(SddPhase::Apply, change, context).await?;
            change.artifacts.insert("apply".into(), r.clone());
            change.phases_completed.push(SddPhase::Apply);
            results.push(r);
        }

        // Verify
        if !change.phases_completed.contains(&SddPhase::Verify) {
            let r = self.run_phase(SddPhase::Verify, change, context).await?;
            change.artifacts.insert("verify".into(), r.clone());
            change.phases_completed.push(SddPhase::Verify);
            results.push(r);
        }

        // Archive
        if !change.phases_completed.contains(&SddPhase::Archive) {
            let r = self.run_phase(SddPhase::Archive, change, context).await?;
            change.artifacts.insert("archive".into(), r.clone());
            change.phases_completed.push(SddPhase::Archive);
            results.push(r);
        }

        Ok(json!({
            "mode": "full-pipeline",
            "change": change.name,
            "phases_completed": change.phases_completed.iter().map(|p| p.as_str()).collect::<Vec<_>>(),
            "total_phases": results.len(),
            "results": results,
        }))
    }

    /// Detect the next phase to execute based on the dependency DAG.
    fn detect_next_phase(&self, change: &SddChange) -> Option<SddPhase> {
        let all_phases = [
            SddPhase::Propose,
            SddPhase::Spec,
            SddPhase::Design,
            SddPhase::Tasks,
            SddPhase::Apply,
            SddPhase::Verify,
            SddPhase::Archive,
        ];

        for phase in &all_phases {
            if change.phases_completed.contains(phase) {
                continue;
            }

            // Check if all dependencies are satisfied
            let deps_met = phase.dependencies().iter().all(|dep| {
                change.phases_completed.contains(dep)
            });

            if deps_met {
                return Some(*phase);
            }
        }

        None
    }
}

// ── SDD Change Store (D1-backed persistence) ─────────────────────────────

pub struct SddChangeStore;

impl SddChangeStore {
    /// Create D1 table for SDD changes
    pub async fn ensure_table(db: &D1Database) -> Result<()> {
        db.exec(
            "CREATE TABLE IF NOT EXISTS sdd_changes (
                name TEXT PRIMARY KEY,
                description TEXT NOT NULL,
                phases_completed TEXT NOT NULL DEFAULT '[]',
                phases_in_progress TEXT NOT NULL DEFAULT '[]',
                artifacts TEXT NOT NULL DEFAULT '{}',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )"
        ).await?;
        Ok(())
    }

    /// Save a change
    pub async fn save(db: &D1Database, change: &SddChange) -> Result<()> {
        let phases_json = serde_json::to_string(&change.phases_completed).unwrap_or("[]".into());
        let in_progress_json = serde_json::to_string(&change.phases_in_progress).unwrap_or("[]".into());
        let artifacts_json = serde_json::to_string(&change.artifacts).unwrap_or("{}".into());

        db.prepare(
            "INSERT INTO sdd_changes (name, description, phases_completed, phases_in_progress, artifacts, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7) ON CONFLICT(name) DO UPDATE SET description = ?2, phases_completed = ?3, phases_in_progress = ?4, artifacts = ?5, updated_at = ?7"
        )
            .bind(&[
                change.name.clone().into(),
                change.description.clone().into(),
                phases_json.into(),
                in_progress_json.into(),
                artifacts_json.into(),
                change.created_at.clone().into(),
                change.updated_at.clone().into(),
            ])?
            .run()
            .await?;

        Ok(())
    }

    /// Load a change by name
    pub async fn load(db: &D1Database, name: &str) -> Result<Option<SddChange>> {
        let row = db.prepare("SELECT * FROM sdd_changes WHERE name = ?1")
            .bind(&[name.into()])?
            .first::<Value>(None)
            .await?;

        match row {
            Some(r) => {
                let phases_completed: Vec<SddPhase> = serde_json::from_str(
                    r["phases_completed"].as_str().unwrap_or("[]")
                ).unwrap_or_default();
                let phases_in_progress: Vec<SddPhase> = serde_json::from_str(
                    r["phases_in_progress"].as_str().unwrap_or("[]")
                ).unwrap_or_default();
                let artifacts: HashMap<String, Value> = serde_json::from_str(
                    r["artifacts"].as_str().unwrap_or("{}")
                ).unwrap_or_default();

                Ok(Some(SddChange {
                    name: r["name"].as_str().unwrap_or("").into(),
                    description: r["description"].as_str().unwrap_or("").into(),
                    phases_completed,
                    phases_in_progress,
                    artifacts,
                    created_at: r["created_at"].as_str().unwrap_or("").into(),
                    updated_at: r["updated_at"].as_str().unwrap_or("").into(),
                }))
            }
            None => Ok(None),
        }
    }

    /// List all active changes
    pub async fn list(db: &D1Database) -> Result<Vec<Value>> {
        let rows = db.prepare(
            "SELECT name, description, phases_completed, created_at, updated_at FROM sdd_changes ORDER BY updated_at DESC"
        )
            .bind(&[])?
            .all()
            .await?
            .results::<Value>()?;

        Ok(rows)
    }
}
