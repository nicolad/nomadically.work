/// 20 parallel DeepSeek agents researching agentic coding topics,
/// backed by Semantic Scholar paper search, saving results to D1.
///
/// Uses [`TeamLead`] + [`TaskQueue`] for dynamic claiming, retry (max 2 attempts),
/// and cooperative shutdown — matching the agent-teams coordination model.
use crate::agent::Client;
use crate::d1::{D1Client, StudyTopicRow};
use crate::team::{shutdown_pair, Mailbox, TaskQueue, TeamLead};
use crate::tools::{GetPaperDetail, SearchPapers};
use anyhow::{Context, Result};
use semantic_scholar::SemanticScholarClient;
use std::sync::Arc;
use tracing::info;

/// One agentic coding study topic definition.
#[derive(Clone, Copy)]
pub struct TopicDef {
    pub slug: &'static str,
    pub title: &'static str,
    pub difficulty: &'static str,
    pub tags: &'static [&'static str],
    pub search_queries: &'static [&'static str],
    pub prompt_focus: &'static str,
}

pub const TOPICS: &[TopicDef] = &[
    TopicDef {
        slug: "tool-use-patterns",
        title: "Tool Use Patterns in LLM Agents",
        difficulty: "advanced",
        tags: &["agents", "tool-use", "function-calling"],
        search_queries: &["LLM tool use function calling", "agent tool selection strategies"],
        prompt_focus: "How LLM agents select and invoke tools (function calling, JSON schemas, retry strategies). Cover ReAct, Toolformer, and real-world patterns.",
    },
    TopicDef {
        slug: "react-agent-loop",
        title: "ReAct: Reasoning + Acting Agent Loop",
        difficulty: "intermediate",
        tags: &["agents", "reasoning", "ReAct"],
        search_queries: &["ReAct reasoning acting LLM agents", "chain of thought tool use"],
        prompt_focus: "The ReAct paradigm — interleaving reasoning traces with actions. How it compares to chain-of-thought alone. Implementation patterns.",
    },
    TopicDef {
        slug: "mcp-protocol",
        title: "Model Context Protocol (MCP)",
        difficulty: "intermediate",
        tags: &["MCP", "protocol", "interoperability"],
        search_queries: &["model context protocol AI agents", "LLM agent communication protocol standards"],
        prompt_focus: "MCP as a standard for connecting AI agents to tools and data sources. Architecture, transport layers, tool/resource/prompt primitives.",
    },
    TopicDef {
        slug: "multi-agent-orchestration",
        title: "Multi-Agent Orchestration Systems",
        difficulty: "advanced",
        tags: &["multi-agent", "orchestration", "coordination"],
        search_queries: &["multi-agent LLM orchestration", "cooperative AI agent systems"],
        prompt_focus: "Architectures for multiple agents working together: hierarchical, peer-to-peer, blackboard. CrewAI, AutoGen, LangGraph patterns.",
    },
    TopicDef {
        slug: "code-generation-agents",
        title: "Autonomous Code Generation Agents",
        difficulty: "advanced",
        tags: &["code-generation", "agents", "software-engineering"],
        search_queries: &["autonomous code generation LLM", "AI coding agents software engineering"],
        prompt_focus: "How agents write, test, and debug code autonomously. SWE-bench, Devin, Claude Code patterns. Edit-test-fix loops.",
    },
    TopicDef {
        slug: "prompt-engineering-agents",
        title: "Prompt Engineering for Agentic Systems",
        difficulty: "intermediate",
        tags: &["prompting", "system-prompts", "agents"],
        search_queries: &["prompt engineering autonomous agents", "system prompt design LLM agents"],
        prompt_focus: "System prompt design for agents: persona, constraints, output format, tool instructions. Few-shot vs zero-shot in agentic contexts.",
    },
    TopicDef {
        slug: "agent-memory-systems",
        title: "Memory Systems for LLM Agents",
        difficulty: "advanced",
        tags: &["memory", "RAG", "context-management"],
        search_queries: &["LLM agent memory systems", "long-term memory autonomous agents retrieval"],
        prompt_focus: "Short-term (context window), working (scratchpad), long-term (vector DB) memory. MemGPT, retrieval-augmented generation for agents.",
    },
    TopicDef {
        slug: "agent-evaluation",
        title: "Evaluating Agentic AI Systems",
        difficulty: "intermediate",
        tags: &["evaluation", "benchmarks", "testing"],
        search_queries: &["LLM agent evaluation benchmarks", "testing autonomous AI agents"],
        prompt_focus: "How to evaluate agent quality: task completion, tool use accuracy, hallucination rates. SWE-bench, GAIA, AgentBench. Eval-driven development.",
    },
    TopicDef {
        slug: "planning-decomposition",
        title: "Task Planning and Decomposition",
        difficulty: "intermediate",
        tags: &["planning", "decomposition", "agents"],
        search_queries: &["LLM task planning decomposition", "hierarchical task planning AI agents"],
        prompt_focus: "How agents break complex goals into subtasks. Tree-of-thought, plan-and-solve, hierarchical planning. When planning helps vs hurts.",
    },
    TopicDef {
        slug: "retrieval-augmented-generation",
        title: "RAG for Agentic Coding Workflows",
        difficulty: "intermediate",
        tags: &["RAG", "retrieval", "code-search"],
        search_queries: &["retrieval augmented generation code", "RAG software engineering agents"],
        prompt_focus: "RAG in coding agents: codebase indexing, semantic search over repos, chunking strategies for code. Hybrid search (BM25 + embeddings).",
    },
    TopicDef {
        slug: "agent-safety-guardrails",
        title: "Safety and Guardrails for Code Agents",
        difficulty: "advanced",
        tags: &["safety", "guardrails", "sandboxing"],
        search_queries: &["AI agent safety guardrails", "LLM code execution sandboxing security"],
        prompt_focus: "Sandboxing agent actions, permission models, human-in-the-loop. Preventing destructive operations. Constitutional AI for agents.",
    },
    TopicDef {
        slug: "structured-output",
        title: "Structured Output and Schema Enforcement",
        difficulty: "beginner",
        tags: &["structured-output", "JSON", "schemas"],
        search_queries: &["LLM structured output JSON schema", "constrained decoding language models"],
        prompt_focus: "Getting reliable structured data from LLMs: JSON mode, tool_choice, constrained decoding, Zod/Pydantic validation. Retry strategies.",
    },
    TopicDef {
        slug: "agentic-rag",
        title: "Agentic RAG: Beyond Simple Retrieval",
        difficulty: "advanced",
        tags: &["agentic-RAG", "retrieval", "adaptive"],
        search_queries: &["agentic RAG adaptive retrieval", "self-reflective retrieval augmented generation"],
        prompt_focus: "Agents that decide when and what to retrieve. Self-RAG, CRAG (corrective RAG), adaptive retrieval. Query rewriting, re-ranking.",
    },
    TopicDef {
        slug: "llm-routing-cascading",
        title: "LLM Routing and Model Cascading",
        difficulty: "intermediate",
        tags: &["routing", "model-selection", "cost-optimization"],
        search_queries: &["LLM routing model selection", "model cascading cost optimization AI"],
        prompt_focus: "Routing queries to the right model: cheap-first with escalation, confidence-based routing. FrugalGPT, RouteLLM. Cost vs quality tradeoffs.",
    },
    TopicDef {
        slug: "context-window-management",
        title: "Context Window Management Strategies",
        difficulty: "intermediate",
        tags: &["context-window", "compression", "attention"],
        search_queries: &["LLM context window management", "long context compression strategies language models"],
        prompt_focus: "Managing limited context: summarization, sliding window, hierarchical compression. Lost-in-the-middle problem. When to use long-context vs RAG.",
    },
    TopicDef {
        slug: "human-in-the-loop",
        title: "Human-in-the-Loop Agent Patterns",
        difficulty: "beginner",
        tags: &["HITL", "collaboration", "approval"],
        search_queries: &["human in the loop AI agents", "human AI collaboration autonomous systems"],
        prompt_focus: "When and how to involve humans: approval gates, escalation policies, feedback loops. Balancing autonomy with oversight. UX patterns.",
    },
    TopicDef {
        slug: "agent-observability",
        title: "Observability for Agentic Systems",
        difficulty: "intermediate",
        tags: &["observability", "tracing", "debugging"],
        search_queries: &["LLM agent observability tracing", "debugging autonomous AI systems monitoring"],
        prompt_focus: "Tracing agent execution: spans, tool calls, token usage. Langfuse, LangSmith, OpenTelemetry for LLMs. Debugging multi-step failures.",
    },
    TopicDef {
        slug: "error-recovery-self-correction",
        title: "Error Recovery and Self-Correction",
        difficulty: "advanced",
        tags: &["error-handling", "self-correction", "reflexion"],
        search_queries: &["LLM agent self-correction error recovery", "reflexion self-improving AI agents"],
        prompt_focus: "How agents detect and recover from errors. Reflexion, self-debugging, retry with reflection. Avoiding infinite loops. Backtracking strategies.",
    },
    TopicDef {
        slug: "embedding-models-code",
        title: "Embedding Models for Code Understanding",
        difficulty: "intermediate",
        tags: &["embeddings", "code-search", "vector-search"],
        search_queries: &["code embedding models semantic search", "source code representation learning"],
        prompt_focus: "Code-specific embeddings: CodeBERT, StarCoder embeddings, Voyage Code. Chunking strategies (AST vs line-based). Vector DB selection for code.",
    },
    TopicDef {
        slug: "agent-architecture-patterns",
        title: "Production Agent Architecture Patterns",
        difficulty: "advanced",
        tags: &["architecture", "production", "patterns"],
        search_queries: &["production LLM agent architecture", "scalable AI agent system design patterns"],
        prompt_focus: "Real-world agent architectures: supervisor, swarm, pipeline, DAG-based. State machines for agents. Scaling, caching, rate limiting in production.",
    },
];

