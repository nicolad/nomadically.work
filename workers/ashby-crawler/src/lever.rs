use serde::{Deserialize, Serialize};
use worker::*;

// ═══════════════════════════════════════════════════════════════════════════
// Lever Postings API v0 types
// ═══════════════════════════════════════════════════════════════════════════

#[derive(Deserialize, Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct LeverCategories {
    #[serde(default)]
    pub location: Option<String>,
    #[serde(default)]
    pub commitment: Option<String>,
    #[serde(default)]
    pub team: Option<String>,
    #[serde(default)]
    pub department: Option<String>,
    #[serde(default)]
    pub all_locations: Option<Vec<String>>,
}

#[derive(Deserialize, Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct LeverSalaryRange {
    #[serde(default)]
    pub currency: Option<String>,
    #[serde(default)]
    pub interval: Option<String>,
    #[serde(default)]
    pub min: Option<f64>,
    #[serde(default)]
    pub max: Option<f64>,
}

#[derive(Deserialize, Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct LeverList {
    #[serde(default)]
    pub text: Option<String>,
    #[serde(default)]
    pub content: Option<String>,
}

#[derive(Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct LeverPosting {
    pub id: String,
    /// Job title
    pub text: String,
    #[serde(default)]
    pub categories: Option<LeverCategories>,
    #[serde(default)]
    pub country: Option<String>,
    /// Combined description (HTML)
    #[serde(default)]
    pub description: Option<String>,
    /// Combined description (plaintext)
    #[serde(default)]
    pub description_plain: Option<String>,
    /// Description body without opening (HTML)
    #[serde(default)]
    pub description_body: Option<String>,
    /// Description body without opening (plaintext)
    #[serde(default)]
    pub description_body_plain: Option<String>,
    /// Opening section (HTML)
    #[serde(default)]
    pub opening: Option<String>,
    /// Opening section (plaintext)
    #[serde(default)]
    pub opening_plain: Option<String>,
    /// Closing content (HTML)
    #[serde(default)]
    pub additional: Option<String>,
    /// Closing content (plaintext)
    #[serde(default)]
    pub additional_plain: Option<String>,
    #[serde(default)]
    pub lists: Option<Vec<LeverList>>,
    /// Hosted job page URL
    #[serde(default)]
    pub hosted_url: Option<String>,
    /// Application form URL
    #[serde(default)]
    pub apply_url: Option<String>,
    /// on-site, remote, hybrid, unspecified
    #[serde(default)]
    pub workplace_type: Option<String>,
    #[serde(default)]
    pub salary_range: Option<LeverSalaryRange>,
    /// Unix timestamp in milliseconds
    #[serde(default)]
    pub created_at: Option<f64>,
}

// ═══════════════════════════════════════════════════════════════════════════
// FETCH
// ═══════════════════════════════════════════════════════════════════════════

/// Fetch all postings from a Lever site via the public Postings API v0.
/// Returns empty (not error) on 404.
pub async fn fetch_lever_board_jobs(site: &str) -> Result<Vec<LeverPosting>> {
    let url = format!(
        "https://api.lever.co/v0/postings/{}?mode=json",
        site
    );
    let mut resp = Fetch::Request(Request::new(&url, Method::Get)?).send().await?;
    let status = resp.status_code();
    if status == 404 {
        console_log!("[job-sync:lever] site '{}' returned 404 — skipping", site);
        return Ok(vec![]);
    }
    if status != 200 {
        return Err(Error::RustError(format!(
            "Lever API returned {} for site '{}'", status, site
        )));
    }
    let text = resp.text().await?;
    serde_json::from_str::<Vec<LeverPosting>>(&text)
        .map_err(|e| Error::RustError(format!("lever site parse error for '{}': {}", site, e)))
}

// ═══════════════════════════════════════════════════════════════════════════
// UPSERT
// ═══════════════════════════════════════════════════════════════════════════

