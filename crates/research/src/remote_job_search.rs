/// 15 parallel DeepSeek agents researching how to land a fully remote AI/ML
/// engineering role in the EU, backed by Semantic Scholar paper search, saving
/// results to D1.
///
/// Uses [`TeamLead`] + [`TaskQueue`] for dynamic claiming, retry (max 2 attempts),
/// and cooperative shutdown — matching the agent-teams coordination model.
use crate::agent::Client;
use crate::d1::{D1Client, StudyTopicRow};
use crate::study::TopicDef;
use crate::team::{shutdown_pair, Mailbox, TaskQueue, TeamLead};
use crate::tools::{GetPaperDetail, SearchPapers};
use anyhow::{Context, Result};
use semantic_scholar::SemanticScholarClient;
use std::sync::Arc;
use tracing::info;

const CATEGORY: &str = "remote-job-search";

pub const TOPICS: &[TopicDef] = &[
    TopicDef {
        slug: "ai-engineer-job-market-2025",
        title: "AI/ML Engineering Job Market Landscape 2025-2026",
        difficulty: "intermediate",
        tags: &["job-market", "AI-engineering", "hiring-trends", "remote"],
        search_queries: &[
            "AI engineer job market trends 2024 2025",
            "machine learning engineer hiring demand remote",
        ],
        prompt_focus: "Current AI/ML hiring landscape: which roles are in highest demand, which companies hire remotely in EU, remote vs hybrid ratios, compensation trends for AI engineers.",
    },
    TopicDef {
        slug: "ai-ml-skill-signals-hiring",
        title: "AI/ML Skill Signals That Drive Hiring Decisions",
        difficulty: "advanced",
        tags: &["skills", "hiring-signals", "LLMs", "MLOps"],
        search_queries: &[
            "AI skills hiring signals machine learning engineers",
            "LLM engineering skills employer demand 2024",
        ],
        prompt_focus: "Which AI skills (LLMs, MLOps, agents, fine-tuning, RAG, embeddings) signal strongest in hiring pipelines. What technical skills differentiate candidates for AI engineering roles.",
    },
    TopicDef {
        slug: "ai-engineer-resume-optimization",
        title: "Resume Optimization for AI Engineering Roles",
        difficulty: "intermediate",
        tags: &["resume", "ATS", "optimization", "AI-roles"],
        search_queries: &[
            "resume optimization software engineering ATS systems",
            "CV keyword matching machine learning hiring",
        ],
        prompt_focus: "Resume/CV optimization for AI roles: ATS keyword matching, skill framing, project descriptions, quantifying ML impact. What recruiters scan for in AI engineer resumes.",
    },
    TopicDef {
        slug: "ai-technical-interview-prep",
        title: "AI/ML Technical Interview Preparation Strategies",
        difficulty: "advanced",
        tags: &["interviews", "system-design", "ML-theory", "coding"],
        search_queries: &[
            "machine learning technical interview preparation",
            "AI system design interview assessment methods",
        ],
        prompt_focus: "AI/ML technical interviews: ML system design, coding challenges, ML theory questions, take-home projects, live coding assessments. What top companies test and how to prepare.",
    },
    TopicDef {
        slug: "ai-portfolio-projects-hiring",
        title: "Portfolio-Based Hiring for AI Engineers",
        difficulty: "intermediate",
        tags: &["portfolio", "open-source", "projects", "hiring"],
        search_queries: &[
            "portfolio projects hiring software engineers",
            "open source contributions developer hiring signal",
        ],
        prompt_focus: "Portfolio-based hiring for AI: which projects impress hiring managers, OSS contributions as signals, demo apps, GitHub profile optimization, writing technical blog posts.",
    },
    TopicDef {
        slug: "networking-referrals-tech-jobs",
        title: "Networking and Referral Impact on Tech Hiring",
        difficulty: "intermediate",
        tags: &["networking", "referrals", "outreach", "communities"],
        search_queries: &[
            "employee referral hiring probability tech industry",
            "professional networking job search effectiveness",
        ],
        prompt_focus: "Referral impact on hiring probability, cold outreach effectiveness, developer community engagement, conference networking, LinkedIn strategies for AI engineers.",
    },
    TopicDef {
        slug: "job-search-platforms-ai-roles",
        title: "Job Platform Effectiveness for AI Roles",
        difficulty: "beginner",
        tags: &["platforms", "job-boards", "LinkedIn", "AI-hiring"],
        search_queries: &[
            "job search platform effectiveness technology roles",
            "specialized job boards AI machine learning engineering",
        ],
        prompt_focus: "Platform effectiveness for AI roles: LinkedIn, specialized AI job boards, company career pages, Wellfound, remote-specific boards. Which channels yield highest response rates.",
    },
    TopicDef {
        slug: "remote-ai-team-hiring-patterns",
        title: "Remote-First AI Team Hiring Patterns",
        difficulty: "advanced",
        tags: &["remote-first", "distributed", "hiring", "AI-teams"],
        search_queries: &[
            "remote first team hiring practices technology",
            "distributed AI team building onboarding patterns",
        ],
        prompt_focus: "How remote-first AI teams hire: async assessments, distributed onboarding, culture fit evaluation, timezone considerations, remote collaboration tool proficiency signals.",
    },
    TopicDef {
        slug: "eu-cross-border-ai-employment",
        title: "EU Cross-Border Employment for AI Engineers",
        difficulty: "advanced",
        tags: &["EU", "employment-law", "EOR", "cross-border"],
        search_queries: &[
            "cross-border remote employment European Union",
            "employer of record EU technology workers",
        ],
        prompt_focus: "EU employment for AI engineers: EOR platforms (Deel, Remote.com), contractor vs employee status, work permits, tax implications, which EU countries are most favorable for remote AI workers.",
    },
    TopicDef {
        slug: "salary-negotiation-ai-remote",
        title: "Salary Negotiation for Remote AI Engineers",
        difficulty: "intermediate",
        tags: &["salary", "negotiation", "compensation", "remote"],
        search_queries: &[
            "salary negotiation strategies software engineers",
            "remote work compensation AI engineer benchmarks",
        ],
        prompt_focus: "Compensation benchmarks for remote AI engineers in EU, location-adjusted pay, equity negotiation, negotiation research and frameworks, total compensation optimization.",
    },
    TopicDef {
        slug: "ai-recruiter-screening-signals",
        title: "What AI/ML Recruiters Screen For",
        difficulty: "intermediate",
        tags: &["recruiting", "screening", "signals", "GitHub"],
        search_queries: &[
            "technical recruiter screening criteria software",
            "GitHub profile hiring signal machine learning",
        ],
        prompt_focus: "What AI/ML recruiters screen for: GitHub activity, published papers, blog posts, conference talks, Kaggle rankings, certifications. Which signals actually correlate with interview invitations.",
    },
    TopicDef {
        slug: "application-timing-volume-strategy",
        title: "Optimal Application Timing and Volume Strategy",
        difficulty: "intermediate",
        tags: &["application-strategy", "timing", "volume", "follow-up"],
        search_queries: &[
            "job application timing volume hiring outcomes",
            "application follow-up strategy effectiveness",
        ],
        prompt_focus: "Optimal application volume, timing (day of week, time of year), quality-vs-quantity tradeoffs, follow-up email strategies, when to apply vs when to wait.",
    },
    TopicDef {
        slug: "ai-career-transition-positioning",
        title: "Career Positioning for AI Engineering Roles",
        difficulty: "intermediate",
        tags: &["career-transition", "positioning", "signaling", "AI"],
        search_queries: &[
            "career transition AI machine learning engineering",
            "signaling theory job market technology roles",
        ],
        prompt_focus: "Positioning existing software engineering experience for AI roles, bridging skill gaps, signaling theory applied to job search, credentialing strategies (courses, certifications, projects).",
    },
    TopicDef {
        slug: "llm-agent-engineer-specialization",
        title: "LLM/Agent Engineering as Emerging Specialization",
        difficulty: "advanced",
        tags: &["LLM-engineering", "agents", "specialization", "demand"],
        search_queries: &[
            "LLM engineer job role specialization 2024",
            "AI agent developer demand prompt engineering",
        ],
        prompt_focus: "LLM/agent engineering as emerging specialization: demand trajectory, differentiation from traditional ML, required tooling knowledge, how to position as an LLM/agent specialist.",
    },
    TopicDef {
        slug: "ai-job-search-automation-tools",
        title: "AI-Powered Job Search Automation Tools",
        difficulty: "beginner",
        tags: &["automation", "AI-tools", "job-search", "matching"],
        search_queries: &[
            "AI job search automation tools matching",
            "automated job application technology platforms",
        ],
        prompt_focus: "Using AI tools for job search: automated matching engines, cover letter generation, application tracking, interview scheduling, AI-powered resume tailoring. Effectiveness research.",
    },
];