pub const APPLICATION_TOPICS: &[TopicDef] = &[
    TopicDef {
        slug: "cursor-workflow-mastery",
        title: "Mastering Cursor IDE for Professional Development",
        difficulty: "intermediate",
        tags: &["cursor", "IDE", "ai-coding", "productivity"],
        search_queries: &["Cursor IDE AI coding assistant", "AI-powered code editor productivity"],
        prompt_focus: "How to use Cursor effectively as a primary development tool. Composer vs Chat vs Tab completion. Multi-file editing, codebase indexing, .cursorrules. Workflow patterns for senior engineers.",
    },
    TopicDef {
        slug: "openai-agent-integration",
        title: "Integrating OpenAI APIs into Production Applications",
        difficulty: "advanced",
        tags: &["OpenAI", "API", "production", "agents"],
        search_queries: &["OpenAI API production integration", "GPT function calling production systems"],
        prompt_focus: "Building production systems with OpenAI: structured outputs, function calling, streaming, error handling, rate limiting, cost management. Assistants API vs Chat Completions for agents.",
    },
    TopicDef {
        slug: "fullstack-typescript-agents",
        title: "Building Agentic TypeScript Fullstack Applications",
        difficulty: "advanced",
        tags: &["TypeScript", "fullstack", "agents", "Node.js"],
        search_queries: &["TypeScript AI agent framework", "Node.js autonomous agent development"],
        prompt_focus: "End-to-end TypeScript agent systems: Vercel AI SDK, LangChain.js, custom agent loops. Type-safe tool definitions, streaming responses, server actions for agent UIs.",
    },
    TopicDef {
        slug: "react-ai-patterns",
        title: "React Patterns for AI-Powered User Interfaces",
        difficulty: "intermediate",
        tags: &["React", "AI", "UI", "streaming"],
        search_queries: &["React AI user interface patterns", "streaming LLM responses React components"],
        prompt_focus: "React patterns for AI apps: streaming text display, optimistic UI for agent actions, chat interfaces, tool-use visualization. useChat/useCompletion hooks. Server components for AI.",
    },
    TopicDef {
        slug: "cloudflare-worker-agents",
        title: "Deploying AI Agents on Cloudflare Workers",
        difficulty: "advanced",
        tags: &["Cloudflare", "Workers", "edge", "AI"],
        search_queries: &["Cloudflare Workers AI deployment", "edge computing AI agents serverless"],
        prompt_focus: "Running AI workloads on CF Workers: Workers AI, Vectorize, D1 for agent state, Queues for async agent tasks. WASM constraints, cold start optimization, KV for caching.",
    },
    TopicDef {
        slug: "testing-ai-applications",
        title: "Testing Strategies for AI-Integrated Applications",
        difficulty: "intermediate",
        tags: &["testing", "Jest", "Playwright", "AI", "evaluation"],
        search_queries: &["testing AI applications strategies", "LLM integration testing evaluation"],
        prompt_focus: "Testing AI features: mocking LLM responses in Jest, E2E testing AI flows with Playwright, evaluation-driven development, snapshot testing for prompts, deterministic vs stochastic testing.",
    },
    TopicDef {
        slug: "mongodb-vector-search",
        title: "MongoDB Atlas Vector Search for AI Applications",
        difficulty: "intermediate",
        tags: &["MongoDB", "vector-search", "RAG", "embeddings"],
        search_queries: &["MongoDB Atlas vector search", "vector database MongoDB AI applications"],
        prompt_focus: "Using MongoDB Atlas as a vector DB: $vectorSearch aggregation, embedding storage, hybrid search (text + vector), index management. Comparison with dedicated vector DBs for RAG.",
    },
    TopicDef {
        slug: "microservice-agent-orchestration",
        title: "Orchestrating AI Agents Across Microservices",
        difficulty: "advanced",
        tags: &["microservices", "orchestration", "agents", "distributed"],
        search_queries: &["microservice AI agent orchestration", "distributed agent systems architecture"],
        prompt_focus: "Distributing agent workloads across services: event-driven agent coordination, message queues for tool execution, shared state management, service mesh for agent communication.",
    },
    TopicDef {
        slug: "state-management-ai",
        title: "State Management Patterns for AI-Heavy React Apps",
        difficulty: "intermediate",
        tags: &["state-management", "Zustand", "Redux", "React", "AI"],
        search_queries: &["React state management AI applications", "Zustand Redux AI chat state"],
        prompt_focus: "Managing complex AI state in React: conversation history, streaming responses, tool call results, optimistic updates. Zustand vs Redux for AI apps. Persisting agent memory client-side.",
    },
    TopicDef {
        slug: "production-llm-deployment",
        title: "Deploying LLMs in Production: Cost, Latency, Reliability",
        difficulty: "advanced",
        tags: &["production", "deployment", "LLM", "infrastructure"],
        search_queries: &["LLM production deployment optimization", "large language model serving infrastructure"],
        prompt_focus: "Production LLM ops: model routing for cost (cheap-first escalation), caching strategies, fallback chains, load balancing, token budgets, latency optimization, monitoring and alerting.",
    },
];

