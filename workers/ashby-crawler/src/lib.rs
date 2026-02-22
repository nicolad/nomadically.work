use futures::future::{join, join_all};
use std::collections::HashMap;
use worker::*;
use worker::wasm_bindgen::JsValue;

mod rig_compat;
mod types;
mod common_crawl;
mod db;
mod enrichment;
mod search;
mod tools;
mod ashby;
mod greenhouse;
mod workable;

use types::{AtsProvider, ApiResponse, DiscoveredBoard, error_response};

// ═══════════════════════════════════════════════════════════════════════════
// ROUTE HANDLERS
// ═══════════════════════════════════════════════════════════════════════════

/// GET /crawl — paginated CC crawl, parameterized by ?provider=ashby|greenhouse
async fn handle_crawl(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let db_handle = ctx.env.d1("DB")?;
    let url = req.url()?;
    let params: HashMap<String, String> = url.query_pairs().into_owned().collect();

    let provider = params.get("provider")
        .and_then(|p| AtsProvider::from_str(p))
        .unwrap_or(AtsProvider::Ashby);
    let base_crawl_id = match params.get("crawl_id") {
        Some(id) => id.clone(),
        None => {
            // Auto-detect latest CC index
            let indexes = common_crawl::list_cc_indexes().await?;
            indexes.into_iter().next().unwrap_or_else(|| "CC-MAIN-2026-04".into())
        }
    };
    let crawl_id = provider.crawl_id(&base_crawl_id);
    let pages_per_run: u32 = params.get("pages_per_run").and_then(|p| p.parse().ok()).unwrap_or(3);

    let (total_pages, start_page, _st, mut boards_found) = match db::get_progress(&db_handle, &crawl_id).await? {
        Some((_t, _c, s, f)) if s == "done" => {
            return Response::from_json(&ApiResponse::success(serde_json::json!({
                "crawl_id": crawl_id, "provider": provider.as_str(), "status": "done", "boards_found": f,
                "message": "Already done. DELETE /progress?crawl_id=… to re-run."
            })));
        }
        Some((t, c, _, f)) => (t, c, String::from("running"), f),
        None => (common_crawl::get_num_pages(&base_crawl_id, provider).await?, 0, "pending".into(), 0),
    };

    db::save_progress(&db_handle, &crawl_id, total_pages, start_page, "running", boards_found).await?;
    let end_page = std::cmp::min(start_page + pages_per_run, total_pages);

    let page_futures: Vec<_> = (start_page..end_page)
        .map(|page| {
            let cid = base_crawl_id.clone();
            async move { (page, common_crawl::fetch_cdx_page(&cid, page, provider).await) }
        })
        .collect();
    let mut page_fetch_results = join_all(page_futures).await;
    page_fetch_results.sort_by_key(|(page, _)| *page);

    let mut all_new_boards: Vec<DiscoveredBoard> = Vec::new();
    let mut page_results = Vec::new();
    for (page, result) in page_fetch_results {
        let boards = result?;
        page_results.push(serde_json::json!({ "page": page, "discovered": boards.len() }));
        all_new_boards.extend(boards);
    }

    let upserted = db::upsert_boards(&db_handle, &all_new_boards).await?;
    boards_found += upserted as u32;

    let enriched = enrichment::auto_enrich_boards(&db_handle, &all_new_boards).await.unwrap_or(0);

    let status = if end_page >= total_pages { "done" } else { "running" };
    db::save_progress(&db_handle, &crawl_id, total_pages, end_page, status, boards_found).await?;

    Response::from_json(&ApiResponse::success(serde_json::json!({
        "crawl_id": crawl_id, "provider": provider.as_str(), "status": status, "total_pages": total_pages,
        "pages_processed": format!("{start_page}-{}", end_page.saturating_sub(1)),
        "next_page": if status == "done" { None } else { Some(end_page) },
        "total_boards_found": boards_found,
        "upserted_this_run": upserted,
        "enriched_this_run": enriched,
        "page_results": page_results,
    })))
}

/// GET /search?q=fintech&top_n=10 — Okapi BM25 ranking over the board corpus (both providers).
async fn handle_search(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let db_handle = ctx.env.d1("DB")?;
    let url = req.url()?;
    let params: HashMap<String, String> = url.query_pairs().into_owned().collect();

    let query = match params.get("q") {
        Some(q) if !q.is_empty() => q.clone(),
        _ => return error_response("?q= query parameter required"),
    };
    let top_n: usize = params.get("top_n").and_then(|n| n.parse().ok()).unwrap_or(10);

    let index = search::build_bm25_index(&db_handle).await?;
    let results = index.rank(&query, top_n);

    Response::from_json(&ApiResponse::success(serde_json::json!({
        "query": query,
        "engine": "rig_compat::Bm25Index (Okapi BM25, k1=1.5, b=0.75)",
        "index_size": index.len(),
        "results": results,
    })))
}

