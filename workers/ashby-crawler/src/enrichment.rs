use worker::*;

use crate::rig_compat;
use crate::types::DiscoveredBoard;

/// Build the enrichment pipeline (Rig ResultPipeline pattern).
/// Each named step propagates errors; step names appear in error responses.
pub fn build_enrichment_pipeline() -> rig_compat::ResultPipeline {
    rig_compat::ResultPipeline::new()
        // Step 1: Normalize slug (strip trailing digits/hyphens)
        .then("normalize_slug", |mut val| {
            if let Some(slug) = val.get("slug").and_then(|s| s.as_str()) {
                let normalized = slug
                    .trim_end_matches(|c: char| c.is_numeric() || c == '-')
                    .to_string();
                val["normalized_slug"] = serde_json::json!(normalized);
            }
            Ok(val)
        })
        // Step 2: Extract URL path segments — skip both ATS hosts
        .then("extract_segments", |mut val| {
            let url_str = val.get("url").and_then(|u| u.as_str()).map(String::from);
            if let Some(url) = url_str {
                let segments: Vec<&str> = url
                    .split('/')
                    .filter(|s| {
                        !s.is_empty()
                            && *s != "https:"
                            && *s != "jobs.ashbyhq.com"
                            && *s != "job-boards.greenhouse.io"
                    })
                    .collect();
                val["has_job_postings"] = serde_json::json!(segments.len() > 1);
                val["url_segments"] = serde_json::json!(segments);
            }
            Ok(val)
        })
        // Step 3: Score recency — CC timestamps are YYYYMMDDHHMMSS, newer = larger
        .then("score_recency", |mut val| {
            if let Some(ts) = val.get("last_seen").and_then(|t| t.as_str()) {
                let score: f64 = ts.parse::<f64>().unwrap_or(0.0) / 100_000_000_000_000.0;
                val["recency_score"] = serde_json::json!(score);
            }
            Ok(val)
        })
        // Step 4: Structured extraction via SlugExtractor (industries + tech signals)
        .then("extract_metadata", |mut val| {
            if let Some(slug) = val.get("slug").and_then(|s| s.as_str()).map(String::from) {
                val["extracted"] = rig_compat::SlugExtractor::extract(&slug);
            }
            Ok(val)
        })
}

/// Run SlugExtractor + ResultPipeline on a batch of boards and persist enrichment
/// columns (company_name, industry_tags, tech_signals, enriched_at) back to D1.
pub async fn auto_enrich_boards(db: &D1Database, boards: &[DiscoveredBoard]) -> Result<usize> {
    if boards.is_empty() { return Ok(0); }

    const SQL: &str = "UPDATE companies
         SET ashby_industry_tags=?1, ashby_tech_signals=?2, ashby_size_signal=?3, ashby_enriched_at=datetime('now')
         WHERE key=?4";
    const BATCH_SIZE: usize = 100;

    let pipeline = build_enrichment_pipeline();
    let mut stmts = Vec::with_capacity(boards.len());

    for board in boards {
        let row = serde_json::json!({
            "slug":      board.token,
            "url":       board.url,
            "last_seen": board.timestamp,
        });

        let enriched = match pipeline.run(row) {
            Ok(v) => v,
            Err((step, msg)) => {
                console_log!("[enrich] token={} failed at '{}': {}", board.token, step, msg);
                continue;
            }
        };

        let extracted = match enriched.get("extracted") {
            Some(e) => e,
            None => continue,
        };
        let industry_tags = extracted.get("industries")
            .map(|v| v.to_string())
            .unwrap_or_else(|| "[]".to_string());
        let tech_signals = extracted.get("tech_signals")
            .map(|v| v.to_string())
            .unwrap_or_else(|| "[]".to_string());
        let size_signal = extracted.get("size_signal").and_then(|v| v.as_str()).unwrap_or("startup");

        stmts.push(db.prepare(SQL).bind(&[
            industry_tags.into(),
            tech_signals.into(),
            size_signal.into(),
            board.token.clone().into(),
        ])?);
    }

    let saved = stmts.len();
    for chunk in stmts.chunks(BATCH_SIZE) {
        let _ = db.batch(chunk.to_vec()).await;
    }

    Ok(saved)
}