pub async fn run_prep(api_key: &str, _scholar: &SemanticScholarClient, d1: &D1Client) -> Result<()> {
    let api_key = Arc::new(api_key.to_string());
    let d1 = Arc::new(d1.clone());

    info!("Queuing {} prep tasks (direct, no Semantic Scholar)…", APPLICATION_TOPICS.len());

    let queue: TaskQueue<TopicDef> = TaskQueue::new();
    for topic_def in APPLICATION_TOPICS {
        queue.push(topic_def.slug, *topic_def, vec![], 2).await;
    }

    let mailbox = Mailbox::new();
    let (_shutdown_tx, shutdown) = shutdown_pair();
    let summary = TeamLead::new(APPLICATION_TOPICS.len())
        .run(queue, mailbox, shutdown, move |ctx, task| {
            let api_key = Arc::clone(&api_key);
            let d1 = Arc::clone(&d1);
            let topic_def = task.payload;
            async move {
                info!(worker = %ctx.worker_id, topic = topic_def.slug, "Prep agent starting");
                let row = run_direct_agent(topic_def, &api_key).await?;
                d1.insert_study_topic(&row)
                    .await
                    .with_context(|| format!("D1 insert failed for {}", topic_def.slug))?;
                info!(worker = %ctx.worker_id, topic = topic_def.slug, "Saved to D1");
                Ok::<(), anyhow::Error>(())
            }
        })
        .await;

    info!(
        completed = summary.completed,
        failed = summary.failed,
        total = summary.total(),
        "All prep agents complete"
    );

    if summary.failed > 0 {
        anyhow::bail!("{}/{} prep agents failed", summary.failed, APPLICATION_TOPICS.len());
    }

    Ok(())
}