/// GET /enrich?slug=figma — Run Rig Pipeline on a board
async fn handle_enrich(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let db_handle = ctx.env.d1("DB")?;
    let url = req.url()?;
    let params: HashMap<String, String> = url.query_pairs().into_owned().collect();

    let slug = match params.get("slug") {
        Some(s) if !s.is_empty() => s.clone(),
        _ => return error_response("?slug= parameter required"),
    };

    let row = db_handle
        .prepare("SELECT key as slug, website as url, created_at as first_seen, last_seen_capture_timestamp as last_seen, last_seen_crawl_id as crawl_id, NULL as http_status FROM companies WHERE key = ?1")
        .bind(&[slug.into()])?
        .first::<serde_json::Value>(None)
        .await?;

    let row = match row {
        Some(r) => r,
        None => return error_response("Board not found"),
    };

    let pipeline = enrichment::build_enrichment_pipeline();
    let enriched = match pipeline.run(row) {
        Ok(v) => v,
        Err((step, msg)) => return error_response(&format!("Pipeline failed at '{step}': {msg}")),
    };

    Response::from_json(&ApiResponse::success(serde_json::json!({
        "pipeline": pipeline.step_names(),
        "enriched": enriched,
    })))
}

/// GET /enrich-all?limit=50 — Run pipeline on multiple boards
async fn handle_enrich_all(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let db_handle = ctx.env.d1("DB")?;
    let url = req.url()?;
    let params: HashMap<String, String> = url.query_pairs().into_owned().collect();
    let limit: u32 = params.get("limit").and_then(|v| v.parse().ok()).unwrap_or(50);

    let rows = db_handle
        .prepare("SELECT key as slug, website as url, created_at as first_seen, last_seen_capture_timestamp as last_seen, last_seen_crawl_id as crawl_id, NULL as http_status FROM companies ORDER BY last_seen_capture_timestamp DESC LIMIT ?1")
        .bind(&[(limit as f64).into()])?
        .all().await?
        .results::<serde_json::Value>()?;

    let pipeline = enrichment::build_enrichment_pipeline();
    let step_names = pipeline.step_names();
    let mut enriched = Vec::new();
    let mut errors = Vec::new();
    for r in rows {
        match pipeline.run(r) {
            Ok(v) => enriched.push(v),
            Err((step, msg)) => errors.push(serde_json::json!({ "step": step, "error": msg })),
        }
    }

    let mut industry_counts: HashMap<String, usize> = HashMap::new();
    for item in &enriched {
        if let Some(industries) = item
            .get("extracted")
            .and_then(|e| e.get("industries"))
            .and_then(|i| i.as_array())
        {
            for industry in industries {
                if let Some(i) = industry.as_str() {
                    *industry_counts.entry(i.to_string()).or_default() += 1;
                }
            }
        }
    }

    Response::from_json(&ApiResponse::success(serde_json::json!({
        "pipeline": step_names,
        "count": enriched.len(),
        "errors": errors.len(),
        "industry_distribution": industry_counts,
        "boards": enriched,
    })))
}

/// GET /tools — ToolRegistry listing + ToolDefinition function-calling schemas
async fn handle_tools(req: Request, _ctx: RouteContext<()>) -> Result<Response> {
    let url = req.url()?;
    let params: HashMap<String, String> = url.query_pairs().into_owned().collect();

    if let Some(tool_name) = params.get("call") {
        let args: serde_json::Value = params.get("args")
            .and_then(|s| serde_json::from_str(s).ok())
            .unwrap_or(serde_json::json!({}));

        let registry = tools::build_tool_registry();
        return match registry.call(tool_name, args) {
            Ok(result) => Response::from_json(&ApiResponse::success(serde_json::json!({
                "tool": tool_name,
                "result": result,
            }))),
            Err(e) => error_response(&e),
        };
    }

    let registry = tools::build_tool_registry();
    let definitions = tools::define_tools();
    let schemas: Vec<serde_json::Value> = definitions.iter().map(|t| t.to_function_schema()).collect();

    Response::from_json(&ApiResponse::success(serde_json::json!({
        "description": "rig_compat tool registry (rig::agent pattern, no LLM routing)",
        "usage": {
            "list":     "GET /tools",
            "call":     "GET /tools?call=<name>&args={...}",
            "llm_wire": "Pass function_schemas to any LLM to let it call these endpoints",
        },
        "registry": registry.list(),
        "function_schemas": schemas,
    })))
}

