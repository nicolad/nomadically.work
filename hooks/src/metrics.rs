use serde::Serialize;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;
use std::time::{Duration, Instant};
use tracing::info;

#[derive(Clone)]
pub struct Metrics {
    inner: Arc<Inner>,
}

struct Inner {
    started: Instant,
    local_allow: AtomicU64,
    local_deny: AtomicU64,
    cache_hit: AtomicU64,
    dedup_hit: AtomicU64,
    deepseek_call: AtomicU64,
    deepseek_allow: AtomicU64,
    deepseek_deny: AtomicU64,
    deepseek_error: AtomicU64,
    event_pre_tool: AtomicU64,
    event_post_tool: AtomicU64,
    event_post_fail: AtomicU64,
    event_stop: AtomicU64,
    event_prompt: AtomicU64,
    event_permission: AtomicU64,
    event_session: AtomicU64,
    event_other: AtomicU64,
    total_latency_us: AtomicU64,
    local_latency_us: AtomicU64,
    deepseek_latency_us: AtomicU64,
    estimated_tokens_saved: AtomicU64,
}

#[derive(Serialize)]
pub struct MetricsSnapshot {
    pub uptime_secs: u64,
    pub total_hooks: u64,
    pub local_allow: u64,
    pub local_deny: u64,
    pub cache_hit: u64,
    pub dedup_hit: u64,
    pub deepseek_call: u64,
    pub deepseek_allow: u64,
    pub deepseek_deny: u64,
    pub deepseek_error: u64,
    pub hooks_without_api_call: u64,
    pub hooks_without_api_call_pct: f64,
    pub estimated_tokens_saved: u64,
    pub estimated_cost_saved_usd: f64,
    pub avg_latency_ms: f64,
    pub avg_local_latency_ms: f64,
    pub avg_deepseek_latency_ms: f64,
    pub events: EventCounts,
}

#[derive(Serialize)]
pub struct EventCounts {
    pub pre_tool_use: u64,
    pub post_tool_use: u64,
    pub post_tool_use_failure: u64,
    pub stop: u64,
    pub user_prompt_submit: u64,
    pub permission_request: u64,
    pub session: u64,
    pub other: u64,
}

impl Metrics {
    pub fn new() -> Self {
        Self {
            inner: Arc::new(Inner {
                started: Instant::now(),
                local_allow: AtomicU64::new(0),
                local_deny: AtomicU64::new(0),
                cache_hit: AtomicU64::new(0),
                dedup_hit: AtomicU64::new(0),
                deepseek_call: AtomicU64::new(0),
                deepseek_allow: AtomicU64::new(0),
                deepseek_deny: AtomicU64::new(0),
                deepseek_error: AtomicU64::new(0),
                event_pre_tool: AtomicU64::new(0),
                event_post_tool: AtomicU64::new(0),
                event_post_fail: AtomicU64::new(0),
                event_stop: AtomicU64::new(0),
                event_prompt: AtomicU64::new(0),
                event_permission: AtomicU64::new(0),
                event_session: AtomicU64::new(0),
                event_other: AtomicU64::new(0),
                total_latency_us: AtomicU64::new(0),
                local_latency_us: AtomicU64::new(0),
                deepseek_latency_us: AtomicU64::new(0),
                estimated_tokens_saved: AtomicU64::new(0),
            }),
        }
    }

    pub fn record_local_allow(&self, estimated_input_chars: usize) {
        self.inner.local_allow.fetch_add(1, Ordering::Relaxed);
        self.inner
            .estimated_tokens_saved
            .fetch_add((estimated_input_chars / 4) as u64, Ordering::Relaxed);
    }

    pub fn record_local_deny(&self, estimated_input_chars: usize) {
        self.inner.local_deny.fetch_add(1, Ordering::Relaxed);
        self.inner
            .estimated_tokens_saved
            .fetch_add((estimated_input_chars / 4) as u64, Ordering::Relaxed);
    }

    pub fn record_cache_hit(&self, estimated_input_chars: usize) {
        self.inner.cache_hit.fetch_add(1, Ordering::Relaxed);
        self.inner
            .estimated_tokens_saved
            .fetch_add((estimated_input_chars / 4) as u64, Ordering::Relaxed);
    }

    pub fn record_dedup_hit(&self) {
        self.inner.dedup_hit.fetch_add(1, Ordering::Relaxed);
    }

    pub fn record_deepseek_call(&self) {
        self.inner.deepseek_call.fetch_add(1, Ordering::Relaxed);
    }

