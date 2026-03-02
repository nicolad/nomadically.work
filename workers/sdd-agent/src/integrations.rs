// ═══════════════════════════════════════════════════════════════════════════
// MODULE: integrations — D1-backed workflow context for SDD phases
// ═══════════════════════════════════════════════════════════════════════════
//
// Stores integration reference docs and per-phase context in D1.
// Loaded dynamically by the SDD pipeline when workflow_type is set.
//
// Table: sdd_workflow_docs
//   workflow_type TEXT PK — e.g. "adapter_integration"
//   reference_docs TEXT   — comprehensive reference (injected every phase)
//   phase_contexts TEXT   — JSON map { "explore": "...", "propose": "...", ... }
//   created_at TEXT
//   updated_at TEXT
// ═══════════════════════════════════════════════════════════════════════════

use serde_json::Value;
use worker::*;

/// Workflow docs loaded from D1.
pub struct WorkflowDocs {
    pub reference_docs: String,
    pub phase_contexts: serde_json::Map<String, Value>,
}

impl WorkflowDocs {
    /// Get phase-specific context, or empty string if not defined.
    pub fn phase_context(&self, phase: &str) -> String {
        self.phase_contexts
            .get(phase)
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string()
    }

    /// Build enriched system prompt from base + phase context + reference docs.
    pub fn enrich(&self, base: &str, phase: &str) -> String {
        let phase_ctx = self.phase_context(phase);
        if phase_ctx.is_empty() && self.reference_docs.is_empty() {
            return base.to_string();
        }
        let mut result = base.to_string();
        if !phase_ctx.is_empty() {
            result.push_str("\n\n");
            result.push_str(&phase_ctx);
        }
        if !self.reference_docs.is_empty() {
            result.push_str("\n\n--- INTEGRATION REFERENCE ---\n");
            result.push_str(&self.reference_docs);
        }
        result
    }
}

/// D1-backed store for workflow integration docs.
pub struct WorkflowDocsStore;

impl WorkflowDocsStore {
    /// Create the table if it doesn't exist.
    pub async fn ensure_table(db: &D1Database) -> Result<()> {
        db.exec(
            "CREATE TABLE IF NOT EXISTS sdd_workflow_docs (workflow_type TEXT PRIMARY KEY, reference_docs TEXT NOT NULL DEFAULT '', phase_contexts TEXT NOT NULL DEFAULT '{}', created_at TEXT NOT NULL, updated_at TEXT NOT NULL)"
        ).await?;
        Ok(())
    }

    /// Load docs for a workflow type. Returns None if not found.
    pub async fn load(db: &D1Database, workflow_type: &str) -> Result<Option<WorkflowDocs>> {
        let row = db.prepare(
            "SELECT reference_docs, phase_contexts FROM sdd_workflow_docs WHERE workflow_type = ?1"
        )
            .bind(&[workflow_type.into()])?
            .first::<Value>(None)
            .await?;

        match row {
            Some(r) => {
                let reference_docs = r["reference_docs"].as_str().unwrap_or("").to_string();
                let phase_contexts: serde_json::Map<String, Value> = serde_json::from_str(
                    r["phase_contexts"].as_str().unwrap_or("{}")
                ).unwrap_or_default();

                Ok(Some(WorkflowDocs { reference_docs, phase_contexts }))
            }
            None => Ok(None),
        }
    }

    /// Upsert docs for a workflow type.
    pub async fn save(
        db: &D1Database,
        workflow_type: &str,
        reference_docs: &str,
        phase_contexts: &Value,
    ) -> Result<()> {
        let now = worker::Date::now().to_string();
        let phase_json = serde_json::to_string(phase_contexts).unwrap_or("{}".into());

        db.prepare(
            "INSERT INTO sdd_workflow_docs (workflow_type, reference_docs, phase_contexts, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5)
             ON CONFLICT(workflow_type) DO UPDATE SET
                reference_docs = ?2, phase_contexts = ?3, updated_at = ?5"
        )
            .bind(&[
                workflow_type.into(),
                reference_docs.into(),
                phase_json.into(),
                now.clone().into(),
                now.into(),
            ])?
            .run()
            .await?;

        Ok(())
    }