/// Generate and write full study topics for a dynamic category using DeepSeek Reasoner.
///
/// Phase 1 (Reasoner, single call): generate topic stubs (slug, title, summary, difficulty,
///          tags, prompt_focus) for the requested category.
/// Phase 2 (Chat, parallel workers): spawn N parallel agents — one per stub — to write full
///          body_md content. Uses the same `TeamLead` + `TaskQueue` pattern as `run_prep`.
pub async fn run_gen(category: &str, count: usize, api_key: &str, d1: &D1Client) -> Result<()> {
    // ── Phase 1: DeepSeek Reasoner → stubs ────────────────────────────────────
    let client = Client::new(api_key);

    let system = "You are a technical interview coach. \
        Output ONLY valid JSON — a JSON array, no markdown, no code fences, no extra text.";

    let prompt = format!(
        "Generate {count} study topics for the \"{category}\" category for software engineering interview prep.\n\
         Return a JSON array where each object has:\n\
         - slug: kebab-case identifier (string)\n\
         - title: display name (string)\n\
         - summary: one sentence description (string)\n\
         - difficulty: one of \"beginner\", \"intermediate\", \"advanced\"\n\
         - tags: array of 2-4 relevant strings\n\
         - prompt_focus: 1-2 sentence content brief for a later write phase",
    );

    info!(category, count, "Phase 1 — DeepSeek Reasoner generating stubs");
    let agent = client.agent("deepseek-reasoner").preamble(system).build();
    let raw = agent
        .prompt(prompt)
        .await
        .with_context(|| format!("Reasoner call failed for category={category}"))?;

    let clean = raw
        .trim()
        .trim_start_matches("```json")
        .trim_start_matches("```")
        .trim_end_matches("```")
        .trim();

    #[derive(Clone, serde::Deserialize)]
    struct TopicStub {
        slug: String,
        title: String,
        #[serde(default)]
        summary: String,
        #[serde(default = "default_difficulty")]
        difficulty: String,
        #[serde(default)]
        tags: Vec<String>,
        #[serde(default)]
        prompt_focus: String,
    }
    fn default_difficulty() -> String { "intermediate".into() }

    let stubs: Vec<TopicStub> = serde_json::from_str(clean)
        .with_context(|| format!("Failed to parse Reasoner JSON for category={category}"))?;

    info!(category, count = stubs.len(), "Phase 2 — spawning {} parallel write agents", stubs.len());

    // ── Phase 2: parallel write agents (deepseek-chat, one per stub) ──────────
    let api_key = Arc::new(api_key.to_string());
    let d1 = Arc::new(d1.clone());
    let category = Arc::new(category.to_string());

    let queue: TaskQueue<TopicStub> = TaskQueue::new();
    for stub in &stubs {
        queue.push(stub.slug.clone(), stub.clone(), vec![], 2).await;
    }

    let mailbox = Mailbox::new();
    let (_shutdown_tx, shutdown) = shutdown_pair();
    let summary = TeamLead::new(stubs.len())
        .run(queue, mailbox, shutdown, move |ctx, task| {
            let api_key = Arc::clone(&api_key);
            let d1 = Arc::clone(&d1);
            let category = Arc::clone(&category);
            let stub = task.payload;
            async move {
                info!(worker = %ctx.worker_id, slug = %stub.slug, "Writing study guide");
                let row = write_gen_topic(&stub.slug, &stub.title, &stub.prompt_focus, &category, &api_key).await?;
                d1.insert_study_topic(&row)
                    .await
                    .with_context(|| format!("D1 insert failed for {}", stub.slug))?;
                info!(worker = %ctx.worker_id, slug = %stub.slug, "Saved to D1");
                Ok::<(), anyhow::Error>(())
            }
        })
        .await;

    info!(
        completed = summary.completed,
        failed = summary.failed,
        "All gen agents complete"
    );

    if summary.failed > 0 {
        anyhow::bail!("{}/{} gen agents failed", summary.failed, stubs.len());
    }

    Ok(())
}

