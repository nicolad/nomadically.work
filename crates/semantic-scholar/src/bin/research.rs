/// `research` — Semantic Scholar paper discovery CLI
///
/// Outputs JSON to stdout (agent-friendly). Errors go to stderr.
///
/// Examples:
///   research search "momentum cryptocurrency market regime" --limit 15 --year 2019-
///   research search "RSI bollinger bands strategy" --ranked --min-citations 20
///   research paper "arXiv:1705.10311"
///   research recommend "arXiv:1705.10311" --limit 8
///   research cite "arXiv:2305.02622" --limit 10
///   research refs "arXiv:2305.02622"
use anyhow::Result;
use clap::{Parser, Subcommand};
use serde_json::json;

use semantic_scholar::{
    types::{Paper, PAPER_FIELDS_BRIEF, PAPER_FIELDS_FULL, SEARCH_FIELDS},
    SemanticScholarClient,
};

#[derive(Parser)]
#[command(
    name = "research",
    about = "Semantic Scholar paper discovery for quantitative research",
    long_about = "Search 214M+ academic papers, explore citation graphs, and find similar \
                  work. Output is JSON, pipe to jq for filtering.\n\n\
                  API key: set SEMANTIC_SCHOLAR_API_KEY env var or use --api-key.\n\
                  Without a key you share the unauthenticated rate-limit pool.\n\
                  Free key registration: https://www.semanticscholar.org/product/api"
)]
struct Cli {
    /// Semantic Scholar API key (or set SEMANTIC_SCHOLAR_API_KEY env var)
    #[arg(long)]
    api_key: Option<String>,

    #[command(subcommand)]
    cmd: Command,
}

#[derive(Subcommand)]
enum Command {
    /// Search papers by keyword query.
    ///
    /// Query syntax: "exact phrase", +must_include, -exclude, term1 | term2
    Search {
        /// Search query
        query: String,

        /// Max results to return
        #[arg(short, long, default_value = "10")]
        limit: u32,

        /// Year filter: "2023", "2020-2025", "2020-", "-2023"
        #[arg(short, long)]
        year: Option<String>,

        /// Only return papers with at least this many citations
        #[arg(short, long)]
        min_citations: Option<u32>,

        /// Sort results: "citationCount:desc", "publicationDate:desc", "paperId:asc"
        #[arg(long)]
        sort: Option<String>,

        /// Fields to return (comma-separated)
        #[arg(short, long, default_value = SEARCH_FIELDS)]
        fields: String,

        /// Use relevance-ranked search instead of bulk (slower, richer ranking, max 1000)
        #[arg(long)]
        ranked: bool,
    },

    /// Get full details for a single paper.
    ///
    /// paper_id formats: S2PaperId, "DOI:10.xxx/yyy", "arXiv:1705.10311",
    /// "PMID:12345", URL, etc.
    Paper {
        /// Paper identifier (S2PaperId, arXiv ID, DOI, etc.)
        paper_id: String,

        /// Fields to return (comma-separated)
        #[arg(short, long, default_value = PAPER_FIELDS_FULL)]
        fields: String,
    },

    /// Find papers similar to a given paper (uses SPECTER2 embeddings).
    Recommend {
        /// Paper identifier
        paper_id: String,

        /// Max recommendations
        #[arg(short, long, default_value = "10")]
        limit: u32,

        /// Fields to return for each recommended paper
        #[arg(short, long, default_value = PAPER_FIELDS_BRIEF)]
        fields: String,
    },

    /// Papers that cite this paper (forward citations).
    Cite {
        /// Paper identifier
        paper_id: String,

        /// Max results
        #[arg(short, long, default_value = "10")]
        limit: u32,

        /// Fields to return for each citing paper
        #[arg(short, long, default_value = PAPER_FIELDS_BRIEF)]
        fields: String,
    },

    /// Papers this paper references (backward citations).
    Refs {
        /// Paper identifier
        paper_id: String,

        /// Max results
        #[arg(short, long, default_value = "20")]
        limit: u32,

        /// Fields to return for each referenced paper
        #[arg(short, long, default_value = PAPER_FIELDS_BRIEF)]
        fields: String,
    },
}