    /// Delete docs for a workflow type.
    pub async fn delete(db: &D1Database, workflow_type: &str) -> Result<()> {
        db.prepare("DELETE FROM sdd_workflow_docs WHERE workflow_type = ?1")
            .bind(&[workflow_type.into()])?
            .run()
            .await?;
        Ok(())
    }

    /// List all workflow types.
    pub async fn list(db: &D1Database) -> Result<Vec<Value>> {
        let rows = db.prepare(
            "SELECT workflow_type, length(reference_docs) as docs_length, updated_at FROM sdd_workflow_docs ORDER BY workflow_type"
        )
            .bind(&[])?
            .all()
            .await?
            .results::<Value>()?;

        Ok(rows)
    }

    /// Seed default adapter integration docs if not already present.
    pub async fn seed_defaults(db: &D1Database) -> Result<bool> {
        // Check if already seeded
        let existing = db.prepare(
            "SELECT 1 FROM sdd_workflow_docs WHERE workflow_type = 'adapter_integration'"
        )
            .bind(&[])?
            .first::<Value>(None)
            .await?;

        if existing.is_some() {
            return Ok(false);
        }

        let phase_contexts = serde_json::json!({
            "explore": SEED_EXPLORE,
            "propose": SEED_PROPOSE,
            "spec": SEED_SPEC,
            "design": SEED_DESIGN,
            "tasks": SEED_TASKS,
            "apply": SEED_APPLY,
            "verify": SEED_VERIFY,
        });

        Self::save(db, "adapter_integration", SEED_REFERENCE_DOCS, &phase_contexts).await?;
        Ok(true)
    }
}

// ── Seed data (used only for initial D1 population) ──────────────────────

const SEED_REFERENCE_DOCS: &str = r#"# Adapter Integration Reference

## 6-Layer Adapter Stack

Every adapter integration follows the same layered architecture. Each layer has a
single responsibility and well-defined interfaces to adjacent layers.

### Layer 1: HttpClient
- REST API communication with the target venue
- Authentication (API key, HMAC, OAuth2 — venue-specific)
- Rate limiting with token-bucket algorithm
- Request signing and nonce management
- Retry logic with exponential backoff and jitter
- Response deserialization and error mapping

### Layer 2: WebSocketClient
- Persistent streaming connections for real-time data
- Automatic reconnection with exponential backoff
- Heartbeat/ping-pong keepalive management
- Message framing and deserialization
- Subscription management (subscribe/unsubscribe by channel)
- Connection state machine: DISCONNECTED → CONNECTING → CONNECTED → RECONNECTING

### Layer 3: InstrumentProvider
- Instrument metadata loading and caching
- Symbol normalization (venue format ↔ internal format, bidirectional)
- Instrument type mapping (spot, perpetual, future, option)
- Precision/lot-size/tick-size extraction
- Filtering by instrument type, quote currency, or status
- Periodic refresh via configurable `update_instruments_interval`

### Layer 4: DataClient
- Market data subscriptions (order book L1/L2/L3, trades, bars, ticker)
- Snapshot + delta reconstruction for order book state
- Data normalization to internal models
- Subscription lifecycle management
- Historical data requests (if venue supports)
- Timestamp normalization to nanosecond precision

### Layer 5: ExecutionClient
- Order submission (limit, market, stop, stop-limit, trailing-stop)
- Order modification and cancellation
- Fill/execution report processing
- Position tracking and reconciliation
- Balance and margin queries
- Order type mapping (internal types → venue-specific types)
- Fill deduplication by trade ID
- Order state machine: INITIALIZED → SUBMITTED → ACCEPTED → PARTIALLY_FILLED → FILLED / CANCELED / REJECTED / EXPIRED

### Layer 6: Factories
- Wiring all layers into the host platform's node/engine
- Configuration validation and defaults
- Dependency injection of HttpClient, WebSocketClient into data/execution clients
- Registration of data types and instrument providers
- Lifecycle hooks: on_start, on_stop, on_reset, on_dispose

## Universal Lifecycle