/// Write full body_md for a single dynamically generated topic (no Semantic Scholar).
async fn write_gen_topic(
    slug: &str,
    title: &str,
    focus: &str,
    category: &str,
    api_key: &str,
) -> Result<StudyTopicRow> {
    let client = Client::new(api_key);

    let preamble = format!(
        r#"You are a senior technical writer creating practical study material for a software engineer preparing for interviews.

Your task: Write a comprehensive, practical study guide on "{title}" (category: {category}).

Write in this EXACT format — return ONLY the markdown body:

## Overview
2-3 paragraphs: what it is, why it matters.

## Key Concepts
Bullet points with 1-2 sentence explanations.

## How It Works
Technical explanation with code examples (TypeScript preferred).

## Practical Patterns
3-4 concrete implementation patterns.

## Interview Talking Points
5-6 points. Frame as "When asked about X, explain Y because Z."

## Common Pitfalls
3-4 specific mistakes engineers make.

Write at a senior engineer level. Be precise, no fluff."#,
        title = title,
        category = category,
    );

    let user_prompt = format!(
        "Write a study guide on: **{title}**\n\nFocus: {focus}",
        title = title,
        focus = focus,
    );

    let agent = client.agent("deepseek-chat").preamble(&preamble).build();
    let body_md = agent
        .prompt(user_prompt)
        .await
        .with_context(|| format!("write_gen_topic failed for {slug}"))?;

    let summary = body_md
        .lines()
        .skip_while(|l| l.starts_with('#') || l.trim().is_empty())
        .take_while(|l| !l.trim().is_empty())
        .collect::<Vec<_>>()
        .join(" ");
    let summary = if summary.len() > 300 { format!("{}…", &summary[..297]) } else { summary };

    Ok(StudyTopicRow {
        category: category.to_string(),
        topic: slug.to_string(),
        title: title.to_string(),
        summary,
        body_md,
        difficulty: "intermediate".to_string(),
        tags: vec![],
    })
}

