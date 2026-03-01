use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

pub const BASE_URL: &str = "https://api.deepseek.com";
pub const MODEL: &str = "deepseek-reasoner";
pub const TEMPERATURE: f32 = 2.0;
pub const DEFAULT_PORT: u16 = 19836;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Config {
    #[serde(default)]
    pub deepseek: DeepSeekConfig,
    #[serde(default)]
    pub cache: CacheConfig,
    #[serde(default)]
    pub rules: RulesConfig,
    #[serde(default = "default_port")]
    pub port: u16,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeepSeekConfig {
    #[serde(default = "default_max_concurrent")]
    pub max_concurrent: usize,
    #[serde(default = "default_timeout_secs")]
    pub timeout_secs: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CacheConfig {
    #[serde(default = "default_cache_ttl")]
    pub ttl_secs: u64,
    #[serde(default = "default_max_entries")]
    pub max_entries: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RulesConfig {
    #[serde(default = "default_blocked_commands")]
    pub blocked_commands: Vec<String>,
    #[serde(default = "default_allowed_commands")]
    pub allowed_commands: Vec<String>,
    #[serde(default = "default_protected_paths")]
    pub protected_paths: Vec<String>,
    #[serde(default)]
    pub skip_tools: Vec<String>,
    #[serde(default = "default_evaluated_events")]
    pub evaluated_events: Vec<String>,
}

fn default_port() -> u16 { DEFAULT_PORT }
fn default_max_concurrent() -> usize { 8 }
fn default_timeout_secs() -> u64 { 30 }
fn default_cache_ttl() -> u64 { 300 }
fn default_max_entries() -> usize { 2000 }

fn default_blocked_commands() -> Vec<String> {
    vec![
        r"rm\s+-rf\s+/".into(),
        r"rm\s+-rf\s+~".into(),
        r"mkfs\.".into(),
        r"dd\s+if=.*of=/dev/".into(),
        r">\s*/dev/sd".into(),
        r"chmod\s+-R\s+777\s+/".into(),
    ]
}

fn default_allowed_commands() -> Vec<String> {
    vec![
        r"^(cat|ls|pwd|echo|head|tail|wc|file|which|whoami|date|uname)\b".into(),
        r"^git\s+(status|log|diff|branch|show)\b".into(),
        r"^(npm|yarn|pnpm)\s+(test|lint|check|build)\b".into(),
        r"^cargo\s+(test|check|clippy|build|fmt)\b".into(),
        r"^(python|node|deno|bun)\s+-c\s+".into(),
    ]
}

fn default_protected_paths() -> Vec<String> {
    vec![
        r"\.env".into(),
        r"\.git/".into(),
        r"id_rsa".into(),
        r"\.ssh/".into(),
        r"\.gnupg/".into(),
        r"secrets?\.".into(),
        r"credentials".into(),
    ]
}

fn default_evaluated_events() -> Vec<String> {
    vec![
        "PreToolUse".into(),
        "Stop".into(),
        "UserPromptSubmit".into(),
    ]
}

impl Default for DeepSeekConfig {
    fn default() -> Self {
        Self {
            max_concurrent: default_max_concurrent(),
            timeout_secs: default_timeout_secs(),
        }
    }
}

impl Default for CacheConfig {
    fn default() -> Self {
        Self {
            ttl_secs: default_cache_ttl(),
            max_entries: default_max_entries(),
        }
    }
}

impl Default for RulesConfig {
    fn default() -> Self {
        Self {
            blocked_commands: default_blocked_commands(),
            allowed_commands: default_allowed_commands(),
            protected_paths: default_protected_paths(),
            skip_tools: vec![],
            evaluated_events: default_evaluated_events(),
        }
    }
}

impl Config {
    pub fn load() -> Result<Self> {
        let path = config_path();
        if path.exists() {
            let text = std::fs::read_to_string(&path)
                .with_context(|| format!("reading {}", path.display()))?;
            let cfg: Config = serde_json::from_str(&text)
                .with_context(|| format!("parsing {}", path.display()))?;
            Ok(cfg)
        } else {
            Ok(Config {
                deepseek: DeepSeekConfig::default(),
                cache: CacheConfig::default(),
                rules: RulesConfig::default(),
                port: default_port(),
            })
        }
    }

    pub fn api_key() -> Result<String> {
        std::env::var("DEEPSEEK_API_KEY")
            .context("DEEPSEEK_API_KEY env var is required")
    }

    pub fn bind_addr(&self) -> String {
        format!("127.0.0.1:{}", self.port)
    }
}

fn config_path() -> PathBuf {
    dirs::config_dir()
        .unwrap_or_else(|| PathBuf::from("~/.config"))
        .join("claude-hooks")
        .join("config.json")
}