#[tokio::main]
async fn main() -> Result<()> {
    let cli = Cli::parse();
    let api_key = cli
        .api_key
        .or_else(|| std::env::var("SEMANTIC_SCHOLAR_API_KEY").ok());
    let client = SemanticScholarClient::new(api_key.as_deref());

    let output = match cli.cmd {
        Command::Search {
            query,
            limit,
            year,
            min_citations,
            sort,
            fields,
            ranked,
        } => {
            if ranked {
                let resp = client.search(&query, &fields, limit, 0).await?;
                json!({
                    "query": query,
                    "mode": "relevance-ranked",
                    "total": resp.total,
                    "count": resp.data.len(),
                    "papers": resp.data.iter().map(paper_summary).collect::<Vec<_>>(),
                })
            } else {
                let resp = client
                    .search_bulk(
                        &query,
                        &fields,
                        year.as_deref(),
                        min_citations,
                        sort.as_deref(),
                        limit,
                    )
                    .await?;
                json!({
                    "query": query,
                    "mode": "bulk",
                    "total": resp.total,
                    "count": resp.data.len(),
                    "papers": resp.data.iter().map(paper_summary).collect::<Vec<_>>(),
                })
            }
        }

        Command::Paper { paper_id, fields } => {
            let paper = client.get_paper(&paper_id, &fields).await?;
            json!({
                "paper": paper_summary(&paper),
                "abstract": paper.abstract_text,
                "venue": paper.venue,
                "publication_date": paper.publication_date,
                "is_open_access": paper.is_open_access,
                "influential_citations": paper.influential_citation_count,
            })
        }

        Command::Recommend {
            paper_id,
            limit,
            fields,
        } => {
            let resp = client
                .get_recommendations(&paper_id, &fields, limit)
                .await?;
            json!({
                "seed_paper_id": paper_id,
                "count": resp.recommended_papers.len(),
                "papers": resp.recommended_papers.iter().map(paper_summary).collect::<Vec<_>>(),
            })
        }

        Command::Cite {
            paper_id,
            limit,
            fields,
        } => {
            let resp = client.get_citations(&paper_id, &fields, limit).await?;
            let papers: Vec<_> = resp
                .data
                .iter()
                .filter_map(|c| c.citing_paper.as_ref())
                .map(paper_summary)
                .collect();
            json!({
                "cited_paper_id": paper_id,
                "count": papers.len(),
                "citing_papers": papers,
            })
        }

        Command::Refs {
            paper_id,
            limit,
            fields,
        } => {
            let resp = client.get_references(&paper_id, &fields, limit).await?;
            let papers: Vec<_> = resp
                .data
                .iter()
                .filter_map(|r| r.cited_paper.as_ref())
                .map(paper_summary)
                .collect();
            json!({
                "paper_id": paper_id,
                "count": papers.len(),
                "references": papers,
            })
        }
    };

    println!("{}", serde_json::to_string_pretty(&output)?);
    Ok(())
}

/// Flatten a Paper into a compact JSON summary suitable for agent consumption.
fn paper_summary(paper: &Paper) -> serde_json::Value {
    let tldr = paper.tldr.as_ref().and_then(|t| t.text.as_deref());
    // Truncate abstract to 400 chars so output stays readable in agent contexts.
    let abstract_snippet = paper.abstract_text.as_ref().map(|a| {
        let limit = 400;
        if a.chars().count() > limit {
            let s: String = a.chars().take(limit).collect();
            format!("{s}…")
        } else {
            a.clone()
        }
    });

    json!({
        "paper_id": paper.paper_id,
        "title": paper.title,
        "year": paper.year,
        "citations": paper.citation_count,
        "tldr": tldr,
        "abstract": abstract_snippet,
        "pdf_url": paper.open_access_pdf.as_ref().and_then(|p| p.url.as_deref()),
        "url": paper.url,
        "authors": paper.authors.as_ref().map(|authors| {
            authors.iter().filter_map(|a| a.name.as_deref()).collect::<Vec<_>>()
        }),
        "fields": paper.fields_of_study,
    })
}
