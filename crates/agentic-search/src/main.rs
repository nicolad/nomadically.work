mod deepseek;
mod discovery;
mod orchestrator;
mod tools;
mod worker;

use anyhow::Context;
use clap::{Parser, Subcommand};
use deepseek::DeepSeekClient;
use orchestrator::Orchestrator;
use std::path::PathBuf;
use tracing_subscriber::EnvFilter;

#[derive(Parser)]
#[command(
    name = "agentic-search",
    about = "Parallel agentic codebase search driven by DeepSeek.\n\
             Tool hierarchy: Glob (near-zero) → Grep (lightweight) → Read (heavy)."
)]
struct Cli {
    #[command(subcommand)]
    command: Command,

    /// Root directory to search (default: current directory)
    #[arg(short, long, default_value = ".", global = true)]
    root: PathBuf,
}

#[derive(Subcommand)]
enum Command {
    /// Parallel natural-language search across the codebase
    Search {
        /// Natural language query
        query: Vec<String>,

        /// Number of parallel worker agents
        #[arg(short = 'w', long, default_value_t = 3)]
        workers: usize,

        /// Maximum tool-use turns per worker
        #[arg(short, long, default_value_t = 8)]
        max_turns: usize,
    },

    /// Self-discovery mode — scan the codebase and write rich stack data to a JSON file
    Discover {
        /// Output file path (default: stdout)
        #[arg(short, long)]
        output: Option<PathBuf>,

        /// Maximum tool-use turns per discovery worker
        #[arg(short, long, default_value_t = 10)]
        max_turns: usize,
    },
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let _ = dotenvy::dotenv();
    let _ = dotenvy::from_filename(".env.local");
    if let Ok(home) = std::env::var("HOME") {
        let _ = dotenvy::from_path(format!("{home}/.env"));
    }

    tracing_subscriber::fmt()
        .with_env_filter(
            EnvFilter::try_from_env("SEARCH_LOG")
                .unwrap_or_else(|_| EnvFilter::new("info")),
        )
        .with_target(false)
        .init();

    let cli = Cli::parse();

    let api_key = std::env::var("DEEPSEEK_API_KEY")
        .context("DEEPSEEK_API_KEY not set — add it to .env.local or export it")?;

    let root = cli.root.canonicalize().unwrap_or(cli.root);
    let client = DeepSeekClient::new(api_key);

    match cli.command {
        Command::Search { query, workers, max_turns } => {
            let query = query.join(" ");
            if query.is_empty() {
                eprintln!("Usage: agentic-search search <query>");
                std::process::exit(1);
            }
            let orchestrator = Orchestrator::new(client, root, workers, max_turns);
            let result = orchestrator.run(&query).await?;
            println!("{result}");
        }

        Command::Discover { output, max_turns } => {
            let orchestrator = discovery::DiscoveryOrchestrator::new(client, root, max_turns);
            let result = orchestrator.run().await?;
            let json = serde_json::to_string_pretty(&result)
                .context("serializing discovery output")?;

            match output {
                Some(path) => {
                    if let Some(parent) = path.parent() {
                        std::fs::create_dir_all(parent)
                            .with_context(|| format!("creating output directory: {}", parent.display()))?;
                    }
                    std::fs::write(&path, &json)
                        .with_context(|| format!("writing to {}", path.display()))?;
                    eprintln!("Discovery written to {}", path.display());
                }
                None => println!("{json}"),
            }
        }
    }

    Ok(())
}
