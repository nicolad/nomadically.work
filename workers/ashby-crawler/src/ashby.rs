use serde::{Deserialize, Serialize};
use worker::*;
use worker::wasm_bindgen::JsValue;

// ── Ashby Posting API types ──────────────────────────────────────────────────

#[derive(Deserialize, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct AshbyApiAddress {
    #[serde(default)]
    pub postal_address: Option<serde_json::Value>,
}

#[derive(Deserialize, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct AshbyApiSecondaryLocation {
    #[serde(default)]
    pub location: Option<String>,
    #[serde(default)]
    pub address: Option<AshbyApiAddress>,
}

#[derive(Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct AshbyJobPosting {
    pub id: String,
    pub title: String,
    #[serde(default)]
    pub location: Option<String>,
    #[serde(default)]
    pub location_name: Option<String>,
    #[serde(default)]
    pub description_html: Option<String>,
    #[serde(default)]
    pub description_plain: Option<String>,
    #[serde(default)]
    pub job_url: Option<String>,
    #[serde(default)]
    pub apply_url: Option<String>,
    #[serde(default)]
    pub is_remote: Option<bool>,
    #[serde(default)]
    pub is_listed: Option<bool>,
    #[serde(default)]
    pub employment_type: Option<String>,
    #[serde(default)]
    pub department: Option<String>,
    #[serde(default)]
    pub team: Option<String>,
    #[serde(default)]
    pub published_at: Option<String>,
    #[serde(default)]
    pub secondary_locations: Option<Vec<AshbyApiSecondaryLocation>>,
    #[serde(default)]
    pub compensation: Option<serde_json::Value>,
    #[serde(default)]
    pub address: Option<serde_json::Value>,
}

#[derive(Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct AshbyJobBoardResponse {
    #[serde(default)]
    pub title: Option<String>,
    #[serde(default)]
    pub jobs: Vec<AshbyJobPosting>,
}

/// Fetch all job postings from a single Ashby job board.
/// Returns an empty board (not an error) on 404 — board may be inactive.
pub async fn fetch_ashby_board_jobs(slug: &str) -> Result<AshbyJobBoardResponse> {
    let url = format!(
        "https://api.ashbyhq.com/posting-api/job-board/{}?includeCompensation=true",
        slug
    );
    let mut resp = Fetch::Request(Request::new(&url, Method::Get)?).send().await?;
    let status = resp.status_code();
    if status == 404 {
        console_log!("[job-sync:ashby] board '{}' returned 404 — skipping", slug);
        return Ok(AshbyJobBoardResponse { title: None, jobs: vec![] });
    }
    if status != 200 {
        return Err(Error::RustError(format!(
            "Ashby API returned {} for board '{}'", status, slug
        )));
    }
    let text = resp.text().await?;
    serde_json::from_str::<AshbyJobBoardResponse>(&text)
        .map_err(|e| Error::RustError(format!("ashby board parse error for '{}': {}", slug, e)))
}

