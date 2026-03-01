mod cache;
mod config;
mod deepseek;
mod hooks;
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
use crate::rules::RulesEngine;
use crate::state::AppState;

#[tokio::main]
async fn main() {
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

    let state = Arc::new(AppState { deepseek, rules });

    let app = Router::new()
        .route("/hook", post(handle_hook))
        .route("/health", get(health))
        .route("/shutdown", post(shutdown))
        .with_state(state);

    let listener = TcpListener::bind(&bind).await
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

    match hooks::dispatch(&event, &input, &state.deepseek, &state.rules).await {
        Ok(Some(output)) => match serde_json::from_str::<serde_json::Value>(&output) {
            Ok(json) => (StatusCode::OK, Json(json)),
            Err(_) => (StatusCode::OK, Json(serde_json::json!({"message": output}))),
        },
        Ok(None) => (StatusCode::OK, Json(serde_json::json!({}))),
        Err(e) => {
            error!("hook {event} failed: {e:#}");
            (StatusCode::OK, Json(serde_json::json!({})))
        }
    }
}

async fn health() -> impl IntoResponse {
    (StatusCode::OK, "ok")
}

async fn shutdown() -> impl IntoResponse {
    info!("shutdown requested via endpoint");
    tokio::spawn(async {
        tokio::time::sleep(std::time::Duration::from_millis(100)).await;
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
