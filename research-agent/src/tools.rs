use crate::agent::{Tool, ToolDefinition};
use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use semantic_scholar::{SemanticScholarClient, types::{PAPER_FIELDS_FULL, SEARCH_FIELDS}};

#[derive(Deserialize, Serialize)]
pub struct SearchArgs {
    pub query: String,
    pub year: Option<String>,
    pub min_citations: Option<u32>,
    pub limit: Option<u32>,
}

pub struct SearchPapers(pub SemanticScholarClient);

#[async_trait]
impl Tool for SearchPapers {
    fn name(&self) -> &str {
        "search_papers"
    }

    fn definition(&self) -> ToolDefinition {
        ToolDefinition {
            name: self.name().into(),
            description: "Search 214M+ academic papers on Semantic Scholar sorted by citation \
                          impact. Returns titles, authors, citation counts, abstracts, and PDF \
                          links. Call multiple times with different query terms to cover the topic \
                          from different angles."
                .into(),
            parameters: serde_json::json!({
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Search query. Use +must_include, -exclude, \"exact phrase\", term1 | term2"
                    },
                    "year": {
                        "type": "string",
                        "description": "Year filter. Examples: \"2019-\" (2019 onward), \"2020-2024\", \"2023\""
                    },
                    "min_citations": {
                        "type": "integer",
                        "description": "Minimum citation count. Use 5+ to filter out unpublished drafts"
                    },
                    "limit": {
                        "type": "integer",
                        "description": "Max papers to return (default 8, max 20)"
                    }
                },
                "required": ["query"]
            }),
        }
    }

    async fn call_json(&self, args: serde_json::Value) -> anyhow::Result<String> {
        let args: SearchArgs = serde_json::from_value(args)?;
        let limit = args.limit.unwrap_or(8).min(20);

        let resp = self.0
            .search_bulk(
                &args.query,
                SEARCH_FIELDS,
                args.year.as_deref(),
                args.min_citations,
                Some("citationCount:desc"),
                limit,
            )
            .await?;

        let papers: Vec<serde_json::Value> = resp
            .data
            .iter()
            .map(|p| {
                let abstract_snippet = p.abstract_text.as_ref().map(|a| {
                    if a.chars().count() > 350 {
                        a.chars().take(350).collect::<String>() + "…"
                    } else {
                        a.clone()
                    }
                });
                serde_json::json!({
                    "paper_id": p.paper_id,
                    "title": p.title,
                    "year": p.year,
                    "citations": p.citation_count,
                    "abstract": abstract_snippet,
                    "pdf_url": p.open_access_pdf.as_ref().and_then(|x| x.url.as_deref()),
                    "url": p.url,
                    "authors": p.authors.as_ref().map(|a| {
                        a.iter().filter_map(|au| au.name.as_deref()).take(4).collect::<Vec<_>>()
                    }),
                    "fields": p.fields_of_study,
                })
            })
            .collect();

        Ok(serde_json::to_string_pretty(&serde_json::json!({
            "query": args.query,
            "total_available": resp.total,
            "returned": papers.len(),
            "papers": papers,
        }))?)
    }
}

#[derive(Deserialize, Serialize)]
pub struct PaperDetailArgs {
    pub paper_id: String,
}

pub struct GetPaperDetail(pub SemanticScholarClient);

#[async_trait]
impl Tool for GetPaperDetail {
    fn name(&self) -> &str {
        "get_paper_detail"
    }

    fn definition(&self) -> ToolDefinition {
        ToolDefinition {
            name: self.name().into(),
            description: "Get full details for a specific paper: complete abstract, AI-generated \
                          TLDR summary, all authors, venue, and PDF link. Use this on the most \
                          relevant papers from search_papers to extract precise insights."
                .into(),
            parameters: serde_json::json!({
                "type": "object",
                "properties": {
                    "paper_id": {
                        "type": "string",
                        "description": "Paper ID from search results (S2PaperId), or arXiv:xxxx, DOI:xxx/yyy, PMID:xxx"
                    }
                },
                "required": ["paper_id"]
            }),
        }
    }

    async fn call_json(&self, args: serde_json::Value) -> anyhow::Result<String> {
        let args: PaperDetailArgs = serde_json::from_value(args)?;
        let p = self.0.get_paper(&args.paper_id, PAPER_FIELDS_FULL).await?;

        Ok(serde_json::to_string_pretty(&serde_json::json!({
            "paper_id": p.paper_id,
            "title": p.title,
            "year": p.year,
            "citations": p.citation_count,
            "influential_citations": p.influential_citation_count,
            "tldr": p.tldr.as_ref().and_then(|t| t.text.as_deref()),
            "abstract": p.abstract_text,
            "authors": p.authors.as_ref().map(|a| {
                a.iter().filter_map(|au| au.name.as_deref()).collect::<Vec<_>>()
            }),
            "venue": p.venue,
            "publication_date": p.publication_date,
            "is_open_access": p.is_open_access,
            "pdf_url": p.open_access_pdf.as_ref().and_then(|x| x.url.as_deref()),
            "url": p.url,
        }))?)
    }
}