    pub fn record_deepseek_allow(&self) {
        self.inner.deepseek_allow.fetch_add(1, Ordering::Relaxed);
    }

    pub fn record_deepseek_deny(&self) {
        self.inner.deepseek_deny.fetch_add(1, Ordering::Relaxed);
    }

    pub fn record_deepseek_error(&self) {
        self.inner.deepseek_error.fetch_add(1, Ordering::Relaxed);
    }

    pub fn record_event(&self, event: &str) {
        let counter = match event {
            "PreToolUse" => &self.inner.event_pre_tool,
            "PostToolUse" => &self.inner.event_post_tool,
            "PostToolUseFailure" => &self.inner.event_post_fail,
            "Stop" | "SubagentStop" => &self.inner.event_stop,
            "UserPromptSubmit" => &self.inner.event_prompt,
            "PermissionRequest" => &self.inner.event_permission,
            "SessionStart" | "SessionEnd" => &self.inner.event_session,
            _ => &self.inner.event_other,
        };
        counter.fetch_add(1, Ordering::Relaxed);
    }

    pub fn record_latency(&self, event: &str, elapsed: Duration) {
        let us = elapsed.as_micros() as u64;
        self.inner.total_latency_us.fetch_add(us, Ordering::Relaxed);
        if us < 1000 {
            self.inner.local_latency_us.fetch_add(us, Ordering::Relaxed);
        }
        self.record_event(event);
    }

    pub fn record_deepseek_latency(&self, elapsed: Duration) {
        self.inner
            .deepseek_latency_us
            .fetch_add(elapsed.as_micros() as u64, Ordering::Relaxed);
    }

    pub fn snapshot(&self) -> MetricsSnapshot {
        let i = &self.inner;

        let local_allow = i.local_allow.load(Ordering::Relaxed);
        let local_deny = i.local_deny.load(Ordering::Relaxed);
        let cache_hit = i.cache_hit.load(Ordering::Relaxed);
        let dedup_hit = i.dedup_hit.load(Ordering::Relaxed);
        let deepseek_call = i.deepseek_call.load(Ordering::Relaxed);
        let deepseek_allow = i.deepseek_allow.load(Ordering::Relaxed);
        let deepseek_deny = i.deepseek_deny.load(Ordering::Relaxed);
        let deepseek_error = i.deepseek_error.load(Ordering::Relaxed);
        let estimated_tokens_saved = i.estimated_tokens_saved.load(Ordering::Relaxed);

        let total_hooks =
            local_allow + local_deny + cache_hit + dedup_hit + deepseek_call;
        let hooks_without_api = local_allow + local_deny + cache_hit + dedup_hit;
        let pct = if total_hooks > 0 {
            (hooks_without_api as f64 / total_hooks as f64) * 100.0
        } else {
            0.0
        };

        let cost_per_eval = 0.0045;
        let estimated_cost_saved = hooks_without_api as f64 * cost_per_eval;

        let total_latency = i.total_latency_us.load(Ordering::Relaxed);
        let local_latency = i.local_latency_us.load(Ordering::Relaxed);
        let ds_latency = i.deepseek_latency_us.load(Ordering::Relaxed);

        let local_count = local_allow + local_deny;
        let avg_latency = if total_hooks > 0 {
            (total_latency as f64 / total_hooks as f64) / 1000.0
        } else {
            0.0
        };
        let avg_local = if local_count > 0 {
            (local_latency as f64 / local_count as f64) / 1000.0
        } else {
            0.0
        };
        let avg_ds = if deepseek_call > 0 {
            (ds_latency as f64 / deepseek_call as f64) / 1000.0
        } else {
            0.0
        };

        MetricsSnapshot {
            uptime_secs: i.started.elapsed().as_secs(),
            total_hooks,
            local_allow,
            local_deny,
            cache_hit,
            dedup_hit,
            deepseek_call,
            deepseek_allow,
            deepseek_deny,
            deepseek_error,
            hooks_without_api_call: hooks_without_api,
            hooks_without_api_call_pct: (pct * 100.0).round() / 100.0,
            estimated_tokens_saved,
            estimated_cost_saved_usd: (estimated_cost_saved * 10000.0).round() / 10000.0,
            avg_latency_ms: (avg_latency * 100.0).round() / 100.0,
            avg_local_latency_ms: (avg_local * 100.0).round() / 100.0,
            avg_deepseek_latency_ms: (avg_ds * 100.0).round() / 100.0,
            events: EventCounts {
                pre_tool_use: i.event_pre_tool.load(Ordering::Relaxed),
                post_tool_use: i.event_post_tool.load(Ordering::Relaxed),
                post_tool_use_failure: i.event_post_fail.load(Ordering::Relaxed),
                stop: i.event_stop.load(Ordering::Relaxed),
                user_prompt_submit: i.event_prompt.load(Ordering::Relaxed),
                permission_request: i.event_permission.load(Ordering::Relaxed),
                session: i.event_session.load(Ordering::Relaxed),
                other: i.event_other.load(Ordering::Relaxed),
            },
        }
    }