/// Run a single agent WITHOUT Semantic Scholar tools — pure DeepSeek generation.
async fn run_direct_agent(
    topic_def: TopicDef,
    api_key: &str,
) -> Result<StudyTopicRow> {
    let client = Client::new(api_key);

    let preamble = format!(
        r#"You are a senior technical writer creating practical study material for a software engineer preparing for a Fullstack Developer interview at Plan A Technologies.

The role requires: React, TypeScript/Node.js, Cloudflare/AWS, MongoDB/PostgreSQL, Cursor IDE as primary tool, OpenAI models for agentic workflows, Jest/Playwright testing, microservices architecture.

Your task: Write a comprehensive, practical study guide on "{title}".

Write in this EXACT format — return ONLY the markdown body, no JSON wrapper:

## Overview
2-3 paragraphs explaining the concept clearly. What it is, why it matters for this role.

## Key Concepts
Bullet points of the core ideas, each with 1-2 sentence explanation.

## How It Works
Technical explanation with architecture diagrams in code blocks where helpful.

## Practical Patterns
3-4 concrete implementation patterns with code examples (TypeScript/React preferred).

## Interview Talking Points
5-6 points to discuss in an interview. Frame as "When asked about X, explain Y because Z."

## Common Pitfalls
3-4 mistakes engineers make. Be specific and blunt.

## Hands-On Exercises
2-3 practical exercises to build skill. Include acceptance criteria.

Write at a senior engineer level. Be precise, avoid fluff. Focus on practical knowledge over theory."#,
        title = topic_def.title,
    );

    let user_prompt = format!(
        "Write a study guide on: **{title}**\n\nFocus: {focus}",
        title = topic_def.title,
        focus = topic_def.prompt_focus,
    );

    // No tools — direct DeepSeek generation
    let agent = client
        .agent("deepseek-chat")
        .preamble(&preamble)
        .build();

    let body_md = agent
        .prompt(user_prompt)
        .await
        .with_context(|| format!("agent failed for {}", topic_def.slug))?;

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
        category: "application-prep".into(),
        topic: topic_def.slug.into(),
        title: topic_def.title.into(),
        summary,
        body_md,
        difficulty: topic_def.difficulty.into(),
        tags: topic_def.tags.iter().map(|s| s.to_string()).collect(),
    })
}

