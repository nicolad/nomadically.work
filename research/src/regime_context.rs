use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use std::path::Path;

/// Parsed context from the Learner's cycle report JSON.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RegimeContext {
    pub cycle: u32,
    /// e.g. "TRENDING/Downtrend", "MEANREVERTING", "HIGHVOL"
    pub regime: String,
    /// 0.0–1.0
    pub regime_confidence: f64,
    /// e.g. ["SOL", "XRP", "DOGE"]
    pub symbols: Vec<String>,
    /// inferred: "scalping" | "bollinger" | "rsi" | "dca"
    pub strategy_type: String,
    pub thought: Option<String>,
    pub action: Option<String>,
    pub observation: Option<String>,
    pub rationale: Option<String>,
}

impl RegimeContext {
    /// Load from a `cycle-{N}.json` file written by the Learner.
    pub fn from_cycle_report(path: &Path) -> Result<Self> {
        let content =
            std::fs::read_to_string(path).with_context(|| format!("reading {path:?}"))?;
        let report: CycleReport =
            serde_json::from_str(&content).with_context(|| "parsing cycle report JSON")?;

        let symbols: Vec<String> = report
            .asset
            .split(',')
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty())
            .collect();

        let strategy_type = infer_strategy(&report.regime);

        Ok(RegimeContext {
            cycle: report.cycle,
            regime: report.regime,
            regime_confidence: report.regime_confidence,
            symbols,
            strategy_type,
            thought: report.thought,
            action: report.action,
            observation: report.observation,
            rationale: report.rationale,
        })
    }

    /// Build the prompt sent to the DeepSeek Reasoner agent.
    pub fn build_agent_prompt(&self) -> String {
        let symbols_str = self.symbols.join(", ");
        let regime_lower = self.regime.to_lowercase();
        let confidence_pct = (self.regime_confidence * 100.0) as u32;

        // Regime-specific search queries — cover the topic from multiple angles
        let queries = regime_search_queries(&self.regime, &self.strategy_type);
        let queries_block = queries
            .iter()
            .enumerate()
            .map(|(i, q)| format!("  {}. \"{}\"", i + 1, q))
            .collect::<Vec<_>>()
            .join("\n");

        // Previous cycle context (if available)
        let prev_context = match (&self.observation, &self.action) {
            (Some(obs), Some(act)) => format!(
                "\n## Previous Cycle Context\n- **Observation:** {obs}\n- **Recommended action:** {act}\n"
            ),
            _ => String::new(),
        };

        format!(
            r#"You are a quantitative research analyst for a systematic crypto trading firm.
Your job: search academic literature and return parameter recommendations backed by peer-reviewed evidence.

## Current Market Regime
- **Regime:** {regime} (confidence: {confidence_pct}%)
- **Active Symbols:** {symbols}
- **Primary Strategy:** {strategy}
{prev_context}
## Research Task

Search for academic papers relevant to the **{regime}** regime and **{strategy}** strategy in crypto markets.

**Run searches for each of these queries** (use search_papers for each):
{queries_block}

Also search: "take profit stop loss optimal {strategy_lower} {regime_lower} cryptocurrency"

For the most promising 3–4 papers, call get_paper_detail to get their full abstract and TLDR.

**Prioritise:**
1. Crypto-specific papers (2018+) over equities research
2. Papers with explicit parameter ranges (TP%, SL%, indicator periods)
3. Walk-forward or out-of-sample validated results
4. Papers with ≥5 citations

## Required Output Format

Return a structured markdown report in EXACTLY this format:

```markdown
# Research Insights — Cycle {cycle}

## Regime: {regime} ({confidence_pct}% confidence)
## Strategy: {strategy}
## Symbols: {symbols}

## Papers Reviewed

### [1] <Title> (<Year>, <N> citations)
- **Authors:** ...
- **Relevance:** high | medium | low
- **Domain:** crypto | equities | derivatives
- **Key Finding:** (1–2 sentences: what did this paper conclude about strategy performance?)
- **Param Insight:** TP: X–Y%, SL: X–Y%, Period: N–M  ← extract from paper if available
- **Source:** <url>

... (one block per paper, at least 4 papers)

## Aggregated Recommendations

Based on the literature, for **{regime}** regime using **{strategy}** on {symbols}:

| Parameter | Literature Range | Notes |
|-----------|-----------------|-------|
| fast_period | N–M | ... |
| slow_period | N–M | ... |
| tp_pct | X.X–Y.Y | ... |
| sl_pct | X.X–Y.Y | ... |
| rsi_period | N–M | only if RSI strategy |
| bb_period | N–M | only if Bollinger strategy |

## Confidence Assessment
- Total papers reviewed: N
- Crypto-specific: N
- Post-2018: N
- Parameter-level specificity: N
- Overall confidence: X%

## Recommended Optimizer Grid

```json
{{
  "strategy_type": "{strategy}",
  "research_confidence": 0.XX,
  "grid": {{
    "fast_period": [A, B, C],
    "slow_period": [D, E, F],
    "tp_pct": [X.X, Y.Y, Z.Z],
    "sl_pct": [X.X, Y.Y, Z.Z]
  }}
}}
```
```

The JSON grid block is machine-parsed by the Spawner — it MUST be valid JSON."#,
            regime = self.regime,
            confidence_pct = confidence_pct,
            symbols = symbols_str,
            strategy = self.strategy_type,
            strategy_lower = self.strategy_type,
            regime_lower = regime_lower,
            queries_block = queries_block,
            prev_context = prev_context,
            cycle = self.cycle,
        )
    }
}

