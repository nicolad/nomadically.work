use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use std::path::Path;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResearchContext {
    pub topic: String,
    pub focus_areas: Vec<String>,
    pub year: Option<String>,
    pub min_citations: Option<u32>,
}

impl ResearchContext {
    pub fn new(topic: &str, focus_areas: Vec<String>) -> Self {
        Self {
            topic: topic.into(),
            focus_areas,
            year: Some("2020-".into()),
            min_citations: Some(5),
        }
    }

    pub fn from_file(path: &Path) -> Result<Self> {
        let content = std::fs::read_to_string(path).with_context(|| format!("reading {path:?}"))?;
        serde_json::from_str(&content).with_context(|| "parsing research context JSON")
    }

    pub fn build_agent_prompt(&self) -> String {
        let focus_str = self.focus_areas.join(", ");
        let queries = self.generate_queries();
        let queries_block = queries
            .iter()
            .enumerate()
            .map(|(i, q)| format!("  {}. \"{}\"", i + 1, q))
            .collect::<Vec<_>>()
            .join("\n");

        format!(
            r#"You are a research analyst for **nomadically.work** — a remote EU job board aggregator.
Your job: search academic and industry literature for actionable insights to improve job classification, skill matching, and remote EU job discovery.

## Research Topic
- **Topic:** {topic}
- **Focus Areas:** {focus}

## Research Task

Search for papers relevant to **{topic}** in the context of job board aggregation.

**Run searches for each of these queries** (use search_papers for each):
{queries_block}

For the most promising 4–5 papers, call get_paper_detail to get their full abstract and TLDR.

**Prioritise:**
1. Papers with concrete implementations, algorithms, or benchmarks
2. EU-specific research (ESCO taxonomy, EU AI Act, GDPR)
3. NLP/ML techniques for job classification, skill extraction, resume matching
4. Remote work patterns, distributed team dynamics
5. Papers with ≥5 citations from 2020+

## Required Output Format

Return a structured markdown report:

```markdown
# Research Insights — {topic}

## Executive Summary
(2–3 sentences on the most important findings)

## Papers Reviewed

### [1] <Title> (<Year>, <N> citations)
- **Authors:** ...
- **Relevance:** high | medium | low
- **Domain:** ...
- **Key Finding:** (1–2 sentences)
- **Actionable Insight:** (specific implementation idea for nomadically.work)
- **Confidence:** high | medium | low
- **Source:** <url>

... (4–6 papers minimum)

## Aggregated Insights

| Insight | Source Papers | Implementation Priority |
|---------|---------------|------------------------|
| ... | [1, 2] | P0 (immediate) / P1 / P2 |

## Implementation Roadmap

### P0 (Immediate — This Week)
- ...

### P1 (Next Sprint)
- ...

### P2 (Backlog)
- ...

## Open Questions
- ...

## Confidence Assessment
- Total papers reviewed: N
- With code/benchmarks: N
- EU-specific: N
- Overall confidence: X%
```
"#,
            topic = self.topic,
            focus = focus_str,
            queries_block = queries_block,
        )
    }

    fn generate_queries(&self) -> Vec<String> {
        let mut queries = vec![self.topic.clone()];

        for area in &self.focus_areas {
            queries.push(format!("{} {}", self.topic, area));
        }

        queries.push(format!("{} job board recruitment platform", self.topic));
        queries.push(format!(
            "{} NLP machine learning classification",
            self.topic
        ));
        queries.push(format!("{} European Union remote work", self.topic));

        queries
    }
}