// ─── Public entry points ─────────────────────────────────────────────────────

/// Run the full remote-job-search pipeline: 15 topics × 2 phases (search + write).
pub async fn run(api_key: &str, scholar: &SemanticScholarClient, d1: &D1Client) -> Result<()> {
    run_topics(api_key, scholar, d1).await
}

/// Read all 15 topic reports from D1 and produce a single master playbook.
pub async fn run_synthesis(api_key: &str, d1: &D1Client) -> Result<()> {
    info!("Synthesis — reading all {} topic reports from D1…", TOPICS.len());

    let rows = d1
        .query(
            "SELECT topic, title, body_md FROM study_topics WHERE category = ?1 AND topic != 'synthesis' ORDER BY topic",
            vec![CATEGORY.into()],
        )
        .await
        .context("failed to read topic reports from D1")?;

    if rows.is_empty() {
        anyhow::bail!("No topic reports found in D1 for category={CATEGORY}. Run the main pipeline first.");
    }

    info!("Found {} topic reports, synthesizing…", rows.len());

    let mut combined = String::new();
    for row in &rows {
        let title = row.get("title").and_then(|v| v.as_str()).unwrap_or("?");
        let body = row.get("body_md").and_then(|v| v.as_str()).unwrap_or("");
        combined.push_str(&format!("\n\n---\n# {title}\n\n{body}"));
    }

    let client = Client::new(api_key);

    let preamble = r#"You are a career strategy advisor for a senior software engineer seeking a fully remote AI/ML engineering position in the European Union in 2026.

You have just read 15 research reports covering every aspect of this job search — from market analysis to interview prep to salary negotiation.

Your task: Synthesize all 15 reports into a single, actionable MASTER PLAYBOOK. This is the definitive guide.

Write in this EXACT format — return ONLY the markdown body:

## Executive Summary
3-4 paragraphs: the state of the market, your strategic advantage, and the top 5 actions to take immediately.

## 90-Day Action Plan
Week-by-week breakdown. Concrete, time-boxed actions. Not vague advice — specific steps.

## Skill Stack Priorities
Ranked list of skills to highlight/develop, with rationale from the research.

## Application Strategy
Channels, timing, volume, tailoring approach — all backed by the research findings.

## Interview Preparation Framework
What to prepare, in what order, with specific resources and practice approaches.

## Networking & Visibility Plan
Specific actions to build visibility in the AI engineering community.

## EU Employment Logistics
EOR, tax, contracts — practical logistics distilled from the research.

## Salary & Negotiation Playbook
Benchmarks, strategies, and tactics backed by negotiation research.

## Common Mistakes to Avoid
Top 10 mistakes, synthesized across all 15 research reports.

## Key Statistics & Evidence
The most compelling data points from across all reports, cited with context.

Be specific, actionable, and data-backed. No fluff. This is a senior engineer's battle plan."#;

    let agent = client.agent("deepseek-chat").preamble(preamble).build();

    let body_md = agent
        .prompt(format!(
            "Synthesize these 15 research reports into a master job search playbook:\n{combined}"
        ))
        .await
        .context("synthesis agent failed")?;

    let summary = body_md
        .lines()
        .skip_while(|l| l.starts_with('#') || l.trim().is_empty())
        .take_while(|l| !l.trim().is_empty())
        .collect::<Vec<_>>()
        .join(" ");
    let summary = if summary.len() > 300 {
        format!("{}…", &summary[..297])
    } else {
        summary
    };

    let row = StudyTopicRow {
        category: CATEGORY.into(),
        topic: "synthesis".into(),
        title: "Master Job Search Playbook — Remote AI/ML Engineer in EU".into(),
        summary,
        body_md,
        difficulty: "advanced".into(),
        tags: vec!["synthesis".into(), "playbook".into(), "strategy".into()],
    };

    d1.insert_study_topic(&row)
        .await
        .context("D1 insert failed for synthesis")?;

    info!("Synthesis saved to D1 as {CATEGORY}/synthesis");
    Ok(())
}

