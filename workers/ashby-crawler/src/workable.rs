use serde::{Deserialize, Serialize};
use worker::*;

// ═══════════════════════════════════════════════════════════════════════════
// Workable Widget API v1 types
// ═══════════════════════════════════════════════════════════════════════════

#[derive(Deserialize, Serialize, Clone, Debug)]
pub struct WorkableLocation {
    #[serde(default)]
    pub country: Option<String>,
    #[serde(default, rename = "countryCode")]
    pub country_code: Option<String>,
    #[serde(default)]
    pub city: Option<String>,
    #[serde(default)]
    pub region: Option<String>,
    #[serde(default)]
    pub hidden: Option<bool>,
}

#[derive(Deserialize, Clone, Debug)]
pub struct WorkableJob {
    #[serde(default)]
    pub shortcode: Option<String>,
    pub title: String,
    #[serde(default)]
    pub code: Option<String>,
    #[serde(default)]
    pub employment_type: Option<String>,
    #[serde(default)]
    pub telecommuting: Option<bool>,
    #[serde(default)]
    pub department: Option<String>,
    #[serde(default)]
    pub url: Option<String>,
    #[serde(default)]
    pub application_url: Option<String>,
    #[serde(default)]
    pub published_on: Option<String>,
    #[serde(default)]
    pub created_at: Option<String>,
    #[serde(default)]
    pub country: Option<String>,
    #[serde(default)]
    pub city: Option<String>,
    #[serde(default)]
    pub state: Option<String>,
    #[serde(default)]
    pub education: Option<String>,
    #[serde(default)]
    pub experience: Option<String>,
    #[serde(default)]
    pub function: Option<String>,
    #[serde(default)]
    pub industry: Option<String>,
    #[serde(default)]
    pub locations: Option<Vec<WorkableLocation>>,
}

#[derive(Deserialize, Clone, Debug)]
pub struct WorkableBoardResponse {
    #[serde(default)]
    pub name: Option<String>,
    #[serde(default)]
    pub description: Option<String>,
    #[serde(default)]
    pub jobs: Vec<WorkableJob>,
}

// ═══════════════════════════════════════════════════════════════════════════
// FETCH
// ═══════════════════════════════════════════════════════════════════════════

/// Fetch all jobs from a Workable account via the Widget API v1.
/// Returns empty (not error) on 404.
pub async fn fetch_workable_board_jobs(shortcode: &str) -> Result<WorkableBoardResponse> {
    let url = format!(
        "https://apply.workable.com/api/v1/widget/accounts/{}",
        shortcode
    );
    let mut resp = Fetch::Request(Request::new(&url, Method::Get)?).send().await?;
    let status = resp.status_code();
    if status == 404 {
        console_log!("[job-sync:workable] account '{}' returned 404 — skipping", shortcode);
        return Ok(WorkableBoardResponse { name: None, description: None, jobs: vec![] });
    }
    if status != 200 {
        return Err(Error::RustError(format!(
            "Workable API returned {} for account '{}'", status, shortcode
        )));
    }
    let text = resp.text().await?;
    serde_json::from_str::<WorkableBoardResponse>(&text)
        .map_err(|e| Error::RustError(format!("workable account parse error for '{}': {}", shortcode, e)))
}

// ═══════════════════════════════════════════════════════════════════════════
// UPSERT
// ═══════════════════════════════════════════════════════════════════════════

