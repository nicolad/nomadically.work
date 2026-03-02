use anyhow::{Context, Result};
use clap::{Parser, Subcommand};
use chrono::Utc;
use research_agent::{
    agent::Client,
    backend,
    d1::D1Client,
    enhance,
    research_context::ResearchContext,
    study,
    tools::{GetPaperDetail, SearchPapers},
};
use semantic_scholar::SemanticScholarClient;
use std::path::PathBuf;
use tracing::info;

#[derive(Parser)]
#[command(
    name = "research-agent",
    about = "DeepSeek Reasoner + Semantic Scholar research agent",
)]
struct Cli {
    #[command(subcommand)]
    command: Command,
}

#[derive(Subcommand)]
enum Command {
    /// Original single-topic research mode
    Research {
        /// Research topic (e.g., "remote work trends")
        #[arg(short, long)]
        topic: String,

        /// Focus areas (comma-separated)
        #[arg(short, long, default_value = "remote work,distributed teams,EU employment")]
        focus: String,

        /// Output directory
        #[arg(long, default_value = "_memory/research-insights")]
        output_dir: PathBuf,

        /// DeepSeek API key (or set DEEPSEEK_API_KEY env var)
        #[arg(long)]
        api_key: Option<String>,

        /// Print to stdout instead of writing files
        #[arg(long)]
        stdout: bool,

        /// Prefix for parallel runs
        #[arg(long)]
        prefix: Option<String>,
    },

    /// Spawn 20 parallel agents to research agentic coding topics and save to D1
    Study {
        /// DeepSeek API key (or set DEEPSEEK_API_KEY env var)
        #[arg(long)]
        api_key: Option<String>,
    },

    /// Spawn 10 parallel agents to research application-prep topics for Plan A Technologies
    Prep {
        /// DeepSeek API key (or set DEEPSEEK_API_KEY env var)
        #[arg(long)]
        api_key: Option<String>,
    },

    /// Spawn 10 parallel agents to enhance application's agentic coding section
    Enhance {
        /// Application ID in D1
        #[arg(long)]
        app_id: i64,

        /// DeepSeek API key (or set DEEPSEEK_API_KEY env var)
        #[arg(long)]
        api_key: Option<String>,
    },

    /// Normalize study_topics category slugs in D1 (e.g. "Node.js" → "nodejs")
    SlugFix,

    /// Generate study topic stubs for a dynamic category using DeepSeek Reasoner (no Semantic Scholar)
    StudyGen {
        /// Category slug (e.g. "nodejs", "rust", "system-design")
        #[arg(short, long)]
        category: String,

        /// Number of topics to generate (default: 10, max: 20)
        #[arg(long, default_value = "10")]
        count: usize,

        /// DeepSeek API key (or set DEEPSEEK_API_KEY env var)
        #[arg(long)]
        api_key: Option<String>,
    },

    /// Spawn 20 parallel agents for backend interview prep
    Backend {
        /// Application ID in D1
        #[arg(long)]
        app_id: i64,

        /// DeepSeek API key (or set DEEPSEEK_API_KEY env var)
        #[arg(long)]
        api_key: Option<String>,
    },
}

