/// 10 parallel DeepSeek agents to enhance an application's agentic coding section.
/// Agent #10 uses Semantic Scholar for research-backed insights.
///
/// Uses [`TeamLead`] + [`TaskQueue`] for dynamic claiming, retry (max 2 attempts),
/// and cooperative shutdown — matching the agent-teams coordination model.
use crate::agent::Client;
use crate::app_context::AppContext;
use crate::d1::D1Client;
use crate::team::{shutdown_pair, Mailbox, TaskQueue, TeamLead};
use crate::tools::{GetPaperDetail, SearchPapers};
use anyhow::{Context, Result};
use semantic_scholar::SemanticScholarClient;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::sync::Arc;
use tokio::sync::Mutex;
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

// ─── Section definition ─────────────────────────────────────────────────────

#[derive(Clone, Copy)]
struct SectionDef {
    system: &'static str,
    prompt_template: &'static str,
    max_tokens: u32,
    use_scholar: bool,
}

// Section name + definition pairs, ordered for dependency-aware queueing.
// The `researchInsights` section (use_scholar = true) is pushed last so it can
// optionally depend on other sections' IDs in future if needed.
const SECTIONS: &[(&str, SectionDef)] = &[
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
        system: "You are a research analyst specializing in AI-assisted software engineering.",
        prompt_template: "{ctx}\n\nSearch for academic papers about AI-assisted coding, LLM code generation, and developer productivity with AI tools. Find papers relevant to this specific role and tech stack.\n\nAfter researching, write a markdown section with:\n## Research-Backed Insights\n- 3-5 key findings from real papers, each with citation\n- How they apply specifically to this role\n- Quantitative productivity data if available\n- Risks and limitations identified in the literature\n\nReturn JSON: {{\"researchInsights\": \"...the markdown content...\"}}",
        max_tokens: 2000,
        use_scholar: true,
    }),
];

// ─── Main entry point ───────────────────────────────────────────────────────

pub async fn run(
    ctx: &AppContext,
    api_key: &str,
    scholar: &SemanticScholarClient,
    d1: &D1Client,
) -> Result<()> {
    let app_id = ctx.app_id;
    let job_ctx = ctx.job_ctx();
    info!(
        app_id,
        job_title = %ctx.job_title,
        company = %ctx.company_name,
        "Queuing 10 agentic-coding tasks"
    );

    // 2. Build task queue — sections independent, up to 2 attempts each.
    let queue: TaskQueue<(&'static str, SectionDef)> = TaskQueue::new();
    for (name, def) in SECTIONS {
        queue.push(*name, (*name, *def), vec![], 2).await;
    }

    // 3. Shared result store that workers write into as they complete.
    let results = Arc::new(Mutex::new(AgenticCoding {
        generated_at: chrono::Utc::now().to_rfc3339(),
        ..Default::default()
    }));

    let api_key = Arc::new(api_key.to_string());
    let job_ctx = Arc::new(job_ctx);
    let scholar = Arc::new(scholar.clone());
    let results_clone = Arc::clone(&results);

    // 4. Team lead with 10 workers.
    let mailbox = Mailbox::new();
    let (_shutdown_tx, shutdown) = shutdown_pair();
    let summary = TeamLead::new(SECTIONS.len())
        .run(queue, mailbox, shutdown, move |ctx, task| {
            let api_key = Arc::clone(&api_key);
            let job_ctx = Arc::clone(&job_ctx);
            let scholar = Arc::clone(&scholar);
            let results = Arc::clone(&results_clone);
            let (section_name, def) = task.payload;
            async move {
                info!(worker = %ctx.worker_id, section = %section_name, "Agentic-coding agent starting");
                let val = run_section_agent(section_name, def, &api_key, &job_ctx, &scholar).await?;
                let mut data = results.lock().await;
                apply_section(&mut data, section_name, val);
                info!(worker = %ctx.worker_id, section = %section_name, "Agentic-coding agent done");
                Ok::<(), anyhow::Error>(())
            }
        })
        .await;

    info!(
        completed = summary.completed,
        failed = summary.failed,
        total = summary.total(),
        "All agentic-coding workers finished"
    );

    // 5. overview is load-bearing — bail if it failed.
    let data_guard = results.lock().await;
    if data_guard.overview.is_empty() {
        anyhow::bail!("Overview section failed — cannot save incomplete data");
    }
    drop(data_guard);

    // 6. Write back to D1
    let data = Arc::try_unwrap(results)
        .map_err(|_| anyhow::anyhow!("results Arc still held — this is a bug"))?
        .into_inner();
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

// ─── Run a single section agent ─────────────────────────────────────────────

async fn run_section_agent(
    name: &str,
    def: SectionDef,
    api_key: &str,
    ctx: &str,
    scholar: &SemanticScholarClient,
) -> Result<Value> {
    let prompt = def.prompt_template.replace("{ctx}", ctx);

    if def.use_scholar {
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

        let val = try_parse_json(&raw);
        if val.as_object().is_none_or(|o| o.is_empty()) {
            error!(section = %name, "Failed to parse JSON for section");
        }
        Ok(val)
    }
}

/// Parse JSON from LLM output, handling markdown fences and embedded JSON.
fn try_parse_json(raw: &str) -> Value {
    if let Ok(v) = serde_json::from_str::<Value>(raw) {
        return v;
    }
    if let Some(start) = raw.find('{') {
        let sub = &raw[start..];
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
