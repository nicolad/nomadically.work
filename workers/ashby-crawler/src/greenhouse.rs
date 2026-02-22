use serde::{Deserialize, Serialize};
use worker::*;

// ═══════════════════════════════════════════════════════════════════════════
// Greenhouse Job Board API v1 types
// ═══════════════════════════════════════════════════════════════════════════

#[derive(Deserialize, Clone, Debug)]
pub struct GreenhouseLocation {
    #[serde(default)]
    pub name: Option<String>,
}

#[derive(Deserialize, Serialize, Clone, Debug)]
pub struct GreenhouseDepartment {
    #[serde(default)]
    pub id: Option<u64>,
    #[serde(default)]
    pub name: Option<String>,
}

#[derive(Deserialize, Serialize, Clone, Debug)]
pub struct GreenhouseOffice {
    #[serde(default)]
    pub id: Option<u64>,
    #[serde(default)]
    pub name: Option<String>,
    #[serde(default)]
    pub location: Option<String>,
}

#[derive(Deserialize, Serialize, Clone, Debug)]
pub struct GreenhouseMetadataField {
    #[serde(default)]
    pub id: Option<u64>,
    #[serde(default)]
    pub name: Option<String>,
    #[serde(default)]
    pub value: Option<serde_json::Value>,
    #[serde(default)]
    pub value_type: Option<String>,
}

#[derive(Deserialize, Clone, Debug)]
pub struct GreenhouseJob {
    pub id: u64,
    #[serde(default)]
    pub internal_job_id: Option<u64>,
    pub title: String,
    #[serde(default)]
    pub absolute_url: Option<String>,
    #[serde(default)]
    pub updated_at: Option<String>,
    #[serde(default)]
    pub requisition_id: Option<String>,
    #[serde(default)]
    pub content: Option<String>,
    #[serde(default)]
    pub location: Option<GreenhouseLocation>,
    #[serde(default)]
    pub departments: Option<Vec<GreenhouseDepartment>>,
    #[serde(default)]
    pub offices: Option<Vec<GreenhouseOffice>>,
    #[serde(default)]
    pub metadata: Option<Vec<GreenhouseMetadataField>>,
    #[serde(default)]
    pub data_compliance: Option<Vec<serde_json::Value>>,
}

#[derive(Deserialize, Clone, Debug)]
pub struct GreenhouseBoardResponse {
    #[serde(default)]
    pub name: Option<String>,
    #[serde(default)]
    pub jobs: Vec<GreenhouseJob>,
}

// ═══════════════════════════════════════════════════════════════════════════
// FETCH
// ═══════════════════════════════════════════════════════════════════════════

/// Fetch all jobs from a Greenhouse board via the public Job Board API v1.
/// Returns empty (not error) on 404.
pub async fn fetch_greenhouse_board_jobs(token: &str) -> Result<GreenhouseBoardResponse> {
    let url = format!(
        "https://boards-api.greenhouse.io/v1/boards/{}/jobs?content=true",
        token
    );
    let mut resp = Fetch::Request(Request::new(&url, Method::Get)?).send().await?;
    let status = resp.status_code();
    if status == 404 {
        console_log!("[job-sync:greenhouse] board '{}' returned 404 — skipping", token);
        return Ok(GreenhouseBoardResponse { name: None, jobs: vec![] });
    }
    if status != 200 {
        return Err(Error::RustError(format!(
            "Greenhouse API returned {} for board '{}'", status, token
        )));
    }
    let text = resp.text().await?;
    serde_json::from_str::<GreenhouseBoardResponse>(&text)
        .map_err(|e| Error::RustError(format!("greenhouse board parse error for '{}': {}", token, e)))
}

// ═══════════════════════════════════════════════════════════════════════════
// UPSERT
// ═══════════════════════════════════════════════════════════════════════════