/// GET /boards — list/search from D1. Supports ?provider=ashby|greenhouse filter.
async fn handle_list_boards(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let db_handle = ctx.env.d1("DB")?;
    let url = req.url()?;
    let params: HashMap<String, String> = url.query_pairs().into_owned().collect();
    let limit: u32 = params.get("limit").and_then(|v| v.parse().ok()).unwrap_or(100);
    let offset: u32 = params.get("offset").and_then(|v| v.parse().ok()).unwrap_or(0);
    let search = params.get("search").cloned();
    let provider_filter = params.get("provider").cloned();

    let (q, binds): (String, Vec<JsValue>) = match (&search, &provider_filter) {
        (Some(term), Some(prov)) => (
            "SELECT key as slug, website as url, created_at as first_seen, last_seen_capture_timestamp as last_seen, last_seen_crawl_id as crawl_id, ats_provider FROM companies WHERE key LIKE ?1 AND ats_provider=?2 ORDER BY key LIMIT ?3 OFFSET ?4".into(),
            vec![format!("%{term}%").into(), prov.clone().into(), (limit as f64).into(), (offset as f64).into()]
        ),
        (Some(term), None) => (
            "SELECT key as slug, website as url, created_at as first_seen, last_seen_capture_timestamp as last_seen, last_seen_crawl_id as crawl_id, ats_provider FROM companies WHERE key LIKE ?1 ORDER BY key LIMIT ?2 OFFSET ?3".into(),
            vec![format!("%{term}%").into(), (limit as f64).into(), (offset as f64).into()]
        ),
        (None, Some(prov)) => (
            "SELECT key as slug, website as url, created_at as first_seen, last_seen_capture_timestamp as last_seen, last_seen_crawl_id as crawl_id, ats_provider FROM companies WHERE ats_provider=?1 ORDER BY key LIMIT ?2 OFFSET ?3".into(),
            vec![prov.clone().into(), (limit as f64).into(), (offset as f64).into()]
        ),
        (None, None) => (
            "SELECT key as slug, website as url, created_at as first_seen, last_seen_capture_timestamp as last_seen, last_seen_crawl_id as crawl_id, ats_provider FROM companies ORDER BY key LIMIT ?1 OFFSET ?2".into(),
            vec![(limit as f64).into(), (offset as f64).into()]
        ),
    };

    let rows = db_handle.prepare(&q).bind(&binds)?.all().await?.results::<serde_json::Value>()?;

    let count_q = match (&search, &provider_filter) {
        (Some(term), Some(prov)) =>
            db_handle.prepare("SELECT COUNT(*) as count FROM companies WHERE key LIKE ?1 AND ats_provider=?2")
                .bind(&[format!("%{term}%").into(), prov.clone().into()])?,
        (Some(term), None) =>
            db_handle.prepare("SELECT COUNT(*) as count FROM companies WHERE key LIKE ?1")
                .bind(&[format!("%{term}%").into()])?,
        (None, Some(prov)) =>
            db_handle.prepare("SELECT COUNT(*) as count FROM companies WHERE ats_provider=?1")
                .bind(&[prov.clone().into()])?,
        (None, None) =>
            db_handle.prepare("SELECT COUNT(*) as count FROM companies")
                .bind(&[])?,
    };
    let total = count_q.first::<serde_json::Value>(None).await?
        .and_then(|r| r["count"].as_f64()).unwrap_or(0.0) as u64;

    Response::from_json(&ApiResponse::success(serde_json::json!({
        "boards": rows, "total": total, "limit": limit, "offset": offset,
    })))
}

async fn handle_indexes(_req: Request, _ctx: RouteContext<()>) -> Result<Response> {
    let indexes = common_crawl::list_cc_indexes().await?;
    Response::from_json(&ApiResponse::success(serde_json::json!({ "indexes": indexes, "count": indexes.len() })))
}

async fn handle_progress(_req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let db_handle = ctx.env.d1("DB")?;
    let rows = db_handle.prepare("SELECT * FROM crawl_progress ORDER BY updated_at DESC")
        .bind(&[])?.all().await?.results::<serde_json::Value>()?;
    Response::from_json(&ApiResponse::success(serde_json::json!({ "crawls": rows })))
}

async fn handle_reset_progress(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let db_handle = ctx.env.d1("DB")?;
    let url = req.url()?;
    let params: HashMap<String, String> = url.query_pairs().into_owned().collect();
    let cid = match params.get("crawl_id") {
        Some(id) => id.clone(),
        None => return error_response("crawl_id required"),
    };
    db_handle.prepare("DELETE FROM crawl_progress WHERE crawl_id=?1")
        .bind(&[cid.clone().into()])?.run().await?;
    Response::from_json(&ApiResponse::success(serde_json::json!({ "message": format!("Reset {cid}") })))
}

async fn handle_stats(_req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let db_handle = ctx.env.d1("DB")?;

    // Per-provider counts
    let by_provider = db_handle.prepare(
        "SELECT COALESCE(ats_provider, 'ashby') as provider, COUNT(*) as count FROM companies GROUP BY COALESCE(ats_provider, 'ashby')"
    ).bind(&[])?.all().await?.results::<serde_json::Value>()?;

    let total = db_handle.prepare("SELECT COUNT(*) as count FROM companies")
        .bind(&[])?.first::<serde_json::Value>(None).await?
        .and_then(|r| r["count"].as_f64()).unwrap_or(0.0) as u64;
    let by_crawl = db_handle.prepare("SELECT last_seen_crawl_id as crawl_id, COUNT(*) as count FROM companies GROUP BY last_seen_crawl_id")
        .bind(&[])?.all().await?.results::<serde_json::Value>()?;
    let newest = db_handle.prepare("SELECT key as slug, website as url, last_seen_capture_timestamp as last_seen, ats_provider FROM companies ORDER BY last_seen_capture_timestamp DESC LIMIT 10")
        .bind(&[])?.all().await?.results::<serde_json::Value>()?;
    Response::from_json(&ApiResponse::success(serde_json::json!({
        "total_boards": total, "by_provider": by_provider, "by_crawl": by_crawl, "newest_boards": newest,
    })))
}