/// Upsert Lever postings into D1 `jobs` table.
/// External ID = `hostedUrl` (canonical URL, same pattern as Greenhouse).
pub async fn upsert_lever_jobs_to_d1(
    db: &D1Database,
    postings: &[LeverPosting],
    site: &str,
) -> Result<usize> {
    let company_name: String = site
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

    // Maps to Lever-specific columns in the jobs table (schema.ts lines 102-112)
    const JOB_SQL: &str = "INSERT INTO jobs (
                external_id, source_kind, source_id, company_key, company_name,
                title, url, description, location,
                posted_at,
                categories, workplace_type, country,
                opening, opening_plain,
                description_body, description_body_plain,
                additional, additional_plain,
                lists, ats_created_at, updated_at
            ) VALUES (
                ?1, 'lever', ?2, ?3, ?4,
                ?5, ?6, NULLIF(?7,''), NULLIF(?8,''),
                COALESCE(NULLIF(?9,''), datetime('now')),
                NULLIF(?10,''), NULLIF(?11,''), NULLIF(?12,''),
                NULLIF(?13,''), NULLIF(?14,''),
                NULLIF(?15,''), NULLIF(?16,''),
                NULLIF(?17,''), NULLIF(?18,''),
                NULLIF(?19,''), NULLIF(?9,''), datetime('now')
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
                categories=excluded.categories,
                workplace_type=COALESCE(excluded.workplace_type, workplace_type),
                country=COALESCE(excluded.country, country),
                opening=COALESCE(excluded.opening, opening),
                opening_plain=COALESCE(excluded.opening_plain, opening_plain),
                description_body=COALESCE(excluded.description_body, description_body),
                description_body_plain=COALESCE(excluded.description_body_plain, description_body_plain),
                additional=COALESCE(excluded.additional, additional),
                additional_plain=COALESCE(excluded.additional_plain, additional_plain),
                lists=excluded.lists,
                ats_created_at=excluded.ats_created_at,
                updated_at=datetime('now')";

    let mut stmts = Vec::with_capacity(postings.len() + 2);
    let mut count = 0usize;

    for posting in postings {
        let url = posting.hosted_url.as_deref().unwrap_or("");
        if url.is_empty() {
            console_log!("[job-sync:lever] skipping posting {} (no hostedUrl) from site {}", posting.id, site);
            continue;
        }
        let external_id = url.to_string();

        let description = posting.description.as_deref().unwrap_or("");
        let location = posting.categories.as_ref()
            .and_then(|c| c.location.as_deref())
            .unwrap_or("");

        // Convert createdAt (unix ms) to ISO 8601 without chrono dependency
        let created_at_iso = posting.created_at
            .map(|ms| {
                let secs = (ms / 1000.0) as i64;
                // Use simple arithmetic — good enough for dates 2000-2099
                let days_since_epoch = secs / 86400;
                let time_of_day = secs % 86400;
                let hours = time_of_day / 3600;
                let minutes = (time_of_day % 3600) / 60;
                let seconds = time_of_day % 60;

                // Days since 1970-01-01 to Y-M-D (simplified Gregorian)
                let mut remaining = days_since_epoch;
                let mut year = 1970i64;
                loop {
                    let days_in_year = if year % 4 == 0 && (year % 100 != 0 || year % 400 == 0) { 366 } else { 365 };
                    if remaining < days_in_year { break; }
                    remaining -= days_in_year;
                    year += 1;
                }
                let leap = year % 4 == 0 && (year % 100 != 0 || year % 400 == 0);
                let month_days: [i64; 12] = [31, if leap { 29 } else { 28 }, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
                let mut month = 0usize;
                for (i, &d) in month_days.iter().enumerate() {
                    if remaining < d { month = i; break; }
                    remaining -= d;
                }
                let day = remaining + 1;
                format!("{:04}-{:02}-{:02}T{:02}:{:02}:{:02}Z", year, month + 1, day, hours, minutes, seconds)
            })
            .unwrap_or_default();

        let categories_json = posting.categories.as_ref()
            .map(|c| serde_json::to_string(c).unwrap_or_default())
            .unwrap_or_default();
        let lists_json = posting.lists.as_ref()
            .map(|l| serde_json::to_string(l).unwrap_or_default())
            .unwrap_or_default();

        stmts.push(db.prepare(JOB_SQL).bind(&[
            external_id.into(),                                         // ?1  external_id
            site.into(),                                                // ?2  source_id
            site.into(),                                                // ?3  company_key
            company_name.clone().into(),                                // ?4  company_name
            posting.text.clone().into(),                                // ?5  title
            url.into(),                                                 // ?6  url
            description.into(),                                         // ?7  description
            location.into(),                                            // ?8  location
            created_at_iso.into(),                                      // ?9  posted_at / ats_created_at
            categories_json.into(),                                     // ?10 categories
            posting.workplace_type.as_deref().unwrap_or("").into(),     // ?11 workplace_type
            posting.country.as_deref().unwrap_or("").into(),            // ?12 country
            posting.opening.as_deref().unwrap_or("").into(),            // ?13 opening
            posting.opening_plain.as_deref().unwrap_or("").into(),      // ?14 opening_plain
            posting.description_body.as_deref().unwrap_or("").into(),   // ?15 description_body
            posting.description_body_plain.as_deref().unwrap_or("").into(), // ?16 description_body_plain
            posting.additional.as_deref().unwrap_or("").into(),         // ?17 additional
            posting.additional_plain.as_deref().unwrap_or("").into(),   // ?18 additional_plain
            lists_json.into(),                                          // ?19 lists
        ])?);
        count += 1;
    }

    // Track in lever_boards table
    stmts.push(db.prepare(
        "INSERT INTO lever_boards (site, url, first_seen, last_seen, crawl_id, last_synced_at, job_count, is_active)
         VALUES (?1, ?2, datetime('now'), datetime('now'), 'job-sync', datetime('now'), ?3, 1)
         ON CONFLICT(site) DO UPDATE SET
           last_synced_at=datetime('now'),
           job_count=?3,
           is_active=1,
           updated_at=datetime('now')"
    ).bind(&[
        site.into(),
        format!("https://jobs.lever.co/{}", site).into(),
        (count as f64).into(),
    ])?);

    // Update company name when we only have a slug or empty name
    if !company_name.is_empty() {
        stmts.push(db.prepare(
            "UPDATE companies SET name=?1, updated_at=datetime('now') WHERE key=?2 AND (name IS NULL OR name='' OR name=key)"
        ).bind(&[
            company_name.clone().into(),
            site.into(),
        ])?);
    } else {
        stmts.push(db.prepare("UPDATE companies SET updated_at=datetime('now') WHERE key=?1")
            .bind(&[site.into()])?);
    }

    const BATCH_SIZE: usize = 100;
    for chunk in stmts.chunks(BATCH_SIZE) {
        let _ = db.batch(chunk.to_vec()).await;
    }

    Ok(count)
}