/// Map regime string → set of targeted Semantic Scholar queries.
fn regime_search_queries(regime: &str, strategy: &str) -> Vec<String> {
    let r = regime.to_lowercase();
    let is_trending = r.contains("trending") || r.contains("momentum");
    let is_meanrev = r.contains("mean") || r.contains("revert") || r.contains("sideways");
    let is_highvol = r.contains("highvol") || r.contains("volatile");
    let is_down = r.contains("down");

    let mut queries = vec![
        format!("{} strategy cryptocurrency parameter optimization", strategy),
        format!("crypto {} regime trading performance", regime.split('/').next().unwrap_or(regime)),
    ];

    if is_trending && is_down {
        queries.push("trend following downtrend cryptocurrency alpha decay".into());
        queries.push("EMA crossover downtrend altcoin take profit stop loss".into());
        queries.push("momentum strategy bear market crypto performance".into());
    } else if is_trending {
        queries.push("trend following momentum cryptocurrency EMA crossover".into());
        queries.push("momentum trading crypto optimal holding period".into());
    }

    if is_meanrev {
        queries.push("mean reversion Bollinger Bands RSI cryptocurrency sideways market".into());
        queries.push("RSI oversold bounce crypto short-term mean reversion".into());
        queries.push("pairs trading cointegration crypto mean reversion".into());
    }

    if is_highvol {
        queries.push("high volatility regime breakout strategy risk management crypto".into());
        queries.push("volatility clustering crypto stop loss optimal sizing".into());
    }

    // Always include micro-structure query
    queries.push("cryptocurrency market microstructure order flow intraday".into());
    queries.push(format!("optimal take profit stop loss {} trading cryptocurrency", strategy));

    queries
}

fn infer_strategy(regime: &str) -> String {
    let r = regime.to_lowercase();
    if r.contains("trending") || r.contains("momentum") {
        "scalping".into()
    } else if r.contains("mean") || r.contains("revert") || r.contains("sideways") || r.contains("low") {
        "bollinger".into()
    } else if r.contains("highvol") || r.contains("volatile") {
        "rsi".into()
    } else {
        "rsi".into()
    }
}

// ─── raw deserialization of cycle-{N}.json ──────────────────────────────────

#[derive(Deserialize)]
struct CycleReport {
    cycle: u32,
    asset: String,
    regime: String,
    regime_confidence: f64,
    thought: Option<String>,
    action: Option<String>,
    observation: Option<String>,
    rationale: Option<String>,
}