/// Upsert a batch of Ashby job postings into the D1 `jobs` table.
pub async fn upsert_ashby_jobs_to_d1(
    db: &D1Database,
    jobs: &[AshbyJobPosting],
    slug: &str,
    board_title: &str,
) -> Result<usize> {
    let company_name = if board_title.is_empty() {
        slug.split(|c: char| c == '-' || c == '_')
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
        board_title.to_string()
    };

    const JOB_SQL: &str = "INSERT INTO jobs (
                external_id, source_kind, source_id, company_key, company_name,
                title, url, description, location,
                posted_at,
                workplace_type,
                ashby_department, ashby_team, ashby_employment_type,
                ashby_is_remote, ashby_is_listed, ashby_published_at,
                ashby_job_url, ashby_apply_url,
                ashby_secondary_locations, ashby_compensation, ashby_address,
                categories, ats_created_at, first_published, updated_at
            ) VALUES (
                ?1, 'ashby', ?2, ?3, ?4,
                ?5, ?6, NULLIF(?7,''), NULLIF(?8,''),
                COALESCE(NULLIF(?9,''), datetime('now')),
                NULLIF(?10,''),
                NULLIF(?11,''), NULLIF(?12,''), NULLIF(?13,''),
                ?14, ?15, NULLIF(?9,''),
                NULLIF(?16,''), NULLIF(?17,''),
                NULLIF(?18,''), NULLIF(?19,''), NULLIF(?20,''),
                NULLIF(?21,''), NULLIF(?9,''), NULLIF(?9,''), datetime('now')
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
                workplace_type=COALESCE(excluded.workplace_type, workplace_type),
                ashby_department=excluded.ashby_department,
                ashby_team=excluded.ashby_team,
                ashby_employment_type=excluded.ashby_employment_type,
                ashby_is_remote=excluded.ashby_is_remote,
                ashby_is_listed=excluded.ashby_is_listed,
                ashby_published_at=excluded.ashby_published_at,
                ashby_job_url=excluded.ashby_job_url,
                ashby_apply_url=excluded.ashby_apply_url,
                ashby_secondary_locations=excluded.ashby_secondary_locations,
                ashby_compensation=excluded.ashby_compensation,
                ashby_address=excluded.ashby_address,
                categories=excluded.categories,
                ats_created_at=excluded.ats_created_at,
                first_published=COALESCE(excluded.first_published, first_published),
                updated_at=datetime('now')";

    let mut stmts = Vec::with_capacity(jobs.len() + 2);
    let mut count = 0usize;

    for job in jobs {
        let url = job.job_url.as_deref().or(job.apply_url.as_deref()).unwrap_or("");
        if url.is_empty() {
            console_log!("[job-sync:ashby] skipping job {} (no url) from board {}", job.id, slug);
            continue;
        }

        let description = job.description_html.as_deref()
            .or(job.description_plain.as_deref())
            .unwrap_or("");
        let location = job.location_name.as_deref()
            .or(job.location.as_deref())
            .unwrap_or("");
        let published_at = job.published_at.as_deref().unwrap_or("");
        let workplace_type = match job.is_remote {
            Some(true)  => "remote",
            Some(false) => "office",
            None        => "",
        };
        let department = job.department.as_deref().unwrap_or("");
        let team = job.team.as_deref().unwrap_or("");
        let employment_type = job.employment_type.as_deref().unwrap_or("");
        let job_url = job.job_url.as_deref().unwrap_or("");
        let apply_url = job.apply_url.as_deref().unwrap_or("");

        let secondary_locs_json = job.secondary_locations.as_ref()
            .map(|locs| {
                let v: Vec<serde_json::Value> = locs.iter().map(|l| {
                    serde_json::json!({ "location": l.location, "address": l.address })
                }).collect();
                serde_json::to_string(&v).unwrap_or_default()
            })
            .unwrap_or_default();

        let compensation_json = job.compensation.as_ref()
            .map(|c| serde_json::to_string(c).unwrap_or_default())
            .unwrap_or_default();

        let address_json = job.address.as_ref()
            .map(|a| serde_json::to_string(a).unwrap_or_default())
            .unwrap_or_default();

        let all_locations: Vec<serde_json::Value> = std::iter::once(job.location.as_deref().map(String::from))
            .chain(
                job.secondary_locations.as_ref()
                    .map(|locs| locs.iter().filter_map(|l| l.location.clone()).map(Some).collect::<Vec<_>>())
                    .unwrap_or_default()
                    .into_iter()
            )
            .flatten()
            .map(serde_json::Value::String)
            .collect();

        let categories_json = serde_json::to_string(&serde_json::json!({
            "department": job.department,
            "team": job.team,
            "location": job.location,
            "allLocations": all_locations,
        })).unwrap_or_default();

        let is_remote_val: JsValue = job.is_remote
            .map(|v| JsValue::from_f64(if v { 1.0 } else { 0.0 }))
            .unwrap_or(JsValue::NULL);
        let is_listed_val: JsValue = job.is_listed
            .map(|v| JsValue::from_f64(if v { 1.0 } else { 0.0 }))
            .unwrap_or(JsValue::NULL);

        stmts.push(db.prepare(JOB_SQL).bind(&[
            job.id.clone().into(),        // ?1  external_id
            slug.into(),                   // ?2  source_id
            slug.into(),                   // ?3  company_key
            company_name.clone().into(),   // ?4  company_name
            job.title.clone().into(),      // ?5  title
            url.into(),                    // ?6  url
            description.into(),            // ?7  description
            location.into(),               // ?8  location
            published_at.into(),           // ?9  published_at
            workplace_type.into(),         // ?10 workplace_type
            department.into(),             // ?11 ashby_department
            team.into(),                   // ?12 ashby_team
            employment_type.into(),        // ?13 ashby_employment_type
            is_remote_val,                 // ?14 ashby_is_remote
            is_listed_val,                 // ?15 ashby_is_listed
            job_url.into(),                // ?16 ashby_job_url
            apply_url.into(),              // ?17 ashby_apply_url
            secondary_locs_json.into(),    // ?18 ashby_secondary_locations
            compensation_json.into(),      // ?19 ashby_compensation
            address_json.into(),           // ?20 ashby_address
            categories_json.into(),        // ?21 categories
        ])?);
        count += 1;
    }

    stmts.push(db.prepare(
        "INSERT INTO ashby_boards (slug, url, first_seen, last_seen, crawl_id, last_synced_at, job_count, is_active)
         VALUES (?1, ?2, datetime('now'), datetime('now'), 'job-sync', datetime('now'), ?3, 1)
         ON CONFLICT(slug) DO UPDATE SET
           last_synced_at=datetime('now'),
           job_count=?3,
           is_active=1,
           updated_at=datetime('now')"
    ).bind(&[
        slug.into(),
        format!("https://jobs.ashbyhq.com/{}", slug).into(),
        (count as f64).into(),
    ])?);

    stmts.push(db.prepare("UPDATE companies SET updated_at=datetime('now') WHERE key=?1")
        .bind(&[slug.into()])?);

    const BATCH_SIZE: usize = 100;
    for chunk in stmts.chunks(BATCH_SIZE) {
        let _ = db.batch(chunk.to_vec()).await;
    }

    Ok(count)
}