/// GET /sync-jobs — Bulk job sync for a provider.
/// ?provider=greenhouse&limit=50&concurrency=10
/// Fetches unsynced boards and pulls their jobs from the ATS API.
async fn handle_sync_jobs(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let db_handle = ctx.env.d1("DB")?;
    let url = req.url()?;
    let params: HashMap<String, String> = url.query_pairs().into_owned().collect();

    let provider = params.get("provider")
        .and_then(|p| AtsProvider::from_str(p))
        .unwrap_or(AtsProvider::Greenhouse);
    let limit: usize = params.get("limit").and_then(|v| v.parse().ok()).unwrap_or(50);
    let concurrency: usize = params.get("concurrency").and_then(|v| v.parse().ok()).unwrap_or(10);

    let slugs = db::get_company_slugs_by_provider(&db_handle, provider, limit).await?;
    if slugs.is_empty() {
        return Response::from_json(&ApiResponse::success(serde_json::json!({
            "provider": provider.as_str(),
            "message": "No unsynced boards found",
            "synced_jobs": 0,
            "boards_processed": 0,
        })));
    }

    let total_boards = slugs.len();
    let mut total_jobs = 0usize;
    let mut errors = Vec::new();
    let runner = rig_compat::ConcurrentRunner::new();

    // Process in batches to avoid overwhelming the ATS API
    for batch in slugs.chunks(concurrency) {
        let batch_vec: Vec<String> = batch.to_vec();

        match provider {
            AtsProvider::Ashby => {
                let (ok, err) = runner.run_all(batch_vec, |slug| async move {
                    ashby::fetch_ashby_board_jobs(&slug).await.map(|board| (slug, board))
                }).await;
                for e in err { errors.push(format!("{:?}", e)); }
                for (slug, board) in ok {
                    let title = board.title.clone().unwrap_or_default();
                    total_jobs += ashby::upsert_ashby_jobs_to_d1(&db_handle, &board.jobs, &slug, &title).await.unwrap_or(0);
                }
            }
            AtsProvider::Greenhouse => {
                let (ok, err) = runner.run_all(batch_vec, |token| async move {
                    greenhouse::fetch_greenhouse_board_jobs(&token).await.map(|board| (token, board))
                }).await;
                for e in err { errors.push(format!("{:?}", e)); }
                for (token, board) in ok {
                    let name = board.name.clone().unwrap_or_default();
                    total_jobs += greenhouse::upsert_greenhouse_jobs_to_d1(&db_handle, &board.jobs, &token, &name).await.unwrap_or(0);
                }
            }
            AtsProvider::Workable => {
                let (ok, err) = runner.run_all(batch_vec, |shortcode| async move {
                    workable::fetch_workable_board_jobs(&shortcode).await.map(|resp| (shortcode, resp))
                }).await;
                for e in err { errors.push(format!("{:?}", e)); }
                for (shortcode, resp) in ok {
                    total_jobs += workable::upsert_workable_jobs_to_d1(&db_handle, &resp, &shortcode).await.unwrap_or(0);
                }
            }
        }
    }

    Response::from_json(&ApiResponse::success(serde_json::json!({
        "provider": provider.as_str(),
        "boards_processed": total_boards,
        "synced_jobs": total_jobs,
        "errors": errors.len(),
        "error_details": &errors[..errors.len().min(10)],
    })))
}

// ═══════════════════════════════════════════════════════════════════════════
// SCHEDULED CRON HANDLER
// ═══════════════════════════════════════════════════════════════════════════

/// Daily cron: crawl latest Common Crawl index for new Ashby + Greenhouse job boards.
///
/// Strategy:
///   - Runs daily at 02:00 UTC (configured in wrangler.toml [triggers])
///   - Detects the latest CC index automatically via the collinfo API
///   - Processes PAGES_PER_PROVIDER pages per provider per invocation (resumable)
///   - Syncs BOARDS_PER_PROVIDER boards per provider per invocation
///   - All progress persisted to D1 `crawl_progress` table with prefixed crawl IDs
const PAGES_PER_PROVIDER: u32 = 5;
const BOARDS_PER_PROVIDER: usize = 10;

#[event(scheduled)]
async fn cron_handler(_event: ScheduledEvent, env: Env, _ctx: ScheduleContext) {
    if let Err(e) = cron_handler_inner(env).await {
        console_log!("[ats-crawler cron] Error: {:?}", e);
    }
}

