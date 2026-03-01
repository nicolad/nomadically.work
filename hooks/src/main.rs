mod cache;
mod config;
mod deepseek;
mod hooks;
mod metrics;
mod rules;
mod state;

use anyhow::{Context, Result};
use axum::{
    extract::State,
    http::StatusCode,
    response::IntoResponse,
    routing::{get, post},
    Json, Router,
};
use std::sync::Arc;
use tokio::net::TcpListener;
use tokio::signal;
use tracing::{error, info};
use tracing_subscriber::EnvFilter;

use crate::cache::Cache;
use crate::config::Config;
use crate::deepseek::DeepSeek;
use crate::metrics::Metrics;
use crate::rules::RulesEngine;
use crate::state::AppState;

#[tokio::main]
async fn main() {
    let _ = dotenvy::dotenv();
    if let Ok(home) = std::env::var("HOME") {
        let _ = dotenvy::from_path(format!("{home}/.env"));
    }

    tracing_subscriber::fmt()
        .with_env_filter(
            EnvFilter::try_from_env("HOOKS_LOG")
                .unwrap_or_else(|_| EnvFilter::new("info")),
        )
        .with_target(false)
        .init();

    if let Err(e) = run().await {
        error!("{e:#}");
        std::process::exit(1);
    }
}

async fn run() -> Result<()> {
    let cfg = Config::load().context("loading config")?;
    let api_key = Config::api_key()?;
    let bind = cfg.bind_addr();

    let cache = Cache::new(cfg.cache.ttl_secs, cfg.cache.max_entries);
    let deepseek = DeepSeek::new(api_key, &cfg.deepseek, cache);
    let rules = RulesEngine::new(&cfg.rules);
    let metrics = Metrics::new();

    let metrics_clone = metrics.clone();
    let report_interval = cfg.metrics_report_secs;
    tokio::spawn(async move {
        metrics_clone.report_loop(report_interval).await;
    });

    let state = Arc::new(AppState {
        deepseek,
        rules,
        metrics,
    });

    let app = Router::new()
        .route("/hook", post(handle_hook))
        .route("/health", get(health))
        .route("/metrics", get(get_metrics))
        .route("/metrics/reset", post(reset_metrics))
        .route("/shutdown", post(shutdown))
        .with_state(state);

    let listener = TcpListener::bind(&bind)
        .await
        .with_context(|| format!("binding to {bind}"))?;

    info!("hooks server listening on {bind}");

    axum::serve(listener, app)
        .with_graceful_shutdown(shutdown_signal())
        .await
        .context("server error")?;

    info!("hooks server stopped");
    Ok(())
}

async fn handle_hook(
    State(state): State<Arc<AppState>>,
    Json(input): Json<serde_json::Value>,
) -> impl IntoResponse {
    let event = match input["hook_event_name"].as_str() {
        Some(e) => e.to_string(),
        None => {
            return (
                StatusCode::BAD_REQUEST,
                Json(serde_json::json!({"error": "missing hook_event_name"})),
            );
        }
    };

    let start = std::time::Instant::now();

    let result =
        hooks::dispatch(&event, &input, &state.deepseek, &state.rules, &state.metrics).await;

    let elapsed = start.elapsed();
    state.metrics.record_latency(&event, elapsed);

    match result {
        Ok(Some(ref output)) => {
            let has_decision = output.contains("permissionDecision")
                || output.contains("\"decision\"");
            let label = if has_decision { "with decision" } else { "with output" };
            info!("← {event} completed in {:.1}ms ({label})", elapsed.as_secs_f64() * 1000.0);
            match serde_json::from_str::<serde_json::Value>(output) {
                Ok(json) => (StatusCode::OK, Json(json)),
                Err(_) => (StatusCode::OK, Json(serde_json::json!({"message": output}))),
            }
        }
        Ok(None) => {
            info!("← {event} completed in {:.1}ms (pass-through)", elapsed.as_secs_f64() * 1000.0);
            (StatusCode::OK, Json(serde_json::json!({})))
        }
        Err(e) => {
            error!("← {event} FAILED in {:.1}ms: {e:#}", elapsed.as_secs_f64() * 1000.0);
            (StatusCode::OK, Json(serde_json::json!({})))
        }
    }
}

async fn health(State(state): State<Arc<AppState>>) -> impl IntoResponse {
    let cache_size = state.deepseek.cache.len();
    let snapshot = state.metrics.snapshot();
    Json(serde_json::json!({
        "status": "ok",
        "cache_entries": cache_size,
        "total_hooks": snapshot.total_hooks,
        "uptime_secs": snapshot.uptime_secs,
    }))
}

async fn get_metrics(State(state): State<Arc<AppState>>) -> impl IntoResponse {
    Json(state.metrics.report())
}

async fn reset_metrics(State(state): State<Arc<AppState>>) -> impl IntoResponse {
    state.metrics.reset();
    Json(serde_json::json!({"status": "reset"}))
}

async fn shutdown() -> impl IntoResponse {
    info!("shutdown requested");
    tokio::spawn(async {
        tokio::time::sleep(std::time::Duration::from_millis(200)).await;
        std::process::exit(0);
    });
    (StatusCode::OK, "shutting down")
}

async fn shutdown_signal() {
    let ctrl_c = async {
        signal::ctrl_c().await.expect("failed to listen for ctrl+c");
    };

    #[cfg(unix)]
    let terminate = async {
        signal::unix::signal(signal::unix::SignalKind::terminate())
            .expect("failed to listen for SIGTERM")
            .recv()
            .await;
    };

    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    tokio::select! {
        _ = ctrl_c => info!("received SIGINT"),
        _ = terminate => info!("received SIGTERM"),
    }
}