pub async fn run(api_key: &str, scholar: &SemanticScholarClient, d1: &D1Client) -> Result<()> {
    run_topics(TOPICS, "agentic-coding", api_key, scholar, d1).await
}

// ─── 2-step research pipeline ────────────────────────────────────────────────
//
// Each topic spawns two tasks:
//
//   search:{slug}  (no deps)       — query Semantic Scholar, send findings to mailbox
//   write:{slug}   (depends_on search) — recv findings from mailbox, write the guide
//
// This matches the agent-teams mailbox pattern: workers communicate via named
// inboxes without going through the lead.

#[derive(Clone)]
enum ResearchTask {
    Search(TopicDef),
    Write { topic: TopicDef, category: &'static str },
}

async fn run_topics(
    topics: &'static [TopicDef],
    category: &'static str,
    api_key: &str,
    scholar: &SemanticScholarClient,
    d1: &D1Client,
) -> Result<()> {
    let api_key = Arc::new(api_key.to_string());
    let scholar = Arc::new(scholar.clone());
    let d1 = Arc::new(d1.clone());

    info!("Queuing {} 2-step search→write tasks (category: {})…", topics.len(), category);

    // Push paired tasks for each topic.
    // write:{slug} depends on search:{slug} completing first.
    let queue: TaskQueue<ResearchTask> = TaskQueue::new();
    for topic_def in topics {
        let search_id = queue
            .push(format!("search:{}", topic_def.slug), ResearchTask::Search(*topic_def), vec![], 2)
            .await;
        queue
            .push(
                format!("write:{}", topic_def.slug),
                ResearchTask::Write { topic: *topic_def, category },
                vec![search_id],
                2,
            )
            .await;
    }

    // Use topics.len() workers so search and write tasks for different topics
    // can run in parallel; write tasks block on their own search completing.
    let mailbox = Mailbox::new();
    let (_shutdown_tx, shutdown) = shutdown_pair();
    let summary = TeamLead::new(topics.len())
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
                            .send(&ctx.worker_id, format!("findings:{}", topic.slug), "paper-findings", findings)
                            .await;
                        info!(worker = %ctx.worker_id, topic = topic.slug, "Search phase done, findings in mailbox");
                    }
                    ResearchTask::Write { topic, category } => {
                        info!(worker = %ctx.worker_id, topic = topic.slug, "Write phase starting");
                        let env = ctx.mailbox.recv_wait(&format!("findings:{}", topic.slug)).await;
                        let row = write_study_guide(topic, category, &env.body, &api_key).await?;
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
        "All agents complete"
    );