async fn cron_handler_inner(env: Env) -> Result<()> {
    console_log!("[ats-crawler cron] Starting scheduled crawl run...");
    let db_handle = env.d1("DB")?;

    if let Err(e) = db::apply_pending_migrations(&db_handle).await {
        console_log!("[migrations] Warning: {:?}", e);
    }

    // ── Step 1: concurrent reads — CC index list + slug queues for all providers ──
    let (cc_result, ashby_slugs_result, gh_slugs_result, wb_slugs_result) = {
        let cc = common_crawl::list_cc_indexes();
        let a = db::get_company_slugs_by_provider(&db_handle, AtsProvider::Ashby, BOARDS_PER_PROVIDER);
        let g = db::get_company_slugs_by_provider(&db_handle, AtsProvider::Greenhouse, BOARDS_PER_PROVIDER);
        let w = db::get_company_slugs_by_provider(&db_handle, AtsProvider::Workable, BOARDS_PER_PROVIDER);
        let ((cc_r, a_r), (g_r, w_r)) = join(join(cc, a), join(g, w)).await;
        (cc_r, a_r, g_r, w_r)
    };

    let base_crawl_id = match cc_result {
        Ok(indexes) if !indexes.is_empty() => {
            console_log!("[ats-crawler cron] Latest CC index: {}", indexes[0]);
            indexes[0].clone()
        }
        Ok(_) => { console_log!("[ats-crawler cron] No CC indexes, using fallback"); "CC-MAIN-2025-52".to_string() }
        Err(e) => { console_log!("[ats-crawler cron] CC index list failed: {:?}, using fallback", e); "CC-MAIN-2025-52".to_string() }
    };
    let ashby_slugs = ashby_slugs_result.unwrap_or_default();
    let gh_slugs = gh_slugs_result.unwrap_or_default();
    let wb_slugs = wb_slugs_result.unwrap_or_default();

    // ── Step 2: check progress for all providers ──
    let ashby_crawl_id = AtsProvider::Ashby.crawl_id(&base_crawl_id);
    let gh_crawl_id = AtsProvider::Greenhouse.crawl_id(&base_crawl_id);
    let wb_crawl_id = AtsProvider::Workable.crawl_id(&base_crawl_id);

    let (ashby_progress, (gh_progress, wb_progress)) = join(
        db::get_progress(&db_handle, &ashby_crawl_id),
        join(
            db::get_progress(&db_handle, &gh_crawl_id),
            db::get_progress(&db_handle, &wb_crawl_id),
        ),
    ).await;

    // Helper to resolve progress into (total, start, found, skip_crawl)
    fn resolve_progress(progress: Result<Option<(u32,u32,String,u32)>>) -> (u32, u32, u32, bool) {
        match progress {
            Ok(Some((_, _, ref s, f))) if s == "done" => (0, 0, f, true),
            Ok(Some((t, c, _, f))) => (t, c, f, false),
            _ => (0, 0, 0, false), // will need get_num_pages
        }
    }

    let (mut ashby_total, ashby_start, mut ashby_found, ashby_done) = resolve_progress(ashby_progress);
    let (mut gh_total, gh_start, mut gh_found, gh_done) = resolve_progress(gh_progress);
    let (mut wb_total, wb_start, mut wb_found, wb_done) = resolve_progress(wb_progress);

    // Get page counts for new crawls
    if !ashby_done && ashby_total == 0 {
        ashby_total = common_crawl::get_num_pages(&base_crawl_id, AtsProvider::Ashby).await.unwrap_or(0);
        console_log!("[ats-crawler cron] Ashby: {} pages total", ashby_total);
    }
    if !gh_done && gh_total == 0 {
        gh_total = common_crawl::get_num_pages(&base_crawl_id, AtsProvider::Greenhouse).await.unwrap_or(0);
        console_log!("[ats-crawler cron] Greenhouse: {} pages total", gh_total);
    }
    if !wb_done && wb_total == 0 {
        wb_total = common_crawl::get_num_pages(&base_crawl_id, AtsProvider::Workable).await.unwrap_or(0);
        console_log!("[ats-crawler cron] Workable: {} pages total", wb_total);
    }

    let ashby_end = if !ashby_done && ashby_total > 0 {
        db::save_progress(&db_handle, &ashby_crawl_id, ashby_total, ashby_start, "running", ashby_found).await?;
        (ashby_start + PAGES_PER_PROVIDER).min(ashby_total)
    } else { 0 };

    let gh_end = if !gh_done && gh_total > 0 {
        db::save_progress(&db_handle, &gh_crawl_id, gh_total, gh_start, "running", gh_found).await?;
        (gh_start + PAGES_PER_PROVIDER).min(gh_total)
    } else { 0 };

    let wb_end = if !wb_done && wb_total > 0 {
        db::save_progress(&db_handle, &wb_crawl_id, wb_total, wb_start, "running", wb_found).await?;
        (wb_start + PAGES_PER_PROVIDER).min(wb_total)
    } else { 0 };

    // ── Step 3: fan-out ALL HTTP concurrently ──
    let ashby_cdx_futures: Vec<_> = (ashby_start..ashby_end)
        .map(|page| { let cid = base_crawl_id.clone(); async move { (page, common_crawl::fetch_cdx_page(&cid, page, AtsProvider::Ashby).await) } })
        .collect();
    let gh_cdx_futures: Vec<_> = (gh_start..gh_end)
        .map(|page| { let cid = base_crawl_id.clone(); async move { (page, common_crawl::fetch_cdx_page(&cid, page, AtsProvider::Greenhouse).await) } })
        .collect();
    let wb_cdx_futures: Vec<_> = (wb_start..wb_end)
        .map(|page| { let cid = base_crawl_id.clone(); async move { (page, common_crawl::fetch_cdx_page(&cid, page, AtsProvider::Workable).await) } })
        .collect();

    let runner = rig_compat::ConcurrentRunner::new();

    // All HTTP requests concurrently: CDX pages for all + board job fetches for all
    let (ashby_cdx, gh_cdx, wb_cdx, (ashby_jobs_ok, ashby_jobs_err), (gh_jobs_ok, gh_jobs_err), (wb_jobs_ok, wb_jobs_err)) = {
        let a_cdx = join_all(ashby_cdx_futures);
        let g_cdx = join_all(gh_cdx_futures);
        let w_cdx = join_all(wb_cdx_futures);
        let a_jobs = runner.run_all(ashby_slugs.clone(), |slug| async move {
            ashby::fetch_ashby_board_jobs(&slug).await.map(|board| (slug, board))
        });
        let g_jobs = runner.run_all(gh_slugs.clone(), |token| async move {
            greenhouse::fetch_greenhouse_board_jobs(&token).await.map(|board| (token, board))
        });
        let w_jobs = runner.run_all(wb_slugs.clone(), |shortcode| async move {
            workable::fetch_workable_board_jobs(&shortcode).await.map(|resp| (shortcode, resp))
        });

        // join6 via nested joins
        let ((a, (g, w)), (aj, (gj, wj))) = join(
            join(a_cdx, join(g_cdx, w_cdx)),
            join(a_jobs, join(g_jobs, w_jobs)),
        ).await;
        (a, g, w, aj, gj, wj)
    };

    for e in &ashby_jobs_err { console_log!("[job-sync:ashby] board fetch error: {:?}", e); }
    for e in &gh_jobs_err { console_log!("[job-sync:greenhouse] board fetch error: {:?}", e); }
    for e in &wb_jobs_err { console_log!("[job-sync:workable] board fetch error: {:?}", e); }

    // ── Step 4: process CDX results ──
    let process_cdx = |mut results: Vec<(u32, Result<Vec<DiscoveredBoard>>)>, provider: &str| -> (Vec<DiscoveredBoard>, u32) {
        results.sort_by_key(|(page, _)| *page);
        let mut all_boards = Vec::new();
        let mut page_errors = 0u32;
        for (page, result) in results {
            match result {
                Ok(boards) => {
                    console_log!("[ats-crawler cron:{}] Page {}: {} boards", provider, page, boards.len());
                    all_boards.extend(boards);
                }
                Err(e) => {
                    page_errors += 1;
                    console_log!("[ats-crawler cron:{}] Page {} error: {:?}", provider, page, e);
                }
            }
        }
        (all_boards, page_errors)
    };

    let (ashby_boards, _) = process_cdx(ashby_cdx, "ashby");
    let (gh_boards, _) = process_cdx(gh_cdx, "greenhouse");
    let (wb_boards, _) = process_cdx(wb_cdx, "workable");

    // ── Step 5: concurrent D1 writes ──
    let ashby_boards_ref = &ashby_boards;
    let gh_boards_ref = &gh_boards;
    let wb_boards_ref = &wb_boards;

    let ((ashby_upserted, ashby_enriched), (gh_upserted, gh_enriched), (wb_upserted, wb_enriched), ashby_synced, gh_synced, wb_synced) = {
        let a_write = async {
            let u = if !ashby_boards_ref.is_empty() { db::upsert_boards(&db_handle, ashby_boards_ref).await.unwrap_or(0) } else { 0 };
            let e = if !ashby_boards_ref.is_empty() { enrichment::auto_enrich_boards(&db_handle, ashby_boards_ref).await.unwrap_or(0) } else { 0 };
            (u, e)
        };
        let g_write = async {
            let u = if !gh_boards_ref.is_empty() { db::upsert_boards(&db_handle, gh_boards_ref).await.unwrap_or(0) } else { 0 };
            let e = if !gh_boards_ref.is_empty() { enrichment::auto_enrich_boards(&db_handle, gh_boards_ref).await.unwrap_or(0) } else { 0 };
            (u, e)
        };
        let w_write = async {
            let u = if !wb_boards_ref.is_empty() { db::upsert_boards(&db_handle, wb_boards_ref).await.unwrap_or(0) } else { 0 };
            let e = if !wb_boards_ref.is_empty() { enrichment::auto_enrich_boards(&db_handle, wb_boards_ref).await.unwrap_or(0) } else { 0 };
            (u, e)
        };
        let a_sync = async {
            let mut total = 0usize;
            for (slug, board) in ashby_jobs_ok {
                let title = board.title.clone().unwrap_or_default();
                total += ashby::upsert_ashby_jobs_to_d1(&db_handle, &board.jobs, &slug, &title).await.unwrap_or(0);
            }
            total
        };
        let g_sync = async {
            let mut total = 0usize;
            for (token, board) in gh_jobs_ok {
                let name = board.name.clone().unwrap_or_default();
                total += greenhouse::upsert_greenhouse_jobs_to_d1(&db_handle, &board.jobs, &token, &name).await.unwrap_or(0);
            }
            total
        };
        let w_sync = async {
            let mut total = 0usize;
            for (shortcode, resp) in wb_jobs_ok {
                total += workable::upsert_workable_jobs_to_d1(&db_handle, &resp, &shortcode).await.unwrap_or(0);
            }
            total
        };

        let ((a, (g, w)), (as_, (gs, ws))) = join(
            join(a_write, join(g_write, w_write)),
            join(a_sync, join(g_sync, w_sync)),
        ).await;
        (a, g, w, as_, gs, ws)
    };

    // ── Step 6: save final progress ──
    if ashby_end > 0 {
        ashby_found += ashby_upserted as u32;
        let status = if ashby_end >= ashby_total { "done" } else { "running" };
        db::save_progress(&db_handle, &ashby_crawl_id, ashby_total, ashby_end, status, ashby_found).await?;
        console_log!(
            "[ats-crawler cron] Ashby Phase 1: pages {}-{}/{}, {} upserted, {} enriched, status={}",
            ashby_start, ashby_end.saturating_sub(1), ashby_total, ashby_upserted, ashby_enriched, status
        );
    }
    if gh_end > 0 {
        gh_found += gh_upserted as u32;
        let status = if gh_end >= gh_total { "done" } else { "running" };
        db::save_progress(&db_handle, &gh_crawl_id, gh_total, gh_end, status, gh_found).await?;
        console_log!(
            "[ats-crawler cron] Greenhouse Phase 1: pages {}-{}/{}, {} upserted, {} enriched, status={}",
            gh_start, gh_end.saturating_sub(1), gh_total, gh_upserted, gh_enriched, status
        );
    }
    if wb_end > 0 {
        wb_found += wb_upserted as u32;
        let status = if wb_end >= wb_total { "done" } else { "running" };
        db::save_progress(&db_handle, &wb_crawl_id, wb_total, wb_end, status, wb_found).await?;
        console_log!(
            "[ats-crawler cron] Workable Phase 1: pages {}-{}/{}, {} upserted, {} enriched, status={}",
            wb_start, wb_end.saturating_sub(1), wb_total, wb_upserted, wb_enriched, status
        );
    }
    console_log!(
        "[ats-crawler cron] Phase 2: {} Ashby jobs from {} boards, {} Greenhouse jobs from {} boards, {} Workable jobs from {} boards",
        ashby_synced, ashby_slugs.len(), gh_synced, gh_slugs.len(), wb_synced, wb_slugs.len()
    );

    Ok(())
}