```
CONFIGURE  →  Load config, create HttpClient, create WebSocketClient
REGISTER   →  Register instrument provider, data types, execution types
CONNECT    →  Connect WebSocket, load instruments, reconcile state
RUN        →  Stream data, process orders, handle fills
TEARDOWN   →  Cancel subscriptions, close connections, flush state
```

## Universal Config Pattern

| Field | Type | Description |
|---|---|---|
| `credentials` | object | API key, secret, passphrase (venue-specific) |
| `is_testnet` | bool | Use sandbox/testnet endpoints |
| `base_url_http` | string | Override default REST endpoint |
| `base_url_ws` | string | Override default WebSocket endpoint |
| `max_retries` | int | Maximum retry attempts for transient failures |
| `retry_delay` | duration | Base delay for exponential backoff |
| `update_instruments_interval` | duration | How often to refresh instrument metadata |
| `rate_limit_per_second` | int | Max requests per second (token bucket refill rate) |

## Cross-Cutting Patterns

### Reconciliation on Connect
1. Fetch all open orders from the venue
2. Compare with internal order state
3. Generate synthetic events for any discrepancies
4. Log reconciliation results

### Rate Limiting
- Token-bucket algorithm with configurable refill rate
- Separate buckets for REST vs WebSocket (if venue requires)
- Burst capacity for order operations
- Graceful degradation: queue requests when tokens exhausted

### Exponential Backoff with Jitter
- Base delay: configurable (default 1s), max delay: configurable (default 60s)
- Jitter: ±25% randomization to prevent thundering herd
- Applied to: HTTP retries, WebSocket reconnection, rate limit waits

### Symbol Normalization
- Bidirectional mapping: venue format ↔ internal format
- Must handle edge cases: delisted instruments, renamed symbols
- Cache normalized symbols for performance

### Order Type Mapping
- Map internal order types to venue-supported types
- Reject unsupported order types at submission (not silently drop)

### Fill Deduplication
- Track processed trade IDs to prevent duplicate fill events
- Use venue-provided trade ID as deduplication key

## Implementation Phases

1. Core Infrastructure — HttpClient, WebSocketClient, config, error types
2. Instrument Provider — metadata, symbol normalization, precision
3. Data Client — subscriptions, order book, trades, normalization
4. Execution Client — orders, fills, positions, reconciliation
5. Factories — wiring, config validation, lifecycle hooks
6. Integration Tests — mock server, order lifecycle, reconnection
7. Documentation — config guide, features matrix, troubleshooting

## Verification Checklist

- HttpClient: auth works, rate limits respected, retries correct
- WebSocketClient: connects, reconnects, heartbeat, subscriptions restored
- InstrumentProvider: all types loaded, symbols bidirectional, precision correct
- DataClient: order book correct, trades complete, timestamps nanosecond
- ExecutionClient: all order types work, fills deduplicated, positions reconcile
- Factories: wiring correct, config validated, lifecycle hooks work, clean shutdown
"#;

const SEED_EXPLORE: &str = "## Adapter Integration: Explore Phase Guidance\n\nFocus your exploration on:\n- Which of the 6 adapter layers are needed for this integration\n- Target venue API capabilities: REST endpoints, WebSocket channels, authentication scheme\n- Instrument types supported (spot, perpetual, futures, options)\n- Rate limits and any venue-specific constraints\n- Existing adapters that could serve as a template\n- Whether the venue provides a sandbox/testnet environment\n- Order types supported by the venue\n- Data feeds available (L1/L2/L3 order book, trades, bars)";

const SEED_PROPOSE: &str = "## Adapter Integration: Proposal Phase Guidance\n\nStructure the proposal around the 6 implementation phases:\n1. Core Infrastructure (HttpClient, WebSocketClient, config, error types)\n2. Instrument Provider (metadata, symbol normalization)\n3. Data Client (market data subscriptions and processing)\n4. Execution Client (order lifecycle, fills, positions)\n5. Factories (wiring into host platform)\n6. Tests (mock server, order lifecycle, reconnection)\n\nIdentify the closest existing adapter as a template.\nCall out venue-specific quirks (unusual auth, non-standard WebSocket framing, etc.).\nDefine what \"done\" means for each phase.";

