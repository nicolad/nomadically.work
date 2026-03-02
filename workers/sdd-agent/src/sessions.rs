// ═══════════════════════════════════════════════════════════════════════════
// MODULE: sessions — Session management (parity with Anthropic SDK)
// ═══════════════════════════════════════════════════════════════════════════
//
// Sessions maintain context across multiple agent exchanges.
// Backed by D1 for persistence (no KV or Durable Objects needed).
//
// Parity features:
//   - captureSession: Run query and capture session ID
//   - resumeSession: Continue with full context
//   - forkSession: Explore alternative approaches
// ═══════════════════════════════════════════════════════════════════════════

use worker::*;
use serde_json::json;
use std::collections::HashMap;

use crate::types::*;

/// Generate a unique session ID
fn generate_session_id() -> String {
    // Use timestamp as unique-ish ID (monotonic in single-threaded WASM)
    let timestamp = worker::Date::now().as_millis();
    format!("sdd-{timestamp}-{:04x}", timestamp % 0xFFFF)
}

/// Get current ISO timestamp
fn now_iso() -> String {
    worker::Date::now().to_string()
}

// ── Session Store (D1-backed) ─────────────────────────────────────────────

/// Session store backed by Cloudflare D1.
/// Provides create/resume/fork semantics matching the Anthropic SDK.
pub struct SessionStore;