/// Upsert Workable jobs into D1 `jobs` table.
/// External ID = job `url` (canonical `https://apply.workable.com/j/{shortcode}`).
/// `telecommuting: true` → `workplace_type = 'remote'`.
pub async fn upsert_workable_jobs_to_d1(
    db: &D1Database,
    response: &WorkableBoardResponse,
    shortcode: &str,
) -> Result<usize> {
    let company_name = response.name.as_deref().unwrap_or("");
    // Fallback: title-case the shortcode if the API didn't return a name
    let company_name_owned: String;
    let company_name = if company_name.is_empty() {
        company_name_owned = shortcode
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
        &company_name_owned
    } else {
        company_name
    };

    const JOB_SQL: &str = "INSERT INTO jobs (
                external_id, source_kind, source_id, company_key, company_name,
                title, url, location, country,
                posted_at,
                categories, workplace_type,
                departments, ats_created_at, updated_at
            ) VALUES (
                ?1, 'workable', ?2, ?3, ?4,
                ?5, ?6, NULLIF(?7,''), NULLIF(?8,''),
                COALESCE(NULLIF(?9,''), datetime('now')),
                NULLIF(?10,''), NULLIF(?11,''),
                NULLIF(?12,''), NULLIF(?9,''), datetime('now')
            )
            ON CONFLICT(external_id) DO UPDATE SET
                source_id=excluded.source_id,
                company_key=excluded.company_key,
                company_name=COALESCE(excluded.company_name, company_name),
                title=excluded.title,
                url=excluded.url,
                location=COALESCE(excluded.location, location),
                country=COALESCE(excluded.country, country),
                posted_at=COALESCE(excluded.posted_at, posted_at),
                categories=excluded.categories,
                workplace_type=COALESCE(excluded.workplace_type, workplace_type),
                departments=excluded.departments,
                ats_created_at=excluded.ats_created_at,
                updated_at=datetime('now')";

    let mut stmts = Vec::with_capacity(response.jobs.len() + 2);
    let mut count = 0usize;

    for job in &response.jobs {
        let url = job.url.as_deref().unwrap_or("");
        if url.is_empty() {
            console_log!("[job-sync:workable] skipping job '{}' (no url) from account {}", job.title, shortcode);
            continue;
        }
        let external_id = url.to_string();

        // Build location string from city + country
        let location = match (job.city.as_deref(), job.country.as_deref()) {
            (Some(city), Some(country)) if !city.is_empty() && !country.is_empty() => format!("{}, {}", city, country),
            (Some(city), _) if !city.is_empty() => city.to_string(),
            (_, Some(country)) if !country.is_empty() => country.to_string(),
            _ => String::new(),
        };

        let workplace_type = if job.telecommuting.unwrap_or(false) {
            "remote"
        } else {
            "on-site"
        };

        let posted_at = job.published_on.as_deref()
            .or(job.created_at.as_deref())
            .unwrap_or("");

        // Store employment_type, experience, function, industry as JSON categories
        let categories_json = serde_json::to_string(&serde_json::json!({
            "employment_type": job.employment_type,
            "experience": job.experience,
            "function": job.function,
            "industry": job.industry,
            "education": job.education,
        })).unwrap_or_default();

        let department = job.department.as_deref().unwrap_or("");

        stmts.push(db.prepare(JOB_SQL).bind(&[
            external_id.into(),                     // ?1  external_id
            shortcode.into(),                       // ?2  source_id
            shortcode.into(),                       // ?3  company_key
            company_name.to_string().into(),        // ?4  company_name
            job.title.clone().into(),               // ?5  title
            url.into(),                             // ?6  url
            location.into(),                        // ?7  location
            job.country.as_deref().unwrap_or("").into(), // ?8  country
            posted_at.into(),                       // ?9  posted_at / ats_created_at
            categories_json.into(),                 // ?10 categories
            workplace_type.into(),                  // ?11 workplace_type
            department.into(),                      // ?12 departments
        ])?);
        count += 1;
    }

    // Track in workable_boards table
    stmts.push(db.prepare(
        "INSERT INTO workable_boards (shortcode, url, first_seen, last_seen, crawl_id, last_synced_at, job_count, is_active)
         VALUES (?1, ?2, datetime('now'), datetime('now'), 'job-sync', datetime('now'), ?3, 1)
         ON CONFLICT(shortcode) DO UPDATE SET
           last_synced_at=datetime('now'),
           job_count=?3,
           is_active=1,
           updated_at=datetime('now')"
    ).bind(&[
        shortcode.into(),
        format!("https://apply.workable.com/{}", shortcode).into(),
        (count as f64).into(),
    ])?);

    // Update company name from the API response
    if !company_name.is_empty() {
        stmts.push(db.prepare(
            "UPDATE companies SET name=?1, updated_at=datetime('now') WHERE key=?2 AND (name IS NULL OR name='' OR name=key)"
        ).bind(&[
            company_name.to_string().into(),
            shortcode.into(),
        ])?);
    } else {
        stmts.push(db.prepare("UPDATE companies SET updated_at=datetime('now') WHERE key=?1")
            .bind(&[shortcode.into()])?);
    }

    const BATCH_SIZE: usize = 100;
    for chunk in stmts.chunks(BATCH_SIZE) {
        let _ = db.batch(chunk.to_vec()).await;
    }

    Ok(count)
}