    pub fn report(&self) -> serde_json::Value {
        let s = self.snapshot();
        info!("═══════════════════════════════════════════════════════");
        info!("  HOOKS USAGE SAVINGS REPORT");
        info!("═══════════════════════════════════════════════════════");
        info!("  Uptime:              {} min", s.uptime_secs / 60);
        info!("  Total hook calls:    {}", s.total_hooks);
        info!("───────────────────────────────────────────────────────");
        info!("  Local allow (regex): {}", s.local_allow);
        info!("  Local deny (regex):  {}", s.local_deny);
        info!("  Cache hits:          {}", s.cache_hit);
        info!("  Dedup hits:          {}", s.dedup_hit);
        info!(
            "  → No API call:       {} ({:.1}%)",
            s.hooks_without_api_call, s.hooks_without_api_call_pct
        );
        info!("───────────────────────────────────────────────────────");
        info!("  DeepSeek calls:      {}", s.deepseek_call);
        info!("  DeepSeek allow:      {}", s.deepseek_allow);
        info!("  DeepSeek deny:       {}", s.deepseek_deny);
        info!("  DeepSeek errors:     {}", s.deepseek_error);
        info!("───────────────────────────────────────────────────────");
        info!("  Est. tokens saved:   {}", s.estimated_tokens_saved);
        info!("  Est. cost saved:     ${:.4}", s.estimated_cost_saved_usd);
        info!("───────────────────────────────────────────────────────");
        info!("  Avg latency:         {:.2} ms", s.avg_latency_ms);
        info!("  Avg local latency:   {:.2} ms", s.avg_local_latency_ms);
        info!(
            "  Avg DeepSeek latency:{:.2} ms",
            s.avg_deepseek_latency_ms
        );
        info!("═══════════════════════════════════════════════════════");
        serde_json::to_value(s).unwrap_or_default()
    }

    pub fn reset(&self) {
        let i = &self.inner;
        i.local_allow.store(0, Ordering::Relaxed);
        i.local_deny.store(0, Ordering::Relaxed);
        i.cache_hit.store(0, Ordering::Relaxed);
        i.dedup_hit.store(0, Ordering::Relaxed);
        i.deepseek_call.store(0, Ordering::Relaxed);
        i.deepseek_allow.store(0, Ordering::Relaxed);
        i.deepseek_deny.store(0, Ordering::Relaxed);
        i.deepseek_error.store(0, Ordering::Relaxed);
        i.event_pre_tool.store(0, Ordering::Relaxed);
        i.event_post_tool.store(0, Ordering::Relaxed);
        i.event_post_fail.store(0, Ordering::Relaxed);
        i.event_stop.store(0, Ordering::Relaxed);
        i.event_prompt.store(0, Ordering::Relaxed);
        i.event_permission.store(0, Ordering::Relaxed);
        i.event_session.store(0, Ordering::Relaxed);
        i.event_other.store(0, Ordering::Relaxed);
        i.total_latency_us.store(0, Ordering::Relaxed);
        i.local_latency_us.store(0, Ordering::Relaxed);
        i.deepseek_latency_us.store(0, Ordering::Relaxed);
        i.estimated_tokens_saved.store(0, Ordering::Relaxed);
        info!("metrics reset");
    }

    pub async fn report_loop(&self, interval_secs: u64) {
        if interval_secs == 0 {
            return;
        }
        let mut interval = tokio::time::interval(Duration::from_secs(interval_secs));
        interval.tick().await;
        loop {
            interval.tick().await;
            let s = self.snapshot();
            if s.total_hooks > 0 {
                info!(
                    "[metrics] hooks={} local={} cache={} dedup={} deepseek={} saved={:.1}% tokens_saved={} cost_saved=${:.4} avg_latency={:.1}ms",
                    s.total_hooks,
                    s.local_allow + s.local_deny,
                    s.cache_hit,
                    s.dedup_hit,
                    s.deepseek_call,
                    s.hooks_without_api_call_pct,
                    s.estimated_tokens_saved,
                    s.estimated_cost_saved_usd,
                    s.avg_latency_ms,
                );
            }
        }
    }
}