    if summary.failed > 0 {
        anyhow::bail!("{}/{} agents failed", summary.failed, topics.len() * 2);
    }

    Ok(())
}

// ─── Search phase ─────────────────────────────────────────────────────────────

/// Run the Semantic Scholar research phase for a topic.
///
/// Returns raw paper findings as markdown — no study guide writing.
/// The result is delivered to the mailbox under `findings:{slug}` for the
/// write phase to consume.
async fn search_topic_papers(
    topic: TopicDef,
    scholar: &SemanticScholarClient,
    api_key: &str,
) -> Result<String> {
    let client = Client::new(api_key);

    let system = format!(
        "You are a research assistant. Find the most relevant academic papers on \"{title}\". \
         Use the search tools to find 3-5 key papers. For each paper return:\n\
         - Title, year, citation count\n\
         - Key contribution in 1-2 sentences\n\
         - Why it matters for agentic coding\n\
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
         Then try 1-2 additional queries you think are relevant.\n\n\
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

    agent.prompt(prompt).await.with_context(|| format!("search phase failed for {}", topic.slug))
}

// ─── Write phase ──────────────────────────────────────────────────────────────

/// Write a full study guide given pre-fetched paper findings.
///
/// Called after the search phase delivers its output to the mailbox.
/// Uses DeepSeek without tools — all research is already in `findings`.
async fn write_study_guide(
    topic: TopicDef,
    category: &str,
    findings: &str,
    api_key: &str,
) -> Result<StudyTopicRow> {
    let client = Client::new(api_key);

    let preamble = format!(
        r#"You are a technical writer creating study material on agentic coding for software engineers preparing for AI engineering interviews.

Your task: Write a comprehensive study guide on "{title}" using the research findings provided.

Write in this EXACT format — return ONLY the markdown body, no JSON wrapper:

## Overview
2-3 paragraphs explaining the concept clearly. What it is, why it matters for agentic coding.

## Key Concepts
Bullet points of the core ideas, each with 1-2 sentence explanation.

## How It Works
Technical explanation of the mechanism. Include pseudocode or architecture diagrams in code blocks where helpful.

## Practical Patterns
3-4 concrete implementation patterns with code examples (TypeScript/Python preferred).

## Research Findings
Summarize the most relevant papers from the provided findings:
- Paper title (year, citations) — key finding and relevance
- Include actionable insights from each

## Interview Talking Points
5-6 points an engineer should be ready to discuss. Frame as "When asked about X, explain Y because Z."

## Common Pitfalls
3-4 mistakes engineers make with this concept. Be specific and blunt.

## Further Reading
Papers listed in the research findings, official docs, key blog posts.

Write at a senior engineer level. Be precise, avoid fluff. Include real examples over abstract theory."#,
        title = topic.title,
    );

    let user_prompt = format!(
        "Write a study guide on: **{title}**\n\nFocus: {focus}\n\n\
         ## Research Findings (from search phase)\n\n{findings}",
        title = topic.title,
        focus = topic.prompt_focus,
        findings = findings,
    );

    // Pure writing — no tools needed; findings are already in the prompt.
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
    let summary = if summary.len() > 300 { format!("{}…", &summary[..297]) } else { summary };

    Ok(StudyTopicRow {
        category: category.into(),
        topic: topic.slug.into(),
        title: topic.title.into(),
        summary,
        body_md,
        difficulty: topic.difficulty.into(),
        tags: topic.tags.iter().map(|s| s.to_string()).collect(),
    })
}
