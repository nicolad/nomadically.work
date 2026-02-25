---
title: "From Research to Practice: A Skill Evolver That Improves Its Own Instructions"
description: "How Meta Context Engineering, CASTER, REprompt, EvoConfig, and Autonomous Question Formation created an agent that edits its own skill files — the system improving its own instructions."
date: "2026-02-25"
author: "nomadically.work"
tags: ["autonomous-agents", "self-improvement", "meta-learning", "prompt-engineering"]
status: draft
---

# From Research to Practice: A Skill Evolver That Improves Its Own Instructions

Most AI systems have a hard boundary between the instructions they follow and the work they do. Developers write prompts; the AI executes them. If the prompts are wrong, a human fixes them. We built an agent that fixes its own prompts.

The Skill Evolver is the third agent in our six-agent autonomous self-improvement pipeline for [nomadically.work](https://nomadically.work). Its scope is precisely defined: it can edit skill files, commands, hooks, CLAUDE.md, and memory files. It cannot touch application source code — that's the Code Improver's job. This agent improves the instructions that all other agents follow.

Five research papers informed its design. Each one solved a different aspect of the self-modification problem.

## The Research Foundation

### Meta Context Engineering: A Meta-Agent Evolving Its Own Context

Meta Context Engineering (Chen et al., 2025) proposes a meta-agent architecture where the agent responsible for improving the system is itself guided by structured context that it can modify. The paper demonstrates that agents with self-modifiable context outperform those with fixed instructions on long-horizon tasks, because they accumulate task-specific knowledge over time.

The key contribution is formalizing the feedback loop: observe performance → diagnose root cause → modify context → observe new performance. Without this structure, self-modification tends toward either overfitting (reacting to every failure) or inertia (never changing anything).

**How we used it:** The Skill Evolver's Evidence-Based Evolution process is a direct implementation. Every proposed change must link to evidence:

```
EVOLUTION: {
  id: "E-001",
  target_file: "path to file being modified",
  trigger_patterns: ["P-xxx"],
  trigger_findings: ["F-xxx"],
  change_type: "add_instruction|clarify_instruction|remove_instruction|...",
  before: "The exact text being replaced",
  after: "The new text",
  rationale: "Why this specific change addresses the root cause",
  expected_impact: {
    "dimensions": ["which scores should improve"],
    "magnitude": "small|medium|large",
    "regression_risk": "none|low|medium|high"
  }
}
```

No evolution can happen without a `trigger_patterns` or `trigger_findings` reference. This prevents the agent from making "improvements" based on vibes rather than evidence.

### EvoConfig: Self-Evolving Configuration

EvoConfig (Park et al., 2025) addresses the configuration problem in multi-agent systems: as the system evolves, configuration parameters that were optimal at deployment become suboptimal. The paper proposes a mechanism for agents to update their own configuration based on observed performance, with guardrails to prevent catastrophic changes.

**How we used it:** The Skill Evolver's scope definition is an EvoConfig-style approach. Rather than allowing unconstrained self-modification, we define exactly what can be modified:

**CAN edit:** `.claude/skills/*/SKILL.md`, `.claude/commands/*.md`, `.claude/hooks/*.py`, `CLAUDE.md`, `OPTIMIZATION-STRATEGY.md`, auto-memory files.

**CANNOT edit:** Application source code, schema files, configuration files, generated files.

This scope boundary is the most important safety feature. An agent that can modify its own instructions AND the codebase has an unbounded blast radius. By restricting the Skill Evolver to instruction files only, the worst case is a bad prompt — which the Verification Gate will catch.

### CASTER: Self-Optimization via Negative Feedback

CASTER (Liu et al., 2026) is a self-optimizing router that uses negative feedback loops to improve its task routing over time. When a routed task fails, CASTER adjusts its routing strategy based on the failure signal. The paper shows that this negative-feedback approach converges faster than positive-feedback methods because failures are more informative than successes.

**How we used it:** The Apply Changes phase implements CASTER's principle. The agent follows these priorities when editing:

1. **Minimal diff** — change as little as possible
2. **Additive over destructive** — add clarifications rather than removing instructions
3. **Specific over general** — concrete examples rather than abstract rules
4. **Testable** — every instruction should be verifiable by the scoring system

The negative feedback connection: the Skill Evolver only acts when scores drop. It doesn't optimize what's already working — it fixes what's failing. Each evolution targets the specific failure mode (hallucination, wrong_tool, out_of_role) identified in the mining report.

### REprompt: Requirements-Guided Prompt Optimization

REprompt (Zhang et al., 2025) formalizes prompt optimization as a requirements satisfaction problem. Rather than iteratively tweaking prompts, it starts with explicit requirements (what the prompt must achieve) and systematically generates prompts that satisfy them. The paper demonstrates that requirements-guided optimization produces more robust prompts than iterative refinement.

**How we used it:** Every evolution has explicit `expected_impact.dimensions` — the score dimensions it should improve. This transforms prompt editing from "this sounds better" into "this should increase task_completion scores by addressing the root cause of pattern P-003." The Verification Gate later checks whether the expected improvement materialized.

### Autonomous Question Formation

"Autonomous Question Formation" (Wang et al., 2025) argues that agents should ask themselves targeted questions before acting, rather than relying solely on the information provided. The paper shows that self-questioning reduces errors on complex tasks by forcing the agent to make implicit assumptions explicit.

**How we used it:** The Skill Evolver includes a mandatory Self-Questioning step before any edit:

- Will this change help the specific failure pattern, or is it too broad?
- Could this change cause regression in other dimensions?
- Is the root cause in the skill instructions, or in the code the skill operates on?
- Am I adding complexity that will make the skill harder to follow?
- Is there a simpler fix (e.g., one line added to CLAUDE.md)?

The last question is the most powerful. We found that early versions of the Skill Evolver would rewrite entire skill files when a single line in CLAUDE.md would have fixed the issue. The self-questioning forces it to consider the simplest intervention first.

## The Five Anti-Patterns

Through iterative testing, we identified five failure modes that the Skill Evolver must avoid. These are documented in the skill file as explicit anti-patterns:

1. **Instruction bloat** — continuously adding rules without removing old ones. Sometimes the fix is to simplify, not add. If a skill file grows past a certain size, the agents reading it may truncate or skip instructions.

2. **Contradictory instructions** — adding a new rule that conflicts with an existing one. The agent must check for conflicts before writing. "Always use DataLoaders" and "query directly for single-item lookups" coexist fine — but only if both are stated.

3. **Over-specificity** — adding rules for one-off incidents. The minimum threshold is frequency >= 2 (inherited from the Trajectory Miner). A single bad session doesn't justify a permanent instruction change.

4. **Prompt engineering theater** — plastering "IMPORTANT:" and "CRITICAL:" on everything. These markers lose their meaning when overused. The skill file explicitly says: "Be precise instead."

5. **Cargo cult** — copying patterns from research papers without understanding why they work in this specific context. A paper showing that chain-of-thought improves math reasoning doesn't mean we should add chain-of-thought to every skill file.

## The Feedback Loop

The Skill Evolver doesn't operate in isolation. Its changes are validated by the Verification Gate, which checks:

- Do modified skill files still make internal sense? (Coherence check)
- Do changes conflict with other skills? (Cross-skill check)
- Are CLAUDE.md changes consistent? (Consistency check)
- Do hook modifications preserve fail-open design? (Hook verification)

If the Verification Gate rejects a skill evolution, the Meta-Optimizer records the failure and adjusts future priorities. Over time, the system learns which types of skill changes work and which don't — CASTER's negative feedback loop applied to the improvement pipeline itself.

## Why This Matters

The Skill Evolver represents something genuinely novel: a system that improves its own instructions based on measured evidence, with safety constraints that prevent runaway self-modification. It's not AGI — it's a carefully scoped agent that edits Markdown files based on JSON reports. But the principle it implements — evidence-based self-modification with verification gates — is the foundation for autonomous systems that get better over time without human intervention.

The maximum of 5 evolutions per run, the requirement that every change links to evidence, the mandatory self-questioning, and the anti-pattern awareness all serve the same goal: making self-improvement boring and reliable rather than exciting and dangerous.

## References

1. Chen, X., et al. "Meta Context Engineering: Self-Evolving Context for Autonomous Agents." arXiv preprint, 2025. [https://arxiv.org/abs/2502.08198](https://arxiv.org/abs/2502.08198)

2. Park, J., et al. "EvoConfig: Self-Evolving Configuration for Multi-Agent Systems." arXiv preprint, 2025. [https://arxiv.org/abs/2502.06783](https://arxiv.org/abs/2502.06783)

3. Liu, Y., et al. "CASTER: Context-Aware Strategy for Task Efficient Routing." arXiv preprint, 2026. [https://arxiv.org/abs/2601.19793](https://arxiv.org/abs/2601.19793)

4. Zhang, W., et al. "REprompt: Requirements-Guided Prompt Optimization for LLM Agents." arXiv preprint, 2025. [https://arxiv.org/abs/2502.06680](https://arxiv.org/abs/2502.06680)

5. Wang, H., et al. "Autonomous Question Formation for LLM Agents." arXiv preprint, 2025. [https://arxiv.org/abs/2502.04265](https://arxiv.org/abs/2502.04265)

---

*This article is part of a six-part series on building autonomous self-improvement agents, grounded in research from [VoltAgent/awesome-ai-agent-papers](https://github.com/VoltAgent/awesome-ai-agent-papers). Data and implementation details from [nomadically.work](https://nomadically.work).*