impl SessionStore {
    /// Create D1 table for sessions (run on first request)
    pub async fn ensure_table(db: &D1Database) -> Result<()> {
        db.exec(
            "CREATE TABLE IF NOT EXISTS agent_sessions (
                id TEXT PRIMARY KEY,
                agent_name TEXT NOT NULL,
                model TEXT NOT NULL,
                messages TEXT NOT NULL DEFAULT '[]',
                turn_count INTEGER NOT NULL DEFAULT 0,
                total_prompt_tokens INTEGER NOT NULL DEFAULT 0,
                total_completion_tokens INTEGER NOT NULL DEFAULT 0,
                total_tokens INTEGER NOT NULL DEFAULT 0,
                metadata TEXT NOT NULL DEFAULT '{}',
                parent_session_id TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )"
        ).await?;
        Ok(())
    }

    /// Create a new session
    pub async fn create(
        db: &D1Database,
        agent_name: &str,
        model: &DeepSeekModel,
    ) -> Result<Session> {
        let id = generate_session_id();
        let now = now_iso();

        let session = Session {
            id: id.clone(),
            messages: Vec::new(),
            agent_name: agent_name.into(),
            model: model.clone(),
            created_at: now.clone(),
            updated_at: now.clone(),
            turn_count: 0,
            total_usage: UsageInfo { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
            metadata: HashMap::new(),
        };

        db.prepare(
            "INSERT INTO agent_sessions (id, agent_name, model, messages, turn_count, total_prompt_tokens, total_completion_tokens, total_tokens, metadata, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)"
        )
            .bind(&[
                id.into(),
                agent_name.into(),
                model.as_str().into(),
                "[]".into(),
                (0.0).into(),
                (0.0).into(),
                (0.0).into(),
                (0.0).into(),
                "{}".into(),
                now.clone().into(),
                now.into(),
            ])?
            .run()
            .await?;

        Ok(session)
    }

    /// Load a session by ID
    pub async fn load(db: &D1Database, session_id: &str) -> Result<Option<Session>> {
        let row = db.prepare(
            "SELECT * FROM agent_sessions WHERE id = ?1"
        )
            .bind(&[session_id.into()])?
            .first::<serde_json::Value>(None)
            .await?;

        match row {
            Some(r) => {
                let messages: Vec<ChatMessage> = serde_json::from_str(
                    r["messages"].as_str().unwrap_or("[]")
                ).unwrap_or_default();

                let metadata: HashMap<String, serde_json::Value> = serde_json::from_str(
                    r["metadata"].as_str().unwrap_or("{}")
                ).unwrap_or_default();

                Ok(Some(Session {
                    id: r["id"].as_str().unwrap_or("").into(),
                    messages,
                    agent_name: r["agent_name"].as_str().unwrap_or("").into(),
                    model: DeepSeekModel::from_alias(r["model"].as_str().unwrap_or("chat")),
                    created_at: r["created_at"].as_str().unwrap_or("").into(),
                    updated_at: r["updated_at"].as_str().unwrap_or("").into(),
                    turn_count: r["turn_count"].as_f64().unwrap_or(0.0) as u32,
                    total_usage: UsageInfo {
                        prompt_tokens: r["total_prompt_tokens"].as_f64().unwrap_or(0.0) as u32,
                        completion_tokens: r["total_completion_tokens"].as_f64().unwrap_or(0.0) as u32,
                        total_tokens: r["total_tokens"].as_f64().unwrap_or(0.0) as u32,
                    },
                    metadata,
                }))
            }
            None => Ok(None),
        }
    }

    /// Update session with new messages and usage
    pub async fn update(
        db: &D1Database,
        session: &Session,
    ) -> Result<()> {
        let messages_json = serde_json::to_string(&session.messages).unwrap_or("[]".into());
        let metadata_json = serde_json::to_string(&session.metadata).unwrap_or("{}".into());
        let now = now_iso();

        db.prepare(
            "UPDATE agent_sessions SET messages = ?1, turn_count = ?2, total_prompt_tokens = ?3, total_completion_tokens = ?4, total_tokens = ?5, metadata = ?6, updated_at = ?7 WHERE id = ?8"
        )
            .bind(&[
                messages_json.into(),
                (session.turn_count as f64).into(),
                (session.total_usage.prompt_tokens as f64).into(),
                (session.total_usage.completion_tokens as f64).into(),
                (session.total_usage.total_tokens as f64).into(),
                metadata_json.into(),
                now.into(),
                session.id.clone().into(),
            ])?
            .run()
            .await?;

        Ok(())
    }

    /// Fork a session: create a new session with the same messages up to a point.
    /// Equivalent to Anthropic's forkSession — explore different approaches
    /// without losing the original.
    pub async fn fork(
        db: &D1Database,
        parent_session_id: &str,
    ) -> Result<Option<Session>> {
        let parent = match Self::load(db, parent_session_id).await? {
            Some(s) => s,
            None => return Ok(None),
        };

        let new_id = generate_session_id();
        let now = now_iso();
        let messages_json = serde_json::to_string(&parent.messages).unwrap_or("[]".into());

        db.prepare(
            "INSERT INTO agent_sessions (id, agent_name, model, messages, turn_count, total_prompt_tokens, total_completion_tokens, total_tokens, metadata, parent_session_id, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)"
        )
            .bind(&[
                new_id.clone().into(),
                parent.agent_name.clone().into(),
                parent.model.as_str().into(),
                messages_json.into(),
                (parent.turn_count as f64).into(),
                (parent.total_usage.prompt_tokens as f64).into(),
                (parent.total_usage.completion_tokens as f64).into(),
                (parent.total_usage.total_tokens as f64).into(),
                serde_json::to_string(&parent.metadata).unwrap_or("{}".into()).into(),
                parent_session_id.into(),
                now.clone().into(),
                now.into(),
            ])?
            .run()
            .await?;

        Ok(Some(Session {
            id: new_id,
            messages: parent.messages,
            agent_name: parent.agent_name,
            model: parent.model,
            created_at: now_iso(),
            updated_at: now_iso(),
            turn_count: parent.turn_count,
            total_usage: parent.total_usage,
            metadata: parent.metadata,
        }))
    }

    /// List recent sessions
    pub async fn list_recent(db: &D1Database, limit: u32) -> Result<Vec<serde_json::Value>> {
        let rows = db.prepare(
            "SELECT id, agent_name, model, turn_count, total_tokens, parent_session_id, created_at, updated_at FROM agent_sessions ORDER BY updated_at DESC LIMIT ?1"
        )
            .bind(&[(limit as f64).into()])?
            .all()
            .await?
            .results::<serde_json::Value>()?;

        Ok(rows)
    }
}