/// GET /seed — Seed companies by probing the ATS API directly.
/// ?provider=workable&sites=stripe,netlify,... (comma-separated slugs)
/// Workable CC works, but direct seeding is a convenience.
async fn handle_seed(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let db_handle = ctx.env.d1("DB")?;
    let url = req.url()?;
    let params: HashMap<String, String> = url.query_pairs().into_owned().collect();

    let provider = params.get("provider")
        .and_then(|p| AtsProvider::from_str(p))
        .unwrap_or(AtsProvider::Workable);

    // Only Workable supports direct seeding
    if provider != AtsProvider::Workable {
        return error_response("?provider= must be workable for seeding");
    }

    let sites_param = match params.get("sites") {
        Some(s) if !s.is_empty() => s.clone(),
        _ => return error_response("?sites= required (comma-separated slugs, e.g. sites=stripe,netlify)"),
    };

    let sites: Vec<&str> = sites_param.split(',').map(|s| s.trim()).filter(|s| !s.is_empty()).collect();
    if sites.is_empty() {
        return error_response("No valid sites provided");
    }

    let runner = rig_compat::ConcurrentRunner::new();
    let mut seeded = Vec::new();
    let mut total_jobs = 0usize;
    let mut skipped = Vec::new();
    let mut error_details = Vec::new();

    match provider {
        AtsProvider::Workable => {
            let (results, errors) = runner.run_all(
                sites.iter().map(|s| s.to_string()).collect(),
                |shortcode| async move {
                    workable::fetch_workable_board_jobs(&shortcode).await.map(|resp| (shortcode, resp))
                },
            ).await;
            for e in &errors { error_details.push(format!("{:?}", e)); }

            for (shortcode, resp) in results {
                if resp.jobs.is_empty() {
                    skipped.push(serde_json::json!({ "site": shortcode, "reason": "no jobs (404 or empty)" }));
                    continue;
                }
                let company_name = resp.name.clone().unwrap_or_else(|| {
                    shortcode.split(|c: char| c == '-' || c == '_')
                        .map(|w| { let mut chars = w.chars(); match chars.next() { None => String::new(), Some(c) => c.to_uppercase().to_string() + chars.as_str() } })
                        .collect::<Vec<_>>().join(" ")
                });
                let _ = db_handle.prepare(
                    "INSERT INTO companies (key, name, website, category, score, ats_provider)
                     VALUES (?1, ?2, ?3, 'PRODUCT', 0.5, 'workable')
                     ON CONFLICT(key) DO UPDATE SET
                       name=COALESCE(NULLIF(companies.name,''),excluded.name),
                       website=excluded.website, ats_provider='workable', updated_at=datetime('now')"
                ).bind(&[shortcode.clone().into(), company_name.into(), format!("https://apply.workable.com/{}", shortcode).into()])?.run().await;
                let count = workable::upsert_workable_jobs_to_d1(&db_handle, &resp, &shortcode).await.unwrap_or(0);
                total_jobs += count;
                seeded.push(serde_json::json!({ "site": shortcode, "jobs": count }));
            }
        }
        _ => unreachable!(),
    }

    Response::from_json(&ApiResponse::success(serde_json::json!({
        "provider": provider.as_str(),
        "seeded": seeded.len(),
        "total_jobs": total_jobs,
        "skipped": skipped,
        "errors": error_details.len(),
        "error_details": &error_details[..error_details.len().min(10)],
        "boards": seeded,
    })))
}

