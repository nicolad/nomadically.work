/// Shared application context — job title, company, job description.
///
/// Can be fetched from either:
/// - Cloudflare D1 REST API (production, via [`AppContext::from_d1`])
/// - A Next.js GraphQL endpoint (local dev, via [`AppContext::from_graphql`])
///
/// Decouples enhancement logic in `enhance.rs` / `backend.rs` from the
/// data source so the CLI can target any environment without changing
/// the agent code.
use anyhow::{Context, Result};
use serde::Deserialize;
use serde_json::json;

use crate::d1::D1Client;

/// The minimum application fields needed by any enhancement agent.
#[derive(Debug, Clone)]
pub struct AppContext {
    pub app_id: i64,
    pub job_title: String,
    pub company_name: String,
    pub job_description: String,
}

impl AppContext {
    /// Parse the app ID from a URL path like `http://localhost:3000/applications/11`.
    pub fn id_from_url(url: &str) -> Result<i64> {
        url.trim_end_matches('/')
            .rsplit('/')
            .next()
            .context("URL has no path segments")?
            .parse::<i64>()
            .context("Last URL segment is not a valid integer app ID")
    }

    /// Fetch from the D1 REST API (production path).
    pub async fn from_d1(d1: &D1Client, app_id: i64) -> Result<Self> {
        let rows = d1
            .query(
                "SELECT job_title, company_name, job_description FROM applications WHERE id = ?1",
                vec![json!(app_id)],
            )
            .await
            .context("fetching application from D1")?;

        let row = rows.into_iter().next().context("Application not found in D1")?;

        #[derive(Deserialize)]
        struct Row {
            job_title: Option<String>,
            company_name: Option<String>,
            job_description: Option<String>,
        }
        let r: Row = serde_json::from_value(row).context("parsing application row")?;

        Ok(Self {
            app_id,
            job_title: r.job_title.unwrap_or_else(|| "software engineer".into()),
            company_name: r.company_name.unwrap_or_else(|| "the company".into()),
            job_description: r
                .job_description
                .context("No job description on this application")?,
        })
    }

    /// Fetch via the Next.js GraphQL endpoint (local dev path).
    ///
    /// `graphql_url` should be the `/api/graphql` endpoint, e.g.
    /// `http://localhost:3000/api/graphql`.
    pub async fn from_graphql(http: &reqwest::Client, graphql_url: &str, app_id: i64) -> Result<Self> {
        let query = json!({
            "query": "query GetApplicationCtx($id: Int!) { application(id: $id) { jobTitle companyName jobDescription } }",
            "variables": { "id": app_id }
        });

        let resp: serde_json::Value = http
            .post(graphql_url)
            .json(&query)
            .send()
            .await
            .context("GraphQL request failed")?
            .error_for_status()
            .context("GraphQL endpoint returned an error")?
            .json()
            .await
            .context("parsing GraphQL response")?;

        if let Some(errors) = resp["errors"].as_array() {
            if !errors.is_empty() {
                anyhow::bail!("GraphQL errors: {:?}", errors);
            }
        }

        let app = &resp["data"]["application"];
        Ok(Self {
            app_id,
            job_title: app["jobTitle"]
                .as_str()
                .unwrap_or("software engineer")
                .to_string(),
            company_name: app["companyName"]
                .as_str()
                .unwrap_or("the company")
                .to_string(),
            job_description: app["jobDescription"]
                .as_str()
                .context("No jobDescription in GraphQL response")?
                .to_string(),
        })
    }

    /// Strip HTML tags and truncate to `max_chars` — identical stripping
    /// used in `enhance.rs` and `backend.rs`.
    pub fn plain_job_description(&self, max_chars: usize) -> String {
        let plain = self
            .job_description
            .replace('<', " <")
            .split('<')
            .map(|s| {
                if let Some(idx) = s.find('>') {
                    &s[idx + 1..]
                } else {
                    s
                }
            })
            .collect::<Vec<_>>()
            .join(" ")
            .split_whitespace()
            .collect::<Vec<_>>()
            .join(" ");
        if plain.len() > max_chars {
            plain[..max_chars].to_string()
        } else {
            plain
        }
    }

    /// Build the shared job context string used as `{ctx}` in section prompts.
    pub fn job_ctx(&self) -> String {
        let desc = self.plain_job_description(8000);
        format!(
            "Role: {} at {}\n\nJob Description:\n{}",
            self.job_title, self.company_name, desc
        )
    }
}

/// Parse a GraphQL API URL from a browser-facing application URL.
///
/// `http://localhost:3000/applications/11` → `http://localhost:3000/api/graphql`
pub fn graphql_url_from_app_url(app_url: &str) -> String {
    // Strip path and append /api/graphql
    if let Ok(mut parsed) = url::Url::parse(app_url) {
        parsed.set_path("/api/graphql");
        parsed.set_query(None);
        return parsed.to_string();
    }
    // Fallback: strip everything after the origin manually
    let origin_end = app_url
        .find("://")
        .and_then(|i| app_url[i + 3..].find('/').map(|j| i + 3 + j))
        .unwrap_or(app_url.len());
    format!("{}/api/graphql", &app_url[..origin_end])
}