// ─── Internal pipeline ───────────────────────────────────────────────────────

#[derive(Clone)]
enum ResearchTask {
    Search(TopicDef),
    Write(TopicDef),
}

async fn run_topics(
    api_key: &str,
    scholar: &SemanticScholarClient,
    d1: &D1Client,
) -> Result<()> {
    let api_key = Arc::new(api_key.to_string());
    let scholar = Arc::new(scholar.clone());
    let d1 = Arc::new(d1.clone());

    info!(
        "Queuing {} 2-step search→write tasks (category: {})…",
        TOPICS.len(),
        CATEGORY
    );

    let queue: TaskQueue<ResearchTask> = TaskQueue::new();
    for topic_def in TOPICS {
        let search_id = queue
            .push(
                format!("search:{}", topic_def.slug),
                ResearchTask::Search(*topic_def),
                vec![],
                2,
            )
            .await;
        queue
            .push(
                format!("write:{}", topic_def.slug),
                ResearchTask::Write(*topic_def),
                vec![search_id],
                2,
            )
            .await;
    }

    let mailbox = Mailbox::new();
    let (_shutdown_tx, shutdown) = shutdown_pair();
    let summary = TeamLead::new(TOPICS.len())
        .run(queue, mailbox, shutdown, move |ctx, task| {
            let api_key = Arc::clone(&api_key);
            let scholar = Arc::clone(&scholar);
            let d1 = Arc::clone(&d1);
            async move {
                match task.payload {
                    ResearchTask::Search(topic) => {
                        info!(worker = %ctx.worker_id, topic = topic.slug, "Search phase starting");
                        let findings = search_topic_papers(topic, &scholar, &api_key).await?;
                        ctx.mailbox
                            .send(
                                &ctx.worker_id,
                                format!("findings:{}", topic.slug),
                                "paper-findings",
                                findings,
                            )
                            .await;
                        info!(worker = %ctx.worker_id, topic = topic.slug, "Search phase done");
                    }
                    ResearchTask::Write(topic) => {
                        info!(worker = %ctx.worker_id, topic = topic.slug, "Write phase starting");
                        let env = ctx
                            .mailbox
                            .recv_wait(&format!("findings:{}", topic.slug))
                            .await;
                        let row = write_strategy_report(topic, &env.body, &api_key).await?;
                        d1.insert_study_topic(&row)
                            .await
                            .with_context(|| format!("D1 insert failed for {}", topic.slug))?;
                        info!(worker = %ctx.worker_id, topic = topic.slug, "Saved to D1");
                    }
                }
                Ok::<(), anyhow::Error>(())
            }
        })
        .await;

    info!(
        completed = summary.completed,
        failed = summary.failed,
        total = summary.total(),
        "All remote-job-search agents complete"
    );

    if summary.failed > 0 {
        anyhow::bail!(
            "{}/{} agents failed",
            summary.failed,
            TOPICS.len() * 2
        );
    }

    Ok(())
}

