use anyhow::{Context, Result};
use clap::{Parser, Subcommand};
use chrono::Utc;
use research_agent::{
    agent::Client,
    d1::D1Client,
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
}

#[tokio::main]
async fn main() -> Result<()> {
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
    }

    Ok(())
}
