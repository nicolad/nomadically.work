use worker::*;
use crate::types::{AtsProvider, DiscoveredBoard};

// ═══════════════════════════════════════════════════════════════════════════
// MIGRATIONS — applied automatically on first request after deploy
// ═══════════════════════════════════════════════════════════════════════════

const MIGRATIONS: &[(&str, &str)] = &[
    ("0002_enrichment", "
        ALTER TABLE ashby_boards ADD COLUMN company_name  TEXT;
        ALTER TABLE ashby_boards ADD COLUMN industry_tags TEXT;
        ALTER TABLE ashby_boards ADD COLUMN tech_signals  TEXT;
        ALTER TABLE ashby_boards ADD COLUMN enriched_at   TEXT;
        CREATE INDEX IF NOT EXISTS idx_boards_company  ON ashby_boards(company_name);
        CREATE INDEX IF NOT EXISTS idx_boards_industry ON ashby_boards(industry_tags);
    "),
    ("0005_companies_ashby_enrichment", "
        ALTER TABLE companies ADD COLUMN ashby_industry_tags TEXT;
        ALTER TABLE companies ADD COLUMN ashby_tech_signals  TEXT;
        ALTER TABLE companies ADD COLUMN ashby_size_signal   TEXT;
        ALTER TABLE companies ADD COLUMN ashby_enriched_at   TEXT;
    "),
    ("0003_jobs_external_id_unique", "
        CREATE UNIQUE INDEX IF NOT EXISTS idx_jobs_external_id ON jobs(external_id);
    "),
    ("0004_ashby_boards_sync", "
        ALTER TABLE ashby_boards ADD COLUMN last_synced_at TEXT;
        ALTER TABLE ashby_boards ADD COLUMN job_count      INTEGER;
        ALTER TABLE ashby_boards ADD COLUMN is_active      INTEGER DEFAULT 1;
    "),
    ("0006_dedup_and_unique_external_id", "
        DELETE FROM jobs WHERE id NOT IN (SELECT MIN(id) FROM jobs GROUP BY external_id);
        CREATE UNIQUE INDEX IF NOT EXISTS idx_jobs_external_id ON jobs(external_id);
    "),
    ("0007_greenhouse_boards", "
        CREATE TABLE IF NOT EXISTS greenhouse_boards (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            token TEXT NOT NULL UNIQUE,
            url TEXT NOT NULL,
            first_seen TEXT NOT NULL DEFAULT (datetime('now')),
            last_seen TEXT NOT NULL DEFAULT (datetime('now')),
            crawl_id TEXT,
            last_synced_at TEXT,
            job_count INTEGER,
            is_active INTEGER DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        CREATE INDEX IF NOT EXISTS idx_gh_boards_token ON greenhouse_boards(token);
        ALTER TABLE companies ADD COLUMN ats_provider TEXT DEFAULT 'ashby';
    "),
    ("0008_gh_external_id_to_url", "
        UPDATE jobs
           SET external_id = absolute_url,
               updated_at  = datetime('now')
         WHERE external_id LIKE 'gh-%'
           AND source_kind = 'greenhouse'
           AND absolute_url IS NOT NULL
           AND absolute_url != ''
           AND absolute_url NOT IN (SELECT external_id FROM jobs WHERE external_id NOT LIKE 'gh-%')
    "),
    ("0011_workable_boards", "
        CREATE TABLE IF NOT EXISTS workable_boards (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            shortcode TEXT NOT NULL UNIQUE,
            url TEXT NOT NULL,
            first_seen TEXT NOT NULL DEFAULT (datetime('now')),
            last_seen TEXT NOT NULL DEFAULT (datetime('now')),
            crawl_id TEXT,
            last_synced_at TEXT,
            job_count INTEGER,
            is_active INTEGER DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        CREATE INDEX IF NOT EXISTS idx_wb_boards_shortcode ON workable_boards(shortcode)
    "),
    ("0010_strip_querystring_from_external_id", "
        DELETE FROM jobs WHERE id NOT IN (
          SELECT MIN(id) FROM jobs
          WHERE external_id LIKE '%?%' AND source_kind = 'greenhouse'
          GROUP BY SUBSTR(external_id, 1, INSTR(external_id, '?') - 1)
        ) AND external_id LIKE '%?%' AND source_kind = 'greenhouse';
        UPDATE jobs
           SET external_id = SUBSTR(external_id, 1, INSTR(external_id, '?') - 1),
               updated_at  = datetime('now')
         WHERE external_id LIKE '%?%'
           AND source_kind = 'greenhouse'
    "),
];

pub async fn apply_pending_migrations(db: &D1Database) -> Result<()> {
    db.prepare(
        "CREATE TABLE IF NOT EXISTS _migrations (
            name       TEXT PRIMARY KEY,
            applied_at TEXT NOT NULL DEFAULT (datetime('now'))
        )"
    )
    .bind(&[])?
    .run()
    .await?;

    for (name, sql) in MIGRATIONS {
        let already_applied = db
            .prepare("SELECT 1 FROM _migrations WHERE name=?1")
            .bind(&[(*name).into()])?
            .first::<serde_json::Value>(None)
            .await?
            .is_some();

        if already_applied {
            continue;
        }

        for stmt in sql.split(';').map(str::trim).filter(|s| !s.is_empty()) {
            let _ = db.prepare(stmt).bind(&[])?.run().await;
        }

        db.prepare("INSERT OR IGNORE INTO _migrations (name) VALUES (?1)")
            .bind(&[(*name).into()])?
            .run()
            .await?;

        console_log!("[migrations] Applied: {}", name);
    }

    Ok(())
}

// ═══════════════════════════════════════════════════════════════════════════
// D1 OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════

pub async fn upsert_boards(db: &D1Database, boards: &[DiscoveredBoard]) -> Result<usize> {
    if boards.is_empty() { return Ok(0); }

    const SQL: &str = "INSERT INTO companies (key, name, website, category, score, last_seen_crawl_id, last_seen_capture_timestamp, last_seen_source_url, ats_provider)
         VALUES (?1, ?2, ?3, 'PRODUCT', 0.5, ?4, ?5, ?6, ?7)
         ON CONFLICT(key) DO UPDATE SET
           name=COALESCE(NULLIF(companies.name,''),excluded.name),
           website=excluded.website,
           last_seen_crawl_id=excluded.last_seen_crawl_id,
           last_seen_capture_timestamp=excluded.last_seen_capture_timestamp,
           last_seen_source_url=excluded.last_seen_source_url,
           ats_provider=COALESCE(excluded.ats_provider, companies.ats_provider),
           updated_at=datetime('now')
         WHERE excluded.last_seen_capture_timestamp >= COALESCE(companies.last_seen_capture_timestamp, '')";

    let mut stmts = Vec::with_capacity(boards.len());
    for board in boards {
        let name: String = board.token
            .split(|c: char| c == '-' || c == '_')
            .map(|w| {
                let mut chars = w.chars();
                match chars.next() {
                    None => String::new(),
                    Some(c) => c.to_uppercase().to_string() + chars.as_str(),
                }
            })
            .collect::<Vec<_>>()
            .join(" ");
        // If the token is all-numeric, the title-cased name is meaningless (e.g. "103644278").
        // Leave it empty so the COALESCE in the SQL won't overwrite a real name.
        let name = if board.token.chars().all(|c| c.is_ascii_digit()) {
            String::new()
        } else {
            name
        };
        let provider = AtsProvider::from_str(&board.provider).unwrap_or(AtsProvider::Ashby);
        let website = provider.board_url(&board.token);
        stmts.push(db.prepare(SQL).bind(&[
            board.token.clone().into(),
            name.into(),
            website.into(),
            board.crawl_id.clone().into(),
            board.timestamp.clone().into(),
            board.url.clone().into(),
            board.provider.clone().into(),
        ])?);
    }

    const BATCH_SIZE: usize = 100;
    let mut saved = 0usize;
    for chunk in stmts.chunks(BATCH_SIZE) {
        if let Ok(results) = db.batch(chunk.to_vec()).await {
            saved += results.len();
        }
    }
    Ok(saved)
}

pub async fn save_progress(
    db: &D1Database, crawl_id: &str, total: u32, current: u32, status: &str, found: u32,
) -> Result<()> {
    db.prepare(
        "INSERT INTO crawl_progress (crawl_id,total_pages,current_page,status,boards_found,started_at,updated_at)
         VALUES (?1,?2,?3,?4,?5,datetime('now'),datetime('now'))
         ON CONFLICT(crawl_id) DO UPDATE SET
           total_pages=excluded.total_pages, current_page=excluded.current_page,
           status=excluded.status, boards_found=excluded.boards_found,
           finished_at=CASE WHEN excluded.status='done' THEN datetime('now') ELSE finished_at END,
           updated_at=datetime('now')"
    )
    .bind(&[
        crawl_id.into(),
        (total as f64).into(),
        (current as f64).into(),
        status.into(),
        (found as f64).into(),
    ])?
    .run().await?;
    Ok(())
}

pub async fn get_progress(db: &D1Database, crawl_id: &str) -> Result<Option<(u32,u32,String,u32)>> {
    let r = db
        .prepare("SELECT total_pages,current_page,status,boards_found FROM crawl_progress WHERE crawl_id=?1")
        .bind(&[crawl_id.into()])?
        .first::<serde_json::Value>(None).await?;
    Ok(r.map(|row| (
        row["total_pages"].as_f64().unwrap_or(0.0) as u32,
        row["current_page"].as_f64().unwrap_or(0.0) as u32,
        row["status"].as_str().unwrap_or("pending").to_string(),
        row["boards_found"].as_f64().unwrap_or(0.0) as u32,
    )))
}

/// Fetch the next batch of company slugs for a given provider that have never been synced.
/// Falls back to the oldest-synced ones when all have been synced once.
pub async fn get_company_slugs_by_provider(db: &D1Database, provider: AtsProvider, limit: usize) -> Result<Vec<String>> {
    match provider {
        AtsProvider::Ashby => {
            let rows = db
                .prepare(
                    "SELECT c.key FROM companies c
                     LEFT JOIN ashby_boards ab ON ab.slug = c.key
                     WHERE (c.ats_provider = 'ashby' OR c.ats_provider IS NULL)
                       AND ab.last_synced_at IS NULL
                     ORDER BY c.key
                     LIMIT ?1"
                )
                .bind(&[(limit as f64).into()])?
                .all()
                .await?
                .results::<serde_json::Value>()?;
            Ok(rows.iter()
                .filter_map(|r| r["key"].as_str().map(String::from))
                .collect())
        }
        AtsProvider::Greenhouse => {
            let rows = db
                .prepare(
                    "SELECT c.key FROM companies c
                     LEFT JOIN greenhouse_boards gb ON gb.token = c.key
                     WHERE c.ats_provider = 'greenhouse'
                       AND gb.last_synced_at IS NULL
                     ORDER BY c.key
                     LIMIT ?1"
                )
                .bind(&[(limit as f64).into()])?
                .all()
                .await?
                .results::<serde_json::Value>()?;
            Ok(rows.iter()
                .filter_map(|r| r["key"].as_str().map(String::from))
                .collect())
        }
        AtsProvider::Workable => {
            let rows = db
                .prepare(
                    "SELECT c.key FROM companies c
                     LEFT JOIN workable_boards wb ON wb.shortcode = c.key
                     WHERE c.ats_provider = 'workable'
                       AND wb.last_synced_at IS NULL
                     ORDER BY c.key
                     LIMIT ?1"
                )
                .bind(&[(limit as f64).into()])?
                .all()
                .await?
                .results::<serde_json::Value>()?;
            Ok(rows.iter()
                .filter_map(|r| r["key"].as_str().map(String::from))
                .collect())
        }
    }
}