// ─── Search phase ────────────────────────────────────────────────────────────

async fn search_topic_papers(
    topic: TopicDef,
    scholar: &SemanticScholarClient,
    api_key: &str,
) -> Result<String> {
    let client = Client::new(api_key);

    let system = format!(
        "You are a research assistant helping a senior software engineer find a fully remote \
         AI/ML engineering position in the European Union.\n\n\
         Your task: Find the most relevant academic papers and research on \"{title}\".\n\
         Use the search tools to find at least 7 key papers. Prefer papers from 2024 or later.\n\
         For each paper return:\n\
         - Title, year, citation count\n\
         - Key contribution in 1-2 sentences\n\
         - Why it matters for finding a remote AI engineering job in the EU\n\
         Return ONLY a markdown bullet list of findings — no study guide, no extra text.",
        title = topic.title,
    );

    let queries_str = topic
        .search_queries
        .iter()
        .enumerate()
        .map(|(i, q)| format!("  {}. \"{}\"", i + 1, q))
        .collect::<Vec<_>>()
        .join("\n");

    let prompt = format!(
        "Find academic papers on: **{title}**\n\nTry these queries:\n{queries}\n\n\
         Then try 3-4 additional queries you think are relevant to finding a remote AI job in the EU.\n\
         Target at least 7 papers. Prefer 2024+ publications.\n\n\
         Return a markdown bullet list of the most relevant papers found.",
        title = topic.title,
        queries = queries_str,
    );

    let agent = client
        .agent("deepseek-chat")
        .preamble(&system)
        .tool(SearchPapers(scholar.clone()))
        .tool(GetPaperDetail(scholar.clone()))
        .build();

    agent
        .prompt(prompt)
        .await
        .with_context(|| format!("search phase failed for {}", topic.slug))
}

