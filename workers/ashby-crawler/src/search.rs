use std::collections::HashMap;
use worker::*;

use crate::rig_compat;

/// Build the BM25 index from D1. Loads from both ashby_boards and greenhouse_boards.
pub async fn build_bm25_index(db: &D1Database) -> Result<rig_compat::Bm25Index> {
    let mut index = rig_compat::Bm25Index::new();

    // Load Ashby boards
    let ashby_rows = db
        .prepare("SELECT slug, url, last_seen, crawl_id, company_name, industry_tags FROM ashby_boards")
        .bind(&[])?
        .all().await?
        .results::<serde_json::Value>()?;

    for row in &ashby_rows {
        let slug = row["slug"].as_str().unwrap_or("");
        let url  = row["url"].as_str().unwrap_or("");
        let company = row["company_name"].as_str().unwrap_or("");
        let industries = row["industry_tags"].as_str().unwrap_or("");
        let search_text = format!(
            "{} {} {} {} ashby",
            slug.replace('-', " "),
            company,
            industries,
            url.split('/').collect::<Vec<_>>().join(" "),
        );
        let mut meta = HashMap::new();
        meta.insert("url".into(), url.to_string());
        meta.insert("provider".into(), "ashby".to_string());
        meta.insert("last_seen".into(), row["last_seen"].as_str().unwrap_or("").to_string());
        meta.insert("crawl_id".into(), row["crawl_id"].as_str().unwrap_or("").to_string());
        if !company.is_empty() { meta.insert("company_name".into(), company.to_string()); }
        if !industries.is_empty() { meta.insert("industry_tags".into(), industries.to_string()); }
        index.add_document(format!("ashby:{}", slug), search_text, meta);
    }

    // Load Greenhouse boards — ignore errors if table doesn't exist yet
    if let Ok(gh_stmt) = db
        .prepare("SELECT token, url, last_seen, crawl_id FROM greenhouse_boards")
        .bind(&[])
    {
        if let Ok(gh_result) = gh_stmt.all().await {
            let gh_rows = gh_result.results::<serde_json::Value>().unwrap_or_default();
            for row in &gh_rows {
                let token = row["token"].as_str().unwrap_or("");
                let url = row["url"].as_str().unwrap_or("");
                let search_text = format!(
                    "{} {} greenhouse",
                    token.replace('-', " "),
                    url.split('/').collect::<Vec<_>>().join(" "),
                );
                let mut meta = HashMap::new();
                meta.insert("url".into(), url.to_string());
                meta.insert("provider".into(), "greenhouse".to_string());
                meta.insert("last_seen".into(), row["last_seen"].as_str().unwrap_or("").to_string());
                meta.insert("crawl_id".into(), row["crawl_id"].as_str().unwrap_or("").to_string());
                index.add_document(format!("greenhouse:{}", token), search_text, meta);
            }
        }
    }

    index.rebuild_index();
    Ok(index)
}
