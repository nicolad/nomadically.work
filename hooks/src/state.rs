use crate::deepseek::DeepSeek;
use crate::metrics::Metrics;
use crate::rules::RulesEngine;

pub struct AppState {
    pub deepseek: DeepSeek,
    pub rules: RulesEngine,
    pub metrics: Metrics,
}