// ═══════════════════════════════════════════════════════════════════════════
// ROUTER
// ═══════════════════════════════════════════════════════════════════════════

#[event(fetch)]
async fn main(req: Request, env: Env, _ctx: Context) -> Result<Response> {
    if let Ok(db_handle) = env.d1("DB") {
        if let Err(e) = db::apply_pending_migrations(&db_handle).await {
            console_log!("[migrations] Warning: {:?}", e);
        }
    }

    Router::new()
        // Core crawl
        .get_async("/crawl", handle_crawl)
        .get_async("/boards", handle_list_boards)
        .get_async("/indexes", handle_indexes)
        .get_async("/progress", handle_progress)
        .delete_async("/progress", handle_reset_progress)
        .get_async("/stats", handle_stats)
        .get_async("/sync-jobs", handle_sync_jobs)
        .get_async("/seed", handle_seed)
        // Rig-powered endpoints
        .get_async("/search", handle_search)
        .get_async("/enrich", handle_enrich)
        .get_async("/enrich-all", handle_enrich_all)
        .get_async("/tools", handle_tools)
        // Root
        .get("/", |_, _| {
            Response::from_json(&serde_json::json!({
                "service": "ats-crawler v0.8 (multi-ats: ashby + greenhouse + workable)",
                "providers": ["ashby", "greenhouse", "workable"],
                "core_endpoints": {
                    "GET /crawl":       "Crawl CC index → D1. ?provider=ashby|greenhouse|workable&crawl_id=&pages_per_run=",
                    "GET /boards":      "List/search boards. ?provider=&limit=&offset=&search=",
                    "GET /indexes":     "Available CC indexes",
                    "GET /progress":    "Crawl progress (prefixed crawl IDs: CC-MAIN-YYYY-WW:ashby|greenhouse|workable)",
                    "DELETE /progress": "Reset a crawl. ?crawl_id=",
                    "GET /stats":       "Summary stats (per-provider breakdown)",
                    "GET /sync-jobs":   "Bulk job sync. ?provider=ashby|greenhouse|workable&limit=50&concurrency=10",
                    "GET /seed":        "Seed companies directly. ?provider=workable&sites=stripe,netlify,io-global",
                },
                "rig_endpoints": {
                    "GET /search":      "Okapi BM25 search over enriched corpus (all providers). ?q=&top_n=",
                    "GET /enrich":      "On-demand ResultPipeline for one board. ?slug=",
                    "GET /enrich-all":  "On-demand batch ResultPipeline. ?limit=",
                    "GET /tools":       "ToolRegistry + function-calling schemas. ?call=&args=",
                },
                "cron_phases": {
                    "phase_1": "CC crawl → upsert companies (5 pages/provider/run, resumable)",
                    "phase_2": "Job sync → fetch jobs for 10 boards/provider/run",
                },
                "rig_patterns": ["Bm25Index", "ResultPipeline", "SlugExtractor", "ToolRegistry", "ConcurrentRunner"],
            }))
        })
        .run(req, env)
        .await
}
