use std::collections::HashMap;
use worker::*;
use serde::Deserialize;

use crate::types::{AtsProvider, CdxRecord, DiscoveredBoard};

/// Extract a board token from a URL for the given ATS provider.
pub fn extract_board_token(url: &str, provider: AtsProvider) -> Option<String> {
    let url = url.trim_end_matches('/');
    let host = provider.host();
    let prefix = format!("{}/", host);
    let idx = url.find(&prefix)?;
    let after = &url[idx + prefix.len()..];
    let token = after.split('/').next().unwrap_or("");
    // Strip query params and fragments from token
    let token = token.split('?').next().unwrap_or(token);
    let token = token.split('#').next().unwrap_or(token);
    if token.is_empty()
        || matches!(token, "api" | "static" | "favicon.ico" | "robots.txt" | "sitemap.xml" | "jobs")
    {
        return None;
    }
    Some(token.to_lowercase())
}

pub async fn list_cc_indexes() -> Result<Vec<String>> {
    let req = Request::new("https://index.commoncrawl.org/collinfo.json", Method::Get)?;
    let mut resp = Fetch::Request(req).send().await?;
    let text = resp.text().await?;
    #[derive(Deserialize)]
    struct C { id: String }
    let infos: Vec<C> = serde_json::from_str(&text)
        .map_err(|e| Error::RustError(format!("collinfo parse: {e}")))?;
    Ok(infos.into_iter().map(|i| i.id).collect())
}

pub async fn get_num_pages(crawl_id: &str, provider: AtsProvider) -> Result<u32> {
    let pattern = provider.cc_url_pattern();
    let url = format!(
        "https://index.commoncrawl.org/{crawl_id}-index?\
         url={pattern}&output=json&showNumPages=true"
    );
    let mut resp = Fetch::Request(Request::new(&url, Method::Get)?).send().await?;
    let text = resp.text().await?;
    #[derive(Deserialize)]
    struct P { pages: u32 }
    let info: P = serde_json::from_str(&text)
        .map_err(|e| Error::RustError(format!("pageinfo: {e}")))?;
    Ok(info.pages)
}

pub async fn fetch_cdx_page(crawl_id: &str, page: u32, provider: AtsProvider) -> Result<Vec<DiscoveredBoard>> {
    let pattern = provider.cc_url_pattern();
    let url = format!(
        "https://index.commoncrawl.org/{crawl_id}-index?\
         url={pattern}&output=json&filter=statuscode:200&pageSize=100&page={page}"
    );
    let mut resp = Fetch::Request(Request::new(&url, Method::Get)?).send().await?;
    let status = resp.status_code();
    let text = resp.text().await?;
    console_log!("[cdx:{}] page {} status={} body_len={} first_100={}", provider.as_str(), page, status, text.len(), &text[..text.len().min(100)]);

    let mut parse_errors = 0u32;
    let records: Vec<CdxRecord> = text
        .lines()
        .filter(|l| !l.trim().is_empty())
        .filter_map(|l| {
            match serde_json::from_str::<CdxRecord>(l) {
                Ok(r) => Some(r),
                Err(e) => {
                    if parse_errors < 3 {
                        console_log!("[cdx:{}] parse error: {} on line: {}", provider.as_str(), e, &l[..l.len().min(200)]);
                    }
                    parse_errors += 1;
                    None
                }
            }
        })
        .collect();

    console_log!("[cdx:{}] parsed {} records, {} errors from {} lines", provider.as_str(), records.len(), parse_errors, text.lines().count());

    let mut map = HashMap::<String, DiscoveredBoard>::new();
    for r in records {
        if let Some(token) = extract_board_token(&r.url, provider) {
            let board = DiscoveredBoard {
                token: token.clone(),
                url: r.url,
                timestamp: r.timestamp.clone(),
                crawl_id: crawl_id.to_string(),
                provider: provider.as_str().to_string(),
                status: r.status,
                mime: r.mime.or(r.mime_detected),
                warc_file: r.filename,
                warc_offset: r.offset.as_deref().and_then(|s| s.parse().ok()),
                warc_length: r.length.as_deref().and_then(|s| s.parse().ok()),
            };
            map.entry(token)
                .and_modify(|e| {
                    if r.timestamp > e.timestamp {
                        *e = board.clone();
                    }
                })
                .or_insert(board);
        }
    }
    Ok(map.into_values().collect())
}