#[tokio::main]
async fn main() -> Result<()> {
    // Load .env.local from the repo root (parent of the research/ crate)
    let root = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).parent().unwrap_or(std::path::Path::new("."));
    let _ = dotenvy::from_path(root.join(".env.local"));

    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::from_default_env()
                .add_directive("research_agent=info".parse()?),
        )
        .init();

    let cli = Cli::parse();

    match cli.command {
        Command::Research {
            topic,
            focus,
            output_dir,
            api_key,
            stdout,
            prefix,
        } => {
            let focus_areas: Vec<String> =
                focus.split(',').map(|s| s.trim().to_string()).collect();
            let context = ResearchContext::new(&topic, focus_areas);

            info!(topic = %context.topic, focus = ?context.focus_areas, "Research context loaded");

            let api_key = api_key
                .or_else(|| std::env::var("DEEPSEEK_API_KEY").ok())
                .context("DEEPSEEK_API_KEY not set")?;

            let scholar = SemanticScholarClient::new(
                std::env::var("SEMANTIC_SCHOLAR_API_KEY").ok().as_deref(),
            );

            let client = Client::new(&api_key);

            let preamble = r#"You are a research analyst for a remote EU job board aggregator.
You have access to the Semantic Scholar API via search_papers and get_paper_detail.

Research standards:
- Always run ≥3 search_papers calls with different query terms
- Call get_paper_detail on the 3–4 most promising papers for full abstracts
- Weight recent papers (2020+) on remote work, distributed teams, EU employment higher
- Extract actionable insights for job board aggregation (classification, skill matching, etc.)
- Report confidence honestly — say 'insufficient evidence' if the literature is sparse"#;

            let agent = client
                .agent("deepseek-reasoner")
                .preamble(preamble)
                .tool(SearchPapers(scholar.clone()))
                .tool(GetPaperDetail(scholar))
                .build();

            let prompt = context.build_agent_prompt();
            info!("Sending research context to DeepSeek Reasoner…");

            let insights = agent.prompt(prompt).await.context("agent call failed")?;

            info!("Research complete ({} chars)", insights.len());

            if stdout {
                println!("{insights}");
            } else {
                std::fs::create_dir_all(&output_dir)?;

                let timestamp = Utc::now().format("%H%M%S");
                let slug = topic
                    .to_lowercase()
                    .replace(' ', "-")
                    .replace(|c: char| !c.is_alphanumeric() && c != '-', "");
                let slug = slug.trim_matches('-').to_string();

                let filename = match &prefix {
                    Some(p) => format!("{p}-{slug}-{timestamp}.md"),
                    None => format!("{slug}-{timestamp}.md"),
                };
                let out_path = output_dir.join(&filename);

                std::fs::write(&out_path, &insights)
                    .with_context(|| format!("writing {out_path:?}"))?;
                info!("Written to {out_path:?}");

                if prefix.is_none() {
                    let latest = output_dir.join("latest-insights.md");
                    std::fs::write(&latest, &insights)?;
                    info!("latest-insights.md updated");
                }
            }
        }

        Command::Study { api_key } => {
            let api_key = api_key
                .or_else(|| std::env::var("DEEPSEEK_API_KEY").ok())
                .context("DEEPSEEK_API_KEY not set")?;

            let scholar = SemanticScholarClient::new(
                std::env::var("SEMANTIC_SCHOLAR_API_KEY").ok().as_deref(),
            );

            let d1 = D1Client::from_env()?;

            info!("Starting agentic-coding study generation (20 parallel agents)");
            study::run(&api_key, &scholar, &d1).await?;
            info!("All topics saved to D1 — visit /study/agentic-coding");
        }

        Command::Prep { api_key } => {
            let api_key = api_key
                .or_else(|| std::env::var("DEEPSEEK_API_KEY").ok())
                .context("DEEPSEEK_API_KEY not set")?;

            let scholar = SemanticScholarClient::new(
                std::env::var("SEMANTIC_SCHOLAR_API_KEY").ok().as_deref(),
            );

            let d1 = D1Client::from_env()?;

            info!("Starting application-prep study generation (10 parallel agents)");
            study::run_prep(&api_key, &scholar, &d1).await?;
            info!("All topics saved to D1 — visit /study/application-prep");
        }

        Command::Enhance { app_id, api_key } => {
            let api_key = api_key
                .or_else(|| std::env::var("DEEPSEEK_API_KEY").ok())
                .context("DEEPSEEK_API_KEY not set")?;

            let scholar = SemanticScholarClient::new(
                std::env::var("SEMANTIC_SCHOLAR_API_KEY").ok().as_deref(),
            );

            let d1 = D1Client::from_env()?;

            info!(app_id, "Starting agentic coding enhancement (10 parallel agents)");
            enhance::run(app_id, &api_key, &scholar, &d1).await?;
            info!(app_id, "Agentic coding data saved to D1");
        }

        Command::SlugFix => {
            let d1 = D1Client::from_env()?;

            // Fetch all distinct categories so we can compute correct slugs
            let rows = d1.query("SELECT DISTINCT category FROM study_topics", vec![]).await?;
            let categories: Vec<String> = rows
                .iter()
                .filter_map(|r| r.get("category").and_then(|v| v.as_str()).map(|s| s.to_string()))
                .collect();

            info!("Found {} distinct categories", categories.len());

            for cat in &categories {
                let slug = cat.to_lowercase().replace(' ', "-").replace(|c: char| !c.is_alphanumeric() && c != '-', "");
                if &slug != cat {
                    info!(from = %cat, to = %slug, "Renaming category");
                    d1.execute(
                        "UPDATE study_topics SET category = ?1 WHERE category = ?2",
                        vec![slug.clone().into(), cat.clone().into()],
                    ).await?;
                    info!(slug = %slug, "Done");
                }
            }

            info!("slug-fix complete");
        }

        Command::StudyGen { category, count, api_key } => {
            let api_key = api_key
                .or_else(|| std::env::var("DEEPSEEK_API_KEY").ok())
                .context("DEEPSEEK_API_KEY not set")?;

            let d1 = D1Client::from_env()?;
            let count = count.min(20);

            info!(category = %category, count, "Generating study topics with DeepSeek Reasoner");
            study::run_gen(&category, count, &api_key, &d1).await?;
            info!(category = %category, "Topics saved to D1 — visit /study/{category}");
        }

        Command::Backend { app_id, api_key } => {
            let api_key = api_key
                .or_else(|| std::env::var("DEEPSEEK_API_KEY").ok())
                .context("DEEPSEEK_API_KEY not set")?;

            let scholar = SemanticScholarClient::new(
                std::env::var("SEMANTIC_SCHOLAR_API_KEY").ok().as_deref(),
            );

            let d1 = D1Client::from_env()?;

            info!(app_id, "Starting backend interview prep (20 parallel agents)");
            backend::run(app_id, &api_key, &scholar, &d1).await?;
            info!(app_id, "Backend prep data saved to D1");
        }
    }

    Ok(())
}
