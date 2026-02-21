use serde::{Deserialize, Serialize};

// ═══════════════════════════════════════════════════════════════════════════
// ATS PROVIDER
// ═══════════════════════════════════════════════════════════════════════════

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum AtsProvider {
    Ashby,
    Greenhouse,
    Lever,
}

impl AtsProvider {
    /// URL pattern used in Common Crawl CDX queries.
    pub fn cc_url_pattern(&self) -> &str {
        match self {
            AtsProvider::Ashby => "jobs.ashbyhq.com%2F*",
            AtsProvider::Greenhouse => "job-boards.greenhouse.io%2F*",
            AtsProvider::Lever => "jobs.lever.co%2F*",
        }
    }

    /// Host portion of the job board URL.
    pub fn host(&self) -> &str {
        match self {
            AtsProvider::Ashby => "jobs.ashbyhq.com",
            AtsProvider::Greenhouse => "job-boards.greenhouse.io",
            AtsProvider::Lever => "jobs.lever.co",
        }
    }

    /// Build the full board URL from a token/slug.
    pub fn board_url(&self, token: &str) -> String {
        match self {
            AtsProvider::Ashby => format!("https://jobs.ashbyhq.com/{}", token),
            AtsProvider::Greenhouse => format!("https://job-boards.greenhouse.io/{}", token),
            AtsProvider::Lever => format!("https://jobs.lever.co/{}", token),
        }
    }

    pub fn as_str(&self) -> &str {
        match self {
            AtsProvider::Ashby => "ashby",
            AtsProvider::Greenhouse => "greenhouse",
            AtsProvider::Lever => "lever",
        }
    }

    pub fn from_str(s: &str) -> Option<Self> {
        match s.to_lowercase().as_str() {
            "ashby" => Some(AtsProvider::Ashby),
            "greenhouse" | "gh" => Some(AtsProvider::Greenhouse),
            "lever" | "lv" => Some(AtsProvider::Lever),
            _ => None,
        }
    }

    /// Prefixed crawl_id for progress tracking.
    pub fn crawl_id(&self, base_crawl_id: &str) -> String {
        format!("{}:{}", base_crawl_id, self.as_str())
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// COMMON TYPES
// ═══════════════════════════════════════════════════════════════════════════

#[derive(Deserialize, Debug, Clone)]
pub struct CdxRecord {
    pub url: String,
    pub timestamp: String,
    #[serde(default)]
    pub status: Option<String>,
    #[serde(default)]
    pub mime: Option<String>,
    #[serde(default, rename = "mime-detected")]
    pub mime_detected: Option<String>,
    #[serde(default)]
    pub filename: Option<String>,
    #[serde(default)]
    pub offset: Option<String>,
    #[serde(default)]
    pub length: Option<String>,
}

/// A board discovered via Common Crawl, for any ATS provider.
#[derive(Serialize, Debug, Clone)]
pub struct DiscoveredBoard {
    pub token: String,
    pub url: String,
    pub timestamp: String,
    pub crawl_id: String,
    pub provider: String,
    pub status: Option<String>,
    pub mime: Option<String>,
    pub warc_file: Option<String>,
    pub warc_offset: Option<u64>,
    pub warc_length: Option<u64>,
}

#[derive(Serialize)]
pub struct ApiResponse<T: Serialize> {
    pub ok: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub data: Option<T>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

impl<T: Serialize> ApiResponse<T> {
    pub fn success(data: T) -> Self {
        Self { ok: true, data: Some(data), error: None }
    }
}

pub fn error_response(msg: &str) -> worker::Result<worker::Response> {
    worker::Response::from_json(&ApiResponse::<()> {
        ok: false,
        data: None,
        error: Some(msg.to_string()),
    })
}