// ─── Write phase ─────────────────────────────────────────────────────────────

async fn write_strategy_report(
    topic: TopicDef,
    findings: &str,
    api_key: &str,
) -> Result<StudyTopicRow> {
    let client = Client::new(api_key);

    let preamble = format!(
        r#"You are a career strategy advisor for a senior software engineer seeking a fully remote AI/ML engineering position in the European Union in 2026.

Your task: Write an actionable strategy report on "{title}" using the research findings provided.

Write in this EXACT format — return ONLY the markdown body, no JSON wrapper:

## Overview
2-3 paragraphs: what the research says about this topic and why it matters for landing a remote AI engineering role in the EU.

## Key Findings
Data-backed insights from the research. Cite specific papers, statistics, and evidence.

## Actionable Strategy
Step-by-step action plan. Be specific — names of platforms, exact approaches, timelines.

## Research Evidence
Papers with citations. For each: title, year, key finding, and how it applies to this job search.

## Common Mistakes
What job seekers typically get wrong in this area. Be specific and blunt.

Write at a senior engineer level. Be precise, actionable, and grounded in the research. No generic advice."#,
        title = topic.title,
    );

    let user_prompt = format!(
        "Write a strategy report on: **{title}**\n\nFocus: {focus}\n\n\
         ## Research Findings (from search phase)\n\n{findings}",
        title = topic.title,
        focus = topic.prompt_focus,
        findings = findings,
    );

    let agent = client.agent("deepseek-chat").preamble(&preamble).build();

    let body_md = agent
        .prompt(user_prompt)
        .await
        .with_context(|| format!("write phase failed for {}", topic.slug))?;

    let summary = body_md
        .lines()
        .skip_while(|l| l.starts_with('#') || l.trim().is_empty())
        .take_while(|l| !l.trim().is_empty())
        .collect::<Vec<_>>()
        .join(" ");
    let summary = if summary.len() > 300 {
        format!("{}…", &summary[..297])
    } else {
        summary
    };

    Ok(StudyTopicRow {
        category: CATEGORY.into(),
        topic: topic.slug.into(),
        title: topic.title.into(),
        summary,
        body_md,
        difficulty: topic.difficulty.into(),
        tags: topic.tags.iter().map(|s| s.to_string()).collect(),
    })
}
