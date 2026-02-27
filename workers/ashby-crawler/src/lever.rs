use serde::{Deserialize, Serialize};
use worker::*;

#[derive(Deserialize, Serialize, Clone, Debug, Default)]
#[serde(rename_all = "camelCase")]
pub struct LeverCategories {
    #[serde(default)]
    pub location: Option<String>,
    #[serde(default)]
    pub team: Option<String>,
    #[serde(default)]
    pub commitment: Option<String>,
    #[serde(default)]
    pub department: Option<String>,
    #[serde(default)]
    pub all_locations: Option<Vec<String>>,
}

#[derive(Deserialize, Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct LeverList {
    #[serde(default)]
    pub text: Option<String>,
    #[serde(default)]
    pub content: Option<Vec<String>>,
}

#[derive(Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct LeverPosting {
    pub id: String,
    /// The posting text (job title) — also used as company_name in DB
    #[serde(default)]
    pub text: Option<String>,
    #[serde(default)]
    pub hosted_url: Option<String>,
    #[serde(default)]
    pub apply_url: Option<String>,
    #[serde(default)]
    pub description: Option<String>,
    #[serde(default)]
    pub description_plain: Option<String>,
    #[serde(default)]
    pub description_body: Option<String>,
    #[serde(default)]
    pub description_body_plain: Option<String>,
    #[serde(default)]
    pub additional: Option<String>,
    #[serde(default)]
    pub additional_plain: Option<String>,
    #[serde(default)]
    pub categories: Option<LeverCategories>,
    #[serde(default)]
    pub lists: Option<Vec<LeverList>>,
    #[serde(default)]
    pub workplace_type: Option<String>,
    #[serde(default)]
    pub country: Option<String>,
    #[serde(default)]
    pub created_at: Option<i64>,  // ms since epoch
    #[serde(default)]
    pub opening: Option<serde_json::Value>,
    #[serde(default)]
    pub opening_plain: Option<String>,
}

/// Fetch a single Lever posting — tries global endpoint first, then EU fallback on 404.
pub async fn fetch_lever_single_job(site: &str, posting_id: &str) -> Result<LeverPosting> {
    let global_url = format!("https://api.lever.co/v0/postings/{}/{}", site, posting_id);
    let eu_url    = format!("https://api.eu.lever.co/v0/postings/{}/{}", site, posting_id);

    for url in &[global_url, eu_url] {
        let mut resp = Fetch::Request(Request::new(url.as_str(), Method::Get)?).send().await?;
        let status = resp.status_code();
        if status == 404 {
            continue;  // try EU fallback
        }
        if status != 200 {
            return Err(Error::RustError(format!(
                "Lever API returned {} for {}/{}", status, site, posting_id
            )));
        }
        let text = resp.text().await?;
        return serde_json::from_str::<LeverPosting>(&text)
            .map_err(|e| Error::RustError(format!("lever parse error for {}/{}: {}", site, posting_id, e)));
    }
    Err(Error::RustError(format!("Lever posting {}/{} not found (global & EU)", site, posting_id)))
}
