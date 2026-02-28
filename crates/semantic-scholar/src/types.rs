use serde::{Deserialize, Serialize};

/// Fields supported by `/paper/search` and `/paper/search/bulk` endpoints.
/// Note: `tldr` and `influentialCitationCount` are NOT available in search endpoints.
pub const SEARCH_FIELDS: &str =
    "paperId,title,abstract,year,citationCount,\
     openAccessPdf,authors,fieldsOfStudy,url,publicationDate,isOpenAccess,venue";

/// Rich fields for `/paper/{id}` single-paper detail — includes tldr and influential count.
pub const PAPER_FIELDS_FULL: &str =
    "paperId,title,abstract,year,citationCount,influentialCitationCount,\
     tldr,openAccessPdf,authors,fieldsOfStudy,url,publicationDate,isOpenAccess,venue";

/// Lightweight fields for nested paper objects (citations, references, recommendations).
/// Note: `tldr` is NOT available in citation/reference/recommendations endpoints either.
pub const PAPER_FIELDS_BRIEF: &str =
    "paperId,title,year,citationCount,authors,url";

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct Paper {
    pub paper_id: Option<String>,
    pub title: Option<String>,
    #[serde(rename = "abstract")]
    pub abstract_text: Option<String>,
    pub year: Option<u32>,
    pub citation_count: Option<u64>,
    pub influential_citation_count: Option<u64>,
    pub tldr: Option<Tldr>,
    pub open_access_pdf: Option<OpenAccessPdf>,
    pub authors: Option<Vec<Author>>,
    pub fields_of_study: Option<Vec<String>>,
    pub url: Option<String>,
    pub venue: Option<String>,
    pub publication_date: Option<String>,
    pub is_open_access: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Tldr {
    pub model: Option<String>,
    pub text: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OpenAccessPdf {
    pub url: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Author {
    pub author_id: Option<String>,
    pub name: Option<String>,
}

/// Response from `/graph/v1/paper/search/bulk` — up to 10M results, sorted by field.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BulkSearchResponse {
    pub total: Option<u64>,
    /// Pagination token for the next page (pass as `token` query param).
    pub token: Option<String>,
    pub data: Vec<Paper>,
}

/// Response from `/graph/v1/paper/search` — relevance-ranked, max 1000 results.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchResponse {
    pub total: Option<u64>,
    pub offset: Option<u64>,
    pub next: Option<u64>,
    pub data: Vec<Paper>,
}

/// One entry in `/paper/{id}/citations` — the paper doing the citing.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CitationItem {
    pub citing_paper: Option<Paper>,
    pub intents: Option<Vec<String>>,
    pub is_influential: Option<bool>,
    pub contexts: Option<Vec<String>>,
}

/// One entry in `/paper/{id}/references` — the paper being cited.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReferenceItem {
    pub cited_paper: Option<Paper>,
    pub intents: Option<Vec<String>>,
    pub is_influential: Option<bool>,
    pub contexts: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CitationsResponse {
    pub data: Vec<CitationItem>,
    pub next: Option<u64>,
    pub offset: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReferencesResponse {
    pub data: Vec<ReferenceItem>,
    pub next: Option<u64>,
    pub offset: Option<u64>,
}

/// Response from the Recommendations API.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RecommendationsResponse {
    pub recommended_papers: Vec<Paper>,
}
