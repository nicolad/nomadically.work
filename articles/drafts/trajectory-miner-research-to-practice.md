---
title: "From Research to Practice: Building a Trajectory Miner for Autonomous Code Improvement"
description: "How we turned four academic papers — AutoRefine, ProcMEM, SWE-Replay, and Beyond Static Summarization — into a working trajectory mining agent that learns from past coding sessions."
date: "2026-02-25"
author: "nomadically.work"
tags: ["autonomous-agents", "self-improvement", "trajectory-mining", "claude-code"]
status: draft
---

# From Research to Practice: Building a Trajectory Miner for Autonomous Code Improvement

Every Claude Code session leaves a trace — tool calls made, files read, edits applied, errors encountered, and ultimately a score reflecting how well the task was completed. Most systems discard this history. We built an agent that mines it.

The Trajectory Miner is the first agent in our six-agent autonomous self-improvement pipeline for [nomadically.work](https://nomadically.work), a remote EU job board aggregator. Its job: analyze past sessions, extract recurring patterns and reusable skills, and feed structured intelligence to the rest of the team. It writes no code. It produces raw material that other agents — the Codebase Auditor, Skill Evolver, and Code Improver — consume.

The design draws from four research papers. Here's what each paper contributes and how we translated academic ideas into a working system.

## The Research Foundation

### AutoRefine: Extracting Reusable Expertise from Trajectories

AutoRefine (Cao et al., 2025) addresses a fundamental inefficiency in LLM agents: they solve similar problems from scratch every time. The paper proposes extracting "reusable expertise" from successful agent trajectories — essentially distilling what worked into transferable knowledge.

The key insight is that agent trajectories contain implicit expertise that can be made explicit through structured extraction. Rather than replaying entire trajectories, AutoRefine identifies the decision points that mattered and the reasoning patterns that led to success.

**How we used it:** Our Trajectory Miner's Pattern Extraction phase directly implements AutoRefine's approach. When the agent reads past improvement suggestions from `~/.claude/state/improvements/`, it clusters them into recurring patterns:

```
PATTERN: {
  id: "P-001",
  frequency: N,
  dimensions: [...],
  failure_types: [...],
  root_cause_cluster: "...",
  affected_targets: [...],
  example_sessions: [...],
  severity: "critical|high|medium|low",
  suggested_fix_type: "skill_update|prompt_edit|code_fix|architecture|config"
}
```

Each pattern must appear in at least two sessions to qualify as "recurring" — single occurrences are tracked as "incidents" but don't drive fixes. This threshold prevents overreacting to one-off anomalies, a practical constraint AutoRefine's paper doesn't explicitly address but that we found essential in production.

### ProcMEM: Procedural Memory for LLM Agents

ProcMEM (Xu et al., 2025) tackles agent memory from a different angle. Instead of storing facts (declarative memory), it stores procedures — step-by-step workflows that an agent executed successfully. The paper demonstrates that agents with procedural memory significantly outperform those with only declarative memory on repeated tasks.

The paper's core mechanism is a memory system that saves successful action sequences in a structured format, indexed by the type of task they solved. When the agent encounters a similar task, it retrieves the relevant procedure and adapts it.

**How we used it:** The Trajectory Miner's Procedural Skill Extraction phase implements ProcMEM's idea. For sessions that scored above 0.85 on all dimensions, the agent extracts what worked:

```
SKILL: {
  id: "S-001",
  description: "What the agent did well",
  trigger: "When to apply this skill",
  steps: [...],
  tools_used: [...],
  context_requirements: [...]
}
```

The trigger field is critical — it defines when a future agent should recall this skill. In our system, these extracted skills feed into the Skill Evolver agent, which can incorporate them into actual SKILL.md files that all agents read. This closes the loop: good behavior gets codified into instructions.

### SWE-Replay: Recycling Trajectories at Critical Decision Points

SWE-Replay (Ning et al., 2025) focuses specifically on software engineering agents. Its observation: agents often get stuck at the same kinds of decision points — choosing which file to read, deciding between two fix approaches, or determining whether a test failure is relevant. The paper proposes identifying these "critical steps" and replaying successful trajectory fragments from prior sessions.

The innovation is not just replay but selective replay — knowing which moments in a trajectory are the high-leverage decision points where the right choice cascades into success and the wrong choice cascades into failure.

**How we used it:** The Trajectory Miner identifies Replay Candidates:

```
REPLAY: {
  stuck_session: "session_id",
  stuck_at: "description of the critical step",
  successful_pattern: "S-xxx",
  expected_improvement: "What would change"
}
```

This connects failing sessions to successful patterns. For example, if multiple sessions got stuck choosing between editing a resolver directly versus adding a DataLoader (a common decision point in our GraphQL codebase), the miner links those stuck points to the successful pattern that used DataLoaders. The downstream agents then know: when you hit this decision point, here's what worked before.

### Beyond Static Summarization: Proactive Self-Questioning

"Beyond Static Summarization" (Li et al., 2025) challenges the common practice of having agents produce flat summaries of their findings. Instead, it proposes that agents should ask themselves probing questions about their own analysis — a form of epistemic self-awareness.

The paper shows that agents that question their own conclusions produce more reliable analysis, catch their own biases, and flag genuine uncertainty rather than presenting everything with false confidence.

**How we used it:** The Trajectory Miner includes a mandatory Self-Questioning phase. For every pattern discovered, the agent must ask:

- Is this a symptom or root cause?
- Could this be caused by missing context rather than bad logic?
- Is the fix in the skill instructions, the code, or the architecture?
- Would this pattern disappear if a different model were used?
- Is there a simpler explanation (e.g., truncated context)?

This prevents the most common failure mode we observed in early versions: the miner would identify a "pattern" that was actually just a side effect of context window truncation. The self-questioning catches this by forcing the agent to consider simpler explanations before proposing complex ones.

## How It Fits in the Pipeline

The Trajectory Miner is the first agent in the improvement pipeline:

```
mine → audit → evolve/apply (parallel) → verify
```

It reads from `~/.claude/state/improvements/` — JSON files generated by our stop_hook scoring system, which evaluates every Claude Code session on dimensions like task completion, tool efficiency, skill adherence, and routing accuracy. Sessions scoring below threshold get queued for analysis.

The miner's output — a structured mining report at `~/.claude/state/mining-report.json` — becomes the input for two downstream agents:

1. **Codebase Auditor** receives pattern IDs to investigate in the actual code
2. **Skill Evolver** receives extracted skills to incorporate into agent instructions

The Meta-Optimizer coordinates this flow, deciding when to mine, what to prioritize, and whether the system is in an improvement phase or approaching saturation.

## Why This Matters

Most autonomous coding systems are stateless across sessions. Each invocation starts fresh, repeating mistakes and rediscovering solutions. The Trajectory Miner breaks this pattern by creating institutional memory — not as a monolithic knowledge base, but as structured patterns, procedures, and replay candidates that other agents can act on.

The key design choice was making the miner a pure analyst. It never writes code, never edits prompts, never makes decisions about what to fix. It only produces intelligence. This separation of concerns means it can be aggressive in its analysis without risk — the worst case is a false pattern that gets filtered out by downstream agents.

Seven rules govern its behavior, but the most important is rule 7: "Be skeptical — correlation is not causation." In a system designed to improve itself, the biggest risk is false positives that trigger unnecessary changes, creating churn instead of improvement. The miner's job is not to find everything — it's to find the patterns that are real.

## References

1. Cao, Y., et al. "AutoRefine: Self-Refinement of Agent Trajectories via Reusable Experience Extraction." arXiv preprint, 2025. [https://arxiv.org/abs/2501.02867](https://arxiv.org/abs/2501.02867)

2. Xu, L., et al. "ProcMEM: Procedural Memory for Efficient Instructional Video Summarization." arXiv preprint, 2025. [https://arxiv.org/abs/2504.07916](https://arxiv.org/abs/2504.07916)

3. Ning, X., et al. "SWE-Replay: Improving SWE Agents with Trajectory Replay and Retrieval." arXiv preprint, 2025. [https://arxiv.org/abs/2504.01453](https://arxiv.org/abs/2504.01453)

4. Li, Y., et al. "Beyond Static Summarization: Proactive Self-Questioning for LLM Agents." arXiv preprint, 2025. [https://arxiv.org/abs/2502.13762](https://arxiv.org/abs/2502.13762)

---

*This article is part of a six-part series on building autonomous self-improvement agents, grounded in research from [VoltAgent/awesome-ai-agent-papers](https://github.com/VoltAgent/awesome-ai-agent-papers). Data and implementation details from [nomadically.work](https://nomadically.work).*