const SEED_SPEC: &str = "## Adapter Integration: Spec Phase Guidance\n\nRequirements MUST cover all 6 layers of the adapter stack.\n\nFor each layer, include scenarios for:\n- Happy path (normal operation)\n- Failure/recovery (reconnect, rate limit exceeded, auth expired)\n- Edge cases (delisted instrument, partial fill, duplicate fill)\n\nKey requirement areas:\n- Authentication: credential types, refresh/rotation\n- Rate limiting: per-endpoint limits, burst handling\n- Reconnection: max attempts, backoff strategy, state recovery\n- Order lifecycle: all transitions in the order state machine\n- Data integrity: deduplication, sequence gap detection, reconciliation\n- Precision: price and quantity decimal handling per instrument";

const SEED_DESIGN: &str = "## Adapter Integration: Design Phase Guidance\n\nFile layout should follow the layer structure:\n- http_client — REST client\n- ws_client — WebSocket client\n- provider — InstrumentProvider\n- data — DataClient\n- execution — ExecutionClient\n- factories — Factory wiring\n- types — Shared types, enums, error types\n- config — Configuration\n\nDesign decisions to document:\n- WebSocket architecture: single connection multiplexed vs. multiple connections\n- Symbol normalization strategy: static map vs. dynamic derivation\n- Order state machine: transitions and event generation\n- Error taxonomy: retryable vs. non-retryable vs. rate-limited\n- Reconnection strategy: immediate vs. backoff vs. circuit breaker";

const SEED_TASKS: &str = "## Adapter Integration: Tasks Phase Guidance\n\nBreak implementation into the standard 6 phases:\n\nPhase 1 — Core Infrastructure:\n- Create config type with all universal fields\n- Implement HttpClient with auth and rate limiting\n- Implement WebSocketClient with reconnection\n- Define error types and venue error mapping\n\nPhase 2 — Instruments:\n- Implement instrument loading from REST API\n- Build bidirectional symbol normalization\n- Extract precision/lot-size/tick-size\n- Add periodic refresh mechanism\n\nPhase 3 — Data:\n- Implement WebSocket subscription management\n- Build order book snapshot + delta handler\n- Implement trade stream processor\n- Normalize all data to internal models\n\nPhase 4 — Execution:\n- Implement order submission (all supported types)\n- Implement order modify/cancel\n- Process fill/execution reports\n- Track positions with reconciliation\n- Deduplicate fills by trade ID\n\nPhase 5 — Factories:\n- Wire all layers in factory\n- Validate configuration\n- Implement lifecycle hooks\n\nPhase 6 — Tests:\n- Create mock server\n- Test order lifecycle end-to-end\n- Test reconnection scenarios\n- Test rate limiting behavior";

const SEED_APPLY: &str = "## Adapter Integration: Apply Phase Guidance\n\nWhen implementing:\n- Match the host platform's coding conventions and patterns exactly\n- Use an existing adapter as a template — copy structure, adapt logic\n- Enforce precision at every boundary (price, quantity, notional)\n- Implement rate limiting from the start (not as an afterthought)\n- WebSocket handler should be event-driven, not polling\n- All venue-specific strings (endpoints, channels, message types) should be constants\n- Error messages must include venue response body for debugging\n- Log at appropriate levels: DEBUG for data flow, INFO for lifecycle, WARN for retries, ERROR for failures";

const SEED_VERIFY: &str = "## Adapter Integration: Verify Phase Guidance\n\nCheck all 6 layers against the verification checklist in the reference:\n\n1. HttpClient: auth works, rate limits respected, retries correct\n2. WebSocketClient: connects, reconnects, heartbeat, subscriptions restored\n3. InstrumentProvider: all types loaded, symbols bidirectional, precision correct\n4. DataClient: order book correct, trades complete, timestamps nanosecond\n5. ExecutionClient: all order types work, fills deduplicated, positions reconcile\n6. Factories: wiring correct, config validated, lifecycle hooks work\n\nAdditionally verify:\n- No hardcoded credentials or endpoints\n- Precision handling matches venue specifications\n- Fill deduplication prevents duplicate events\n- Reconciliation runs on every reconnect\n- Clean shutdown releases all resources";
