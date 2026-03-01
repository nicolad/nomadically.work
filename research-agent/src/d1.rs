/// Cloudflare D1 REST API client for writing study topics.
use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use tracing::info;

#[derive(Clone)]
pub struct D1Client {
    account_id: String,
    database_id: String,
    api_token: String,
    http: reqwest::Client,
}

#[derive(Serialize)]
struct D1Query {
    sql: String,
    params: Vec<serde_json::Value>,
}

#[derive(Deserialize)]
struct D1Response {
    success: bool,
    errors: Vec<serde_json::Value>,
    #[serde(default)]
    result: Vec<D1ResultSet>,
}

#[derive(Deserialize)]
struct D1ResultSet {
    #[serde(default)]
    results: Vec<serde_json::Value>,
}

impl D1Client {
    pub fn from_env() -> Result<Self> {
        Ok(Self {
            account_id: std::env::var("CLOUDFLARE_ACCOUNT_ID")
                .context("CLOUDFLARE_ACCOUNT_ID not set")?,
            database_id: std::env::var("CLOUDFLARE_D1_DATABASE_ID")
                .context("CLOUDFLARE_D1_DATABASE_ID not set")?,
            api_token: std::env::var("CLOUDFLARE_API_TOKEN")
                .context("CLOUDFLARE_API_TOKEN not set")?,
            http: reqwest::Client::new(),
        })
    }

    pub async fn insert_study_topic(&self, topic: &StudyTopicRow) -> Result<()> {
        let sql = "INSERT OR REPLACE INTO study_topics \
                   (category, topic, title, summary, body_md, difficulty, tags, created_at, updated_at) \
                   VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, datetime('now'), datetime('now'))";

        let tags_json = serde_json::to_string(&topic.tags)?;

        let query = D1Query {
            sql: sql.into(),
            params: vec![
                topic.category.clone().into(),
                topic.topic.clone().into(),
                topic.title.clone().into(),
                topic.summary.clone().into(),
                topic.body_md.clone().into(),
                topic.difficulty.clone().into(),
                tags_json.into(),
            ],
        };

        let url = format!(
            "https://api.cloudflare.com/client/v4/accounts/{}/d1/database/{}/query",
            self.account_id, self.database_id,
        );

        let resp = self
            .http
            .post(&url)
            .bearer_auth(&self.api_token)
            .json(&query)
            .send()
            .await
            .context("D1 API request failed")?;

        let status = resp.status();
        if !status.is_success() {
            let body = resp.text().await.unwrap_or_default();
            anyhow::bail!("D1 API error {status}: {body}");
        }

        let data: D1Response = resp.json().await.context("parsing D1 response")?;
        if !data.success {
            anyhow::bail!("D1 query failed: {:?}", data.errors);
        }

        info!(topic = %topic.topic, "Inserted into D1");
        Ok(())
    }

    /// Execute a SELECT query and return result rows as `Vec<Value>`.
    pub async fn query(&self, sql: &str, params: Vec<serde_json::Value>) -> Result<Vec<serde_json::Value>> {
        let query = D1Query {
            sql: sql.into(),
            params,
        };

        let url = format!(
            "https://api.cloudflare.com/client/v4/accounts/{}/d1/database/{}/query",
            self.account_id, self.database_id,
        );

        let resp = self
            .http
            .post(&url)
            .bearer_auth(&self.api_token)
            .json(&query)
            .send()
            .await
            .context("D1 API request failed")?;

        let status = resp.status();
        if !status.is_success() {
            let body = resp.text().await.unwrap_or_default();
            anyhow::bail!("D1 API error {status}: {body}");
        }

        let data: D1Response = resp.json().await.context("parsing D1 response")?;
        if !data.success {
            anyhow::bail!("D1 query failed: {:?}", data.errors);
        }

        let rows = data
            .result
            .into_iter()
            .next()
            .map(|rs| rs.results)
            .unwrap_or_default();

        Ok(rows)
    }

    /// Execute a write statement (INSERT/UPDATE/DELETE). Checks for `success: true`.
    pub async fn execute(&self, sql: &str, params: Vec<serde_json::Value>) -> Result<()> {
        let query = D1Query {
            sql: sql.into(),
            params,
        };

        let url = format!(
            "https://api.cloudflare.com/client/v4/accounts/{}/d1/database/{}/query",
            self.account_id, self.database_id,
        );

        let resp = self
            .http
            .post(&url)
            .bearer_auth(&self.api_token)
            .json(&query)
            .send()
            .await
            .context("D1 API request failed")?;

        let status = resp.status();
        if !status.is_success() {
            let body = resp.text().await.unwrap_or_default();
            anyhow::bail!("D1 API error {status}: {body}");
        }

        let data: D1Response = resp.json().await.context("parsing D1 response")?;
        if !data.success {
            anyhow::bail!("D1 execute failed: {:?}", data.errors);
        }

        Ok(())
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StudyTopicRow {
    pub category: String,
    pub topic: String,
    pub title: String,
    pub summary: String,
    pub body_md: String,
    pub difficulty: String,
    pub tags: Vec<String>,
}
