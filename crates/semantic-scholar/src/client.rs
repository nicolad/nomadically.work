use std::time::Duration;

use tokio::time::sleep;

use crate::{
    error::Error,
    types::{
        BulkSearchResponse, CitationsResponse, Paper, RecommendationsResponse, ReferencesResponse,
        SearchResponse,
    },
};

const BASE_URL: &str = "https://api.semanticscholar.org";
const MAX_RETRIES: u32 = 3;

/// Async client for the Semantic Scholar Academic Graph, Recommendations, and Datasets APIs.
///
/// Without an API key requests share the unauthenticated rate-limit pool. With a free
/// key (`x-api-key` header) you get 1 req/s dedicated. Set the `SEMANTIC_SCHOLAR_API_KEY`
/// env var or pass it to [`SemanticScholarClient::new`].
#[derive(Clone)]
pub struct SemanticScholarClient {
    http: reqwest::Client,
}

impl SemanticScholarClient {
    pub fn new(api_key: Option<&str>) -> Self {
        let mut headers = reqwest::header::HeaderMap::new();
        if let Some(key) = api_key {
            if let Ok(val) = reqwest::header::HeaderValue::from_str(key) {
                headers.insert("x-api-key", val);
            }
        }
        let http = reqwest::Client::builder()
            .default_headers(headers)
            .timeout(Duration::from_secs(30))
            .build()
            .expect("failed to build reqwest client");
        Self { http }
    }

    /// Low-level GET with exponential-backoff retry on 429.
    async fn get_json(
        &self,
        url: &str,
        params: Vec<(String, String)>,
    ) -> Result<serde_json::Value, Error> {
        let mut retries = 0u32;
        loop {
            let resp = self.http.get(url).query(&params).send().await?;
            let status = resp.status();

            if status.as_u16() == 429 {
                if retries >= MAX_RETRIES {
                    return Err(Error::RateLimited {
                        retry_after: 2u64.pow(retries),
                    });
                }
                let wait_secs = 2u64.pow(retries);
                tracing::warn!(
                    retries,
                    wait_secs,
                    "Semantic Scholar rate limited (429), backing off"
                );
                sleep(Duration::from_secs(wait_secs)).await;
                retries += 1;
                continue;
            }

            if !status.is_success() {
                let message = resp.text().await.unwrap_or_default();
                return Err(Error::Api {
                    status: status.as_u16(),
                    message,
                });
            }

            return Ok(resp.json().await?);
        }
    }

    /// **Bulk keyword search** — efficient large-scale discovery, up to 10M results.
    ///
    /// Supports advanced query syntax: `"exact phrase"`, `+must`, `-exclude`, `term1 | term2`.
    ///
    /// # Arguments
    /// * `query` — search string
    /// * `fields` — comma-separated fields (see [`crate::types::PAPER_FIELDS_FULL`])
    /// * `year` — year filter: `"2023"`, `"2020-2025"`, `"2020-"`, `"-2023"`
    /// * `min_citations` — only return papers with at least this many citations
    /// * `sort` — sort key, e.g. `"citationCount:desc"`, `"publicationDate:desc"`, `"paperId:asc"`
    /// * `limit` — results per page (max 1000)
    pub async fn search_bulk(
        &self,
        query: &str,
        fields: &str,
        year: Option<&str>,
        min_citations: Option<u32>,
        sort: Option<&str>,
        limit: u32,
    ) -> Result<BulkSearchResponse, Error> {
        let url = format!("{BASE_URL}/graph/v1/paper/search/bulk");
        let mut params = vec![
            ("query".into(), query.to_string()),
            ("fields".into(), fields.to_string()),
            ("limit".into(), limit.to_string()),
        ];
        if let Some(y) = year {
            params.push(("year".into(), y.to_string()));
        }
        if let Some(mc) = min_citations {
            params.push(("minCitationCount".into(), mc.to_string()));
        }
        if let Some(s) = sort {
            params.push(("sort".into(), s.to_string()));
        }
        let val = self.get_json(&url, params).await?;
        Ok(serde_json::from_value(val)?)
    }

    /// **Relevance-ranked search** — richer ranking signal, max 1000 results.
    ///
    /// Use for precise targeted queries where ranking quality matters more than scale.
    pub async fn search(
        &self,
        query: &str,
        fields: &str,
        limit: u32,
        offset: u32,
    ) -> Result<SearchResponse, Error> {
        let url = format!("{BASE_URL}/graph/v1/paper/search");
        let params = vec![
            ("query".into(), query.to_string()),
            ("fields".into(), fields.to_string()),
            ("limit".into(), limit.to_string()),
            ("offset".into(), offset.to_string()),
        ];
        let val = self.get_json(&url, params).await?;
        Ok(serde_json::from_value(val)?)
    }

    /// Get full details for a single paper.
    ///
    /// `paper_id` accepts any format: S2PaperId, `DOI:10.xxx/yyy`, `arXiv:1705.10311`,
    /// `PMID:12345`, `ACL:P19-1002`, etc.
    pub async fn get_paper(&self, paper_id: &str, fields: &str) -> Result<Paper, Error> {
        let url = format!("{BASE_URL}/graph/v1/paper/{paper_id}");
        let params = vec![("fields".into(), fields.to_string())];
        let val = self.get_json(&url, params).await?;
        Ok(serde_json::from_value(val)?)
    }

    /// Papers that **cite** this paper (forward citations).
    ///
    /// `fields` controls nested paper attributes returned inside each `citingPaper`.
    pub async fn get_citations(
        &self,
        paper_id: &str,
        fields: &str,
        limit: u32,
    ) -> Result<CitationsResponse, Error> {
        let url = format!("{BASE_URL}/graph/v1/paper/{paper_id}/citations");
        let params = vec![
            ("fields".into(), fields.to_string()),
            ("limit".into(), limit.to_string()),
        ];
        let val = self.get_json(&url, params).await?;
        Ok(serde_json::from_value(val)?)
    }

    /// Papers this paper **references** (backward citations).
    pub async fn get_references(
        &self,
        paper_id: &str,
        fields: &str,
        limit: u32,
    ) -> Result<ReferencesResponse, Error> {
        let url = format!("{BASE_URL}/graph/v1/paper/{paper_id}/references");
        let params = vec![
            ("fields".into(), fields.to_string()),
            ("limit".into(), limit.to_string()),
        ];
        let val = self.get_json(&url, params).await?;
        Ok(serde_json::from_value(val)?)
    }

    /// Papers **similar** to the given paper (Recommendations API).
    ///
    /// Uses SPECTER2 embeddings and citation graph signals under the hood.
    pub async fn get_recommendations(
        &self,
        paper_id: &str,
        fields: &str,
        limit: u32,
    ) -> Result<RecommendationsResponse, Error> {
        let url =
            format!("{BASE_URL}/recommendations/v1/papers/forpaper/{paper_id}");
        let params = vec![
            ("fields".into(), fields.to_string()),
            ("limit".into(), limit.to_string()),
        ];
        let val = self.get_json(&url, params).await?;
        Ok(serde_json::from_value(val)?)
    }
}
