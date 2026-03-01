use crate::deepseek::DeepSeek;
use crate::rules::RulesEngine;

pub struct AppState {
    pub deepseek: DeepSeek,
    pub rules: RulesEngine,
}