/// Upsert Greenhouse jobs into D1 `jobs` table.
/// External ID = `absolute_url` so that `extractJobSlug` can derive the numeric
/// job-post ID for the Greenhouse API (enhance, classify, etc.).
pub async fn upsert_greenhouse_jobs_to_d1(
    db: &D1Database,
    jobs: &[GreenhouseJob],
    token: &str,
    board_name: &str,
) -> Result<usize> {
    let company_name = if board_name.is_empty() {
        token.split(|c: char| c == '-' || c == '_')
            .map(|w| {
                let mut chars = w.chars();
                match chars.next() {
                    None => String::new(),
                    Some(c) => c.to_uppercase().to_string() + chars.as_str(),
                }
            })
            .collect::<Vec<_>>()
            .join(" ")
    } else {
        board_name.to_string()
    };

    // Maps to Greenhouse-specific columns in the jobs table (schema.ts lines 86-100)
    const JOB_SQL: &str = "INSERT INTO jobs (
                external_id, source_kind, source_id, company_key, company_name,
                title, url, description, location,
                posted_at,
                absolute_url, internal_job_id, requisition_id,
                departments, offices, metadata, data_compliance,
                ats_created_at, updated_at
            ) VALUES (
                ?1, 'greenhouse', ?2, ?3, ?4,
                ?5, ?6, NULLIF(?7,''), NULLIF(?8,''),
                COALESCE(NULLIF(?9,''), datetime('now')),
                NULLIF(?10,''), ?11, NULLIF(?12,''),
                NULLIF(?13,''), NULLIF(?14,''), NULLIF(?15,''), NULLIF(?16,''),
                NULLIF(?9,''), datetime('now')
            )
            ON CONFLICT(external_id) DO UPDATE SET
                source_id=excluded.source_id,
                company_key=excluded.company_key,
                company_name=COALESCE(excluded.company_name, company_name),
                title=excluded.title,
                url=excluded.url,
                description=COALESCE(excluded.description, description),
                location=COALESCE(excluded.location, location),
                posted_at=COALESCE(excluded.posted_at, posted_at),
                absolute_url=COALESCE(excluded.absolute_url, absolute_url),
                internal_job_id=COALESCE(excluded.internal_job_id, internal_job_id),
                requisition_id=COALESCE(excluded.requisition_id, requisition_id),
                departments=excluded.departments,
                offices=excluded.offices,
                metadata=excluded.metadata,
                data_compliance=excluded.data_compliance,
                ats_created_at=excluded.ats_created_at,
                updated_at=datetime('now')";

    let mut stmts = Vec::with_capacity(jobs.len() + 2);
    let mut count = 0usize;

    for job in jobs {
        let url = job.absolute_url.as_deref().unwrap_or("");
        if url.is_empty() {
            console_log!("[job-sync:greenhouse] skipping job {} (no url) from board {}", job.id, token);
            continue;
        }
        // Use absolute_url (sans query string) as external_id so extractJobSlug
        // extracts the numeric job-post ID (last path segment).
        let external_id = url.split('?').next().unwrap_or(url).to_string();

        let description = job.content.as_deref().unwrap_or("");
        let location = job.location.as_ref()
            .and_then(|l| l.name.as_deref())
            .unwrap_or("");
        let updated_at = job.updated_at.as_deref().unwrap_or("");

        let departments_json = job.departments.as_ref()
            .map(|d| serde_json::to_string(d).unwrap_or_default())
            .unwrap_or_default();
        let offices_json = job.offices.as_ref()
            .map(|o| serde_json::to_string(o).unwrap_or_default())
            .unwrap_or_default();
        let metadata_json = job.metadata.as_ref()
            .map(|m| serde_json::to_string(m).unwrap_or_default())
            .unwrap_or_default();
        let data_compliance_json = job.data_compliance.as_ref()
            .map(|d| serde_json::to_string(d).unwrap_or_default())
            .unwrap_or_default();

        // internal_job_id → f64 for D1 binding (NULL if not present)
        let internal_job_id_val: worker::wasm_bindgen::JsValue = job.internal_job_id
            .map(|v| worker::wasm_bindgen::JsValue::from_f64(v as f64))
            .unwrap_or(worker::wasm_bindgen::JsValue::NULL);

        stmts.push(db.prepare(JOB_SQL).bind(&[
            external_id.into(),            // ?1  external_id
            token.into(),                   // ?2  source_id
            token.into(),                   // ?3  company_key
            company_name.clone().into(),    // ?4  company_name
            job.title.clone().into(),       // ?5  title
            url.into(),                     // ?6  url
            description.into(),             // ?7  description
            location.into(),                // ?8  location
            updated_at.into(),              // ?9  posted_at / ats_created_at
            url.into(),                     // ?10 absolute_url
            internal_job_id_val,            // ?11 internal_job_id
            job.requisition_id.as_deref().unwrap_or("").into(), // ?12 requisition_id
            departments_json.into(),        // ?13 departments
            offices_json.into(),            // ?14 offices
            metadata_json.into(),           // ?15 metadata
            data_compliance_json.into(),    // ?16 data_compliance
        ])?);
        count += 1;
    }

    // Track in greenhouse_boards table
    stmts.push(db.prepare(
        "INSERT INTO greenhouse_boards (token, url, first_seen, last_seen, crawl_id, last_synced_at, job_count, is_active)
         VALUES (?1, ?2, datetime('now'), datetime('now'), 'job-sync', datetime('now'), ?3, 1)
         ON CONFLICT(token) DO UPDATE SET
           last_synced_at=datetime('now'),
           job_count=?3,
           is_active=1,
           updated_at=datetime('now')"
    ).bind(&[
        token.into(),
        format!("https://job-boards.greenhouse.io/{}", token).into(),
        (count as f64).into(),
    ])?);

    // Update company name from the board API response when we only have a numeric token or empty name
    if !company_name.is_empty() {
        stmts.push(db.prepare(
            "UPDATE companies SET name=?1, updated_at=datetime('now') WHERE key=?2 AND (name IS NULL OR name='' OR name=key)"
        ).bind(&[
            company_name.clone().into(),
            token.into(),
        ])?);
    } else {
        stmts.push(db.prepare("UPDATE companies SET updated_at=datetime('now') WHERE key=?1")
            .bind(&[token.into()])?);
    }

    const BATCH_SIZE: usize = 100;
    for chunk in stmts.chunks(BATCH_SIZE) {
        let _ = db.batch(chunk.to_vec()).await;
    }

    Ok(count)
}
