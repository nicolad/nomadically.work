/// 10 parallel DeepSeek agents to enhance an application's agentic coding section.
/// Agent #10 uses Semantic Scholar for research-backed insights.
use crate::agent::Client;
use crate::d1::D1Client;
use crate::tools::{GetPaperDetail, SearchPapers};
use anyhow::{Context, Result};
use semantic_scholar::SemanticScholarClient;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::sync::Arc;
use tracing::{error, info};

// ─── AgenticCoding JSON shape (matches GraphQL schema) ─────────────────────

#[derive(Debug, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct AgenticCoding {
    pub overview: String,
    #[serde(default)]
    pub workflow_pattern: String,
    #[serde(default)]
    pub exercises: Vec<Exercise>,
    #[serde(default)]
    pub prompt_templates: Vec<PromptTemplate>,
    #[serde(default)]
    pub qa_approach: String,
    #[serde(default)]
    pub failure_modes: Vec<FailureMode>,
    #[serde(default)]
    pub team_practices: String,
    #[serde(default)]
    pub measurable_outcomes: Vec<Outcome>,
    #[serde(default)]
    pub resources: Vec<Resource>,
    #[serde(default)]
    pub research_insights: String,
    pub generated_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Exercise {
    pub title: String,
    pub description: String,
    pub difficulty: String,
    pub skills: Vec<String>,
    pub hints: Vec<String>,
    pub agent_prompt: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PromptTemplate {
    pub title: String,
    pub purpose: String,
    pub stack_context: String,
    pub prompt: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FailureMode {
    pub scenario: String,
    pub why: String,
    pub alternative: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Outcome {
    pub task: String,
    pub before_time: String,
    pub after_time: String,
    pub improvement: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Resource {
    pub title: String,
    pub url: String,
    pub description: String,
}

// ─── Application row from D1 ───────────────────────────────────────────────

#[derive(Debug, Deserialize)]
struct AppRow {
    job_title: Option<String>,
    company_name: Option<String>,
    job_description: Option<String>,
}

// ─── Main entry point ───────────────────────────────────────────────────────

pub async fn run(
    app_id: i64,
    api_key: &str,
    scholar: &SemanticScholarClient,
    d1: &D1Client,
) -> Result<()> {
    // 1. Fetch application from D1
    let rows = d1
        .query(
            "SELECT job_title, company_name, job_description FROM applications WHERE id = ?1",
            vec![json!(app_id)],
        )
        .await
        .context("fetching application from D1")?;

    let row_val = rows.into_iter().next().context("Application not found")?;
    let app: AppRow = serde_json::from_value(row_val).context("parsing application row")?;

    let job_title = app.job_title.unwrap_or_else(|| "software engineer".into());
    let company = app.company_name.unwrap_or_else(|| "the company".into());
    let job_desc = app
        .job_description
        .context("No job description on this application")?;

    // Strip HTML tags and limit
    let plain_desc = job_desc
        .replace(|c: char| c == '<', " <")
        .split('<')
        .map(|s| {
            if let Some(idx) = s.find('>') {
                &s[idx + 1..]
            } else {
                s
            }
        })
        .collect::<Vec<_>>()
        .join(" ")
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ");
    let plain_desc = if plain_desc.len() > 8000 {
        &plain_desc[..8000]
    } else {
        &plain_desc
    };

    let ctx = format!("Role: {job_title} at {company}\n\nJob Description:\n{plain_desc}");

    info!(app_id, job_title = %job_title, company = %company, "Fetched application, spawning 10 agents");

    // 2. Spawn 10 parallel agents
    let api_key = Arc::new(api_key.to_string());
    let ctx = Arc::new(ctx);
    let scholar = Arc::new(scholar.clone());

    let sections: Vec<(&str, SectionDef)> = vec![
        ("overview", SectionDef {
            system: "You are a senior AI engineering coach. Return ONLY valid JSON — no markdown fences, no extra commentary.",
            prompt_template: "{ctx}\n\nWrite 4–5 paragraphs explaining HOW and WHERE agentic coding (Claude Code, Cursor, Copilot Workspace, Devin, etc.) changes the day-to-day work for this specific role. Reference the technologies and responsibilities from the JD directly. Explain which skills become MORE important in an agentic workflow (architecture thinking, prompt engineering, verification, code review). Be specific — not generic.\n\nReturn JSON: {{\"overview\": \"...\"}}",
            max_tokens: 1500,
            use_scholar: false,
        }),
        ("workflowPattern", SectionDef {
            system: "You are a senior AI engineering coach. Return ONLY valid JSON — no markdown fences, no extra commentary.",
            prompt_template: "{ctx}\n\nDescribe a concrete, realistic 30-minute development session using AI agents for a task directly relevant to this role (pick a task from the JD). Walk through it step by step: what tool to open, what prompt to write, what to review, how to iterate, how to verify. Then write a short before/after comparison paragraph. Use markdown headers and bullet points.\n\nReturn JSON: {{\"workflowPattern\": \"...\"}}",
            max_tokens: 1500,
            use_scholar: false,
        }),
        ("exercises", SectionDef {
            system: "You are a senior AI engineering coach. Return ONLY valid JSON — no markdown fences, no extra commentary.",
            prompt_template: "{ctx}\n\nCreate 4 agentic coding exercises directly derived from the technologies and responsibilities in this job description. For each exercise the agentPrompt must be a complete, multi-step prompt (150+ words) ready to paste into Claude Code or Cursor that covers: analyse the codebase → plan → implement → write tests → explain trade-offs.\n\nReturn JSON: {{\"exercises\": [{{\"title\":\"...\",\"description\":\"...\",\"difficulty\":\"easy|medium|hard\",\"skills\":[\"...\"],\"hints\":[\"...\"],\"agentPrompt\":\"...\"}}]}}",
            max_tokens: 3000,
            use_scholar: false,
        }),
        ("promptTemplates", SectionDef {
            system: "You are a senior AI engineering coach. Return ONLY valid JSON — no markdown fences, no extra commentary.",
            prompt_template: "{ctx}\n\nCreate 4 prompt templates a developer in this exact role would use daily. Each template must be immediately usable — not generic. Tailor them to the specific stack and responsibilities in the JD. Each prompt field should be 80–150 words.\n\nReturn JSON: {{\"promptTemplates\": [{{\"title\":\"...\",\"purpose\":\"one sentence\",\"stackContext\":\"which layer/situation\",\"prompt\":\"...\"}}]}}",
            max_tokens: 2500,
            use_scholar: false,
        }),
        ("qaApproach", SectionDef {
            system: "You are a senior AI engineering coach. Return ONLY valid JSON — no markdown fences, no extra commentary.",
            prompt_template: "{ctx}\n\nDescribe how a senior engineer in this role would rigorously validate AI-generated code. Be specific to the JD's tech stack. Cover: static analysis tools and configs, test coverage thresholds and strategies, security scanning for hallucinated or outdated dependencies, and a code review checklist specifically for AI output. Write 3 substantial paragraphs.\n\nReturn JSON: {{\"qaApproach\": \"...\"}}",
            max_tokens: 1500,
            use_scholar: false,
        }),
        ("failureModes", SectionDef {
            system: "You are a senior AI engineering coach. Return ONLY valid JSON — no markdown fences, no extra commentary.",
            prompt_template: "{ctx}\n\nIdentify 4 concrete scenarios from this specific role's domain where using AI coding agents is the wrong approach. For each: name the scenario clearly, explain precisely why agents fail or are inappropriate, and give a concrete alternative.\n\nReturn JSON: {{\"failureModes\": [{{\"scenario\":\"...\",\"why\":\"...\",\"alternative\":\"...\"}}]}}",
            max_tokens: 1500,
            use_scholar: false,
        }),
        ("teamPractices", SectionDef {
            system: "You are a senior AI engineering coach. Return ONLY valid JSON — no markdown fences, no extra commentary.",
            prompt_template: "{ctx}\n\nWrite 3 paragraphs on how to roll out agentic coding practices across a team for this type of role — especially when mentoring junior developers. Cover: writing a .cursorrules or CLAUDE.md file, building a shared prompt library, establishing code review processes for AI-generated code, and ensuring juniors learn fundamentals.\n\nReturn JSON: {{\"teamPractices\": \"...\"}}",
            max_tokens: 1500,
            use_scholar: false,
        }),
        ("measurableOutcomes", SectionDef {
            system: "You are a senior AI engineering coach. Return ONLY valid JSON — no markdown fences, no extra commentary.",
            prompt_template: "{ctx}\n\nCreate 4 believable, anecdotal before/after impact examples for a developer in this specific role using AI coding agents. Each example should feel realistic and be directly tied to tasks mentioned in the JD. The improvement field should capture qualitative value beyond just time savings.\n\nReturn JSON: {{\"measurableOutcomes\": [{{\"task\":\"...\",\"beforeTime\":\"...\",\"afterTime\":\"...\",\"improvement\":\"...\"}}]}}",
            max_tokens: 1000,
            use_scholar: false,
        }),
        ("resources", SectionDef {
            system: "You are a senior AI engineering coach. Return ONLY valid JSON — no markdown fences, no extra commentary.",
            prompt_template: "{ctx}\n\nList 5 real, stable, well-known URLs for learning agentic coding practices relevant to this specific tech stack and role. Only include official documentation, major GitHub repos, or widely-cited guides. For each give a clear title and one-sentence description.\n\nReturn JSON: {{\"resources\": [{{\"title\":\"...\",\"url\":\"...\",\"description\":\"...\"}}]}}",
            max_tokens: 800,
            use_scholar: false,
        }),
        ("researchInsights", SectionDef {
            system: "You are a research analyst specializing in AI-assisted software engineering. You have access to the Semantic Scholar API to find real academic papers.",
            prompt_template: "{ctx}\n\nSearch for academic papers about AI-assisted coding, LLM code generation, and developer productivity with AI tools. Find papers relevant to this specific role and tech stack.\n\nAfter researching, write a markdown section with:\n## Research-Backed Insights\n- 3-5 key findings from real papers, each with citation\n- How they apply specifically to this role\n- Quantitative productivity data if available\n- Risks and limitations identified in the literature\n\nReturn JSON: {{\"researchInsights\": \"...the markdown content...\"}}",
            max_tokens: 2000,
            use_scholar: true,
        }),
    ];

    let mut handles = Vec::with_capacity(sections.len());

    for (name, def) in sections {
        let api_key = Arc::clone(&api_key);
        let ctx = Arc::clone(&ctx);
        let scholar = Arc::clone(&scholar);

        let handle = tokio::spawn(async move {
            info!(section = name, "Agent starting");
            let result = run_section_agent(name, &def, &api_key, &ctx, &scholar).await;
            match &result {
                Ok(val) => info!(section = name, len = val.to_string().len(), "Agent done"),
                Err(e) => error!(section = name, "Agent failed: {e}"),
            }
            (name, result)
        });

        handles.push(handle);
    }

    // 3. Collect results
    let mut data = AgenticCoding {
        generated_at: chrono::Utc::now().to_rfc3339(),
        ..Default::default()
    };

    let mut successes = 0;
    let mut failures = 0;

    for handle in handles {
        let (name, result) = handle.await.context("task panicked")?;
        match result {
            Ok(val) => {
                apply_section(&mut data, name, val);
                successes += 1;
            }
            Err(e) => {
                error!(section = name, "Failed: {e}");
                failures += 1;
            }
        }
    }

    info!(successes, failures, "All 10 agents complete");

    if data.overview.is_empty() {
        anyhow::bail!("Overview agent failed — cannot save incomplete data");
    }

    // 4. Write back to D1
    let json_str = serde_json::to_string(&data)?;
    d1.execute(
        "UPDATE applications SET ai_agentic_coding = ?1, updated_at = datetime('now') WHERE id = ?2",
        vec![json_str.into(), json!(app_id)],
    )
    .await
    .context("writing agentic coding data to D1")?;

    info!(app_id, "Agentic coding data saved to D1");
    Ok(())
}

// ─── Section definition ─────────────────────────────────────────────────────

struct SectionDef {
    system: &'static str,
    prompt_template: &'static str,
    max_tokens: u32,
    use_scholar: bool,
}

// ─── Run a single section agent ─────────────────────────────────────────────

async fn run_section_agent(
    _name: &str,
    def: &SectionDef,
    api_key: &str,
    ctx: &str,
    scholar: &SemanticScholarClient,
) -> Result<Value> {
    let prompt = def.prompt_template.replace("{ctx}", ctx);

    if def.use_scholar {
        // Agent #10: uses tool-calling loop with Semantic Scholar
        let client = Client::new(api_key);
        let agent = client
            .agent("deepseek-chat")
            .preamble(def.system)
            .tool(SearchPapers(scholar.clone()))
            .tool(GetPaperDetail(scholar.clone()))
            .build();

        let raw = agent.prompt(prompt).await?;
        Ok(try_parse_json(&raw))
    } else {
        // Agents #1-9: direct chat call, no tools
        let http = reqwest::Client::new();
        let body = json!({
            "model": "deepseek-chat",
            "messages": [
                {"role": "system", "content": def.system},
                {"role": "user", "content": prompt},
            ],
            "max_tokens": def.max_tokens,
            "temperature": 1.3,
        });

        let resp: Value = http
            .post("https://api.deepseek.com/v1/chat/completions")
            .bearer_auth(api_key)
            .json(&body)
            .send()
            .await
            .context("DeepSeek API request failed")?
            .error_for_status()
            .context("DeepSeek API error")?
            .json()
            .await
            .context("parsing DeepSeek response")?;

        let raw = resp["choices"][0]["message"]["content"]
            .as_str()
            .unwrap_or("")
            .replace("```json\n", "")
            .replace("```\n", "")
            .replace("```", "")
            .trim()
            .to_string();

        Ok(try_parse_json(&raw))
    }
}

/// Parse JSON from LLM output, handling markdown fences and embedded JSON.
fn try_parse_json(raw: &str) -> Value {
    // Try direct parse
    if let Ok(v) = serde_json::from_str::<Value>(raw) {
        return v;
    }
    // Try extracting first {...} block
    if let Some(start) = raw.find('{') {
        let sub = &raw[start..];
        // Find matching closing brace
        let mut depth = 0;
        for (i, c) in sub.char_indices() {
            match c {
                '{' => depth += 1,
                '}' => {
                    depth -= 1;
                    if depth == 0 {
                        if let Ok(v) = serde_json::from_str::<Value>(&sub[..=i]) {
                            return v;
                        }
                        break;
                    }
                }
                _ => {}
            }
        }
    }
    json!({})
}

/// Apply a parsed JSON section to the AgenticCoding struct.
fn apply_section(data: &mut AgenticCoding, name: &str, val: Value) {
    match name {
        "overview" => {
            data.overview = val["overview"].as_str().unwrap_or("").into();
        }
        "workflowPattern" => {
            data.workflow_pattern = val["workflowPattern"].as_str().unwrap_or("").into();
        }
        "exercises" => {
            if let Ok(ex) = serde_json::from_value(val["exercises"].clone()) {
                data.exercises = ex;
            }
        }
        "promptTemplates" => {
            if let Ok(pt) = serde_json::from_value(val["promptTemplates"].clone()) {
                data.prompt_templates = pt;
            }
        }
        "qaApproach" => {
            data.qa_approach = val["qaApproach"].as_str().unwrap_or("").into();
        }
        "failureModes" => {
            if let Ok(fm) = serde_json::from_value(val["failureModes"].clone()) {
                data.failure_modes = fm;
            }
        }
        "teamPractices" => {
            data.team_practices = val["teamPractices"].as_str().unwrap_or("").into();
        }
        "measurableOutcomes" => {
            if let Ok(mo) = serde_json::from_value(val["measurableOutcomes"].clone()) {
                data.measurable_outcomes = mo;
            }
        }
        "resources" => {
            if let Ok(r) = serde_json::from_value(val["resources"].clone()) {
                data.resources = r;
            }
        }
        "researchInsights" => {
            data.research_insights = val["researchInsights"].as_str().unwrap_or("").into();
        }
        _ => {}
    }
}
