use crate::config::RulesConfig;
use regex::Regex;
use tracing::debug;

#[derive(Debug)]
pub enum RuleVerdict {
    Deny(String),
    Allow,
    NeedsEval,
}

pub struct RulesEngine {
    blocked: Vec<Regex>,
    allowed: Vec<Regex>,
    protected: Vec<Regex>,
    skip_tools: Vec<String>,
    evaluated_events: Vec<String>,
}

unsafe impl Send for RulesEngine {}
unsafe impl Sync for RulesEngine {}

impl RulesEngine {
    pub fn new(cfg: &RulesConfig) -> Self {
        Self {
            blocked: compile_patterns(&cfg.blocked_commands),
            allowed: compile_patterns(&cfg.allowed_commands),
            protected: compile_patterns(&cfg.protected_paths),
            skip_tools: cfg.skip_tools.clone(),
            evaluated_events: cfg.evaluated_events.clone(),
        }
    }

    pub fn should_evaluate(&self, event: &str) -> bool {
        self.evaluated_events.iter().any(|e| e == event)
    }

    pub fn check_command(&self, command: &str) -> RuleVerdict {
        for pat in &self.blocked {
            if pat.is_match(command) {
                debug!("blocked by local rule: {}", pat.as_str());
                return RuleVerdict::Deny(format!(
                    "Blocked by local safety rule: {}",
                    pat.as_str()
                ));
            }
        }
        for pat in &self.allowed {
            if pat.is_match(command) {
                debug!("allowed by local rule: {}", pat.as_str());
                return RuleVerdict::Allow;
            }
        }
        RuleVerdict::NeedsEval
    }

    pub fn check_file_path(&self, path: &str) -> RuleVerdict {
        for pat in &self.protected {
            if pat.is_match(path) {
                debug!("protected path: {}", pat.as_str());
                return RuleVerdict::Deny(format!("Protected path matched: {}", pat.as_str()));
            }
        }
        RuleVerdict::NeedsEval
    }

    pub fn should_skip_tool(&self, tool_name: &str) -> bool {
        self.skip_tools.iter().any(|t| t == tool_name)
    }
}

fn compile_patterns(patterns: &[String]) -> Vec<Regex> {
    patterns
        .iter()
        .filter_map(|p| {
            Regex::new(p)
                .map_err(|e| tracing::warn!("invalid regex '{}': {}", p, e))
                .ok()
        })
        .collect()
}
