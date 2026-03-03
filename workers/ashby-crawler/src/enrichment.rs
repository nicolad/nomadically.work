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
         SET ashby_industry_tags=?1, ashby_tech_signals=?2, ashby_size_signal=?3, ashby_enriched_at=datetime('now'),
             ai_tier=?4, ai_classification_confidence=?5, ai_classification_reason=?6
         WHERE key=?7";
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
        
        // Derive ai_tier: 2=ai_native, 1=ai_first, 0=not AI
        let is_ai_native = extracted.get("is_ai_native").and_then(|v| v.as_bool()).unwrap_or(false);
        let is_ai_first  = extracted.get("is_ai_first") .and_then(|v| v.as_bool()).unwrap_or(false);
        let ai_tier: i32 = if is_ai_native { 2 } else if is_ai_first { 1 } else { 0 };
        let ai_confidence = extracted.get("ai_classification_confidence").and_then(|v| v.as_f64()).unwrap_or(0.5);
        let ai_reasons = extracted.get("ai_classification_reasons")
            .and_then(|v| v.as_array())
            .map(|arr| {
                arr.iter()
                    .filter_map(|item| item.as_str())
                    .collect::<Vec<_>>()
                    .join("; ")
            })
            .unwrap_or_default();

        stmts.push(db.prepare(SQL).bind(&[
            industry_tags.into(),
            tech_signals.into(),
            size_signal.into(),
            ai_tier.into(),
            ai_confidence.into(),
            ai_reasons.into(),
            board.token.clone().into(),
        ])?);
    }

    let mut saved = 0usize;
    for chunk in stmts.chunks(BATCH_SIZE) {
        match db.batch(chunk.to_vec()).await {
            Ok(results) => saved += results.iter().filter(|r| r.success()).count(),
            Err(e) => console_log!("[enrich] batch update failed: {}", e),
        }
    }

    Ok(saved)
}
