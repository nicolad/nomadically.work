"""BMAD Product Brief workflow prompts — Deep Edition.

Expanded 17-step workflow with 6 passes per step for thorough, multi-round refinement.
Total: 17 × 6 = 102 checkpoints targeting 30+ minutes of sustained execution.

Pass sequence per step:
  draft → critique → refine → validate → deepen → polish
"""

# Workflow steps in execution order
BMAD_STEPS = [
    "CONTEXT",      # Problem context + background analysis
    "MARKET",       # Market analysis + competitive landscape
    "USERS",        # Target user segments + demographics
    "PERSONAS",     # Detailed user personas
    "JOURNEYS",     # User journeys + jobs to be done
    "PROBLEM",      # Deep problem analysis + root causes
    "VISION",       # Product vision + strategic direction
    "VALUE",        # Value proposition + differentiators
    "FEATURES",     # Feature set + prioritization
    "SCOPE",        # MVP scope + out-of-scope boundaries
    "CONSTRAINTS",  # Technical constraints + architecture fit
    "RISKS",        # Risk analysis + mitigation strategies
    "METRICS",      # Success metrics + KPIs + OKRs
    "ROADMAP",      # Release roadmap + milestones
    "DEPENDENCIES", # Dependencies + external requirements
    "VALIDATION",   # Testing + validation strategy
    "COMPLETE",     # Final assembly + coherence pass
]

# System prompt injected into all calls
SYSTEM_BASE = """You are a senior product strategist executing the BMAD (Business Model Architecture Design) methodology.
You are generating a comprehensive Product Brief for a software product.
You must produce structured, actionable output following the BMAD template format.
Be specific, concrete, and grounded in the codebase context provided.
Do not use generic placeholder text — every section must reflect the actual product.
Each pass should meaningfully deepen and improve on the prior work."""

# Pass types per step — 6 rounds of progressive refinement
# Indices 2 and 4 (refine, deepen) consume outputs from two prior passes
PASS_TYPES = ["draft", "critique", "refine", "validate", "deepen", "polish"]

# Indices of passes that consume two prior outputs (generation + feedback)
FEEDBACK_PASS_INDICES = {2, 4}  # refine (draft+critique), deepen (refine+validate)

# Per-step configuration
STEP_CONFIGS: dict[str, dict] = {
    "CONTEXT": {
        "title": "Problem Context & Background",
        "task": """Analyze the background and context for this product. Cover:
1. **Background**: Domain knowledge and why this problem space matters
2. **Current State**: What exists today — tools, processes, or manual workarounds
3. **Why Now**: Market timing and why this is the right moment to build
4. **Operating Environment**: Constraints, stakeholders, and key dynamics""",
    },
    "MARKET": {
        "title": "Market Analysis & Competitive Landscape",
        "task": """Analyze the market and competitive environment. Cover:
1. **Market Size & Growth**: Addressable market and trajectory
2. **Competitive Landscape**: Direct and indirect competitors with honest assessment
3. **Market Gaps**: Where existing solutions fall short
4. **Positioning Opportunity**: Where this product can win""",
    },
    "USERS": {
        "title": "Target Users & Segments",
        "task": """Define the target user base. Cover:
1. **Primary Segment**: The most important user group with specific characteristics
2. **Secondary Segments**: Other meaningful user types
3. **User Context**: How, when, and where users will interact with the product
4. **User Goals**: What users are fundamentally trying to achieve""",
    },
    "PERSONAS": {
        "title": "Detailed User Personas",
        "task": """Create rich, specific user personas. For each persona cover:
- Name, role, and background
- Goals and motivations
- Pain points and frustrations
- Current workflow and tools used
- Technical comfort level
- Definition of success""",
    },
    "JOURNEYS": {
        "title": "User Journeys & Jobs to Be Done",
        "task": """Map the user experience and core jobs. Cover:
1. **User Journey Map**: Step-by-step flow from discovery to regular use
2. **Key Touchpoints**: Critical interaction moments that define the experience
3. **Jobs to Be Done**: Functional, emotional, and social jobs
4. **Failure Scenarios**: Where the current experience breaks down""",
    },
    "PROBLEM": {
        "title": "Deep Problem Analysis",
        "task": """Conduct a thorough analysis of the core problem. Cover:
1. **Root Cause Analysis**: The underlying causes, not just surface symptoms
2. **Problem Impact**: Quantified cost — time, money, missed opportunities
3. **Problem Frequency**: How often this problem occurs and for whom
4. **Current Workarounds**: What users do today and why it is insufficient""",
    },
    "VISION": {
        "title": "Product Vision & Strategic Direction",
        "task": """Define the product vision and strategy. Cover:
1. **Vision Statement**: The north-star aspiration in one compelling sentence
2. **Strategic Bet**: The core hypothesis this product is testing
3. **Long-Term Direction**: Where this product goes in 2-3 years
4. **What Success Looks Like**: A concrete picture of a successful outcome""",
    },
    "VALUE": {
        "title": "Value Proposition & Differentiators",
        "task": """Define the unique value this product delivers. Cover:
1. **Core Value Proposition**: The primary reason users choose this over alternatives
2. **Key Differentiators**: 3-5 specific advantages with supporting evidence
3. **Why We Can Win**: Unique capabilities, timing, or positioning advantages
4. **Elevator Pitch**: One sentence explanation for a non-technical stakeholder""",
    },
    "FEATURES": {
        "title": "Feature Set & Prioritization",
        "task": """Define and prioritize product features. Cover:
1. **Must-Have Features**: Core functionality without which the product fails
2. **Should-Have Features**: High-value additions for the launch release
3. **Nice-to-Have Features**: Enhancements deferred to future iterations
4. **Feature Rationale**: Why each must-have feature earns that priority status""",
    },
    "SCOPE": {
        "title": "MVP Scope & Boundaries",
        "task": """Define the MVP scope precisely. Cover:
1. **MVP Feature Set**: The minimum that delivers real, measurable value
2. **Out of Scope**: What is explicitly excluded and why
3. **Scope Rationale**: Why these boundaries make sense for v1
4. **Scope Risks**: What could cause scope creep and how to prevent it""",
    },
    "CONSTRAINTS": {
        "title": "Technical Constraints & Architecture Fit",
        "task": """Define technical boundaries grounded in the actual codebase. Cover:
1. **Architecture Constraints**: What the existing system allows and limits
2. **Integration Requirements**: What must connect to existing infrastructure
3. **Performance Requirements**: Response time, throughput, and availability targets
4. **Technical Debt Risks**: Existing code issues that could impact delivery""",
    },
    "RISKS": {
        "title": "Risk Analysis & Mitigation Strategies",
        "task": """Identify and address key risks. Cover:
1. **Technical Risks**: Implementation uncertainties and hard dependencies
2. **Product Risks**: Assumptions about user behavior that could be wrong
3. **Market Risks**: External factors that could undermine the product
4. **Mitigation Strategies**: Concrete actions to reduce each identified risk""",
    },
    "METRICS": {
        "title": "Success Metrics, KPIs & OKRs",
        "task": """Define measurable success criteria. Cover:
1. **North Star Metric**: The single most important measure of product success
2. **Primary KPIs**: 3-5 key indicators with specific, time-bound targets
3. **Leading Indicators**: Early signals that predict long-term success
4. **Anti-Metrics**: What NOT to optimize for
5. **Measurement Plan**: How and when to collect each metric""",
    },
    "ROADMAP": {
        "title": "Release Roadmap & Milestones",
        "task": """Define the delivery plan. Cover:
1. **Phase 1 (MVP)**: What ships first and the rationale for this scope
2. **Phase 2**: Next iteration with highest-priority additions
3. **Phase 3+**: Longer-term feature vision
4. **Key Milestones**: Decision points, demos, and success gates
5. **Phase Dependencies**: What must be true before each phase can start""",
    },
    "DEPENDENCIES": {
        "title": "Dependencies & Assumptions",
        "task": """Surface hidden dependencies and critical assumptions. Cover:
1. **Technical Dependencies**: Systems, APIs, or infrastructure required
2. **External Dependencies**: Third-party services or team capabilities needed
3. **Key Assumptions**: The most critical beliefs that could be proven wrong
4. **Assumption Validation**: How to test each critical assumption quickly""",
    },
    "VALIDATION": {
        "title": "Testing & Validation Strategy",
        "task": """Define how the product will be validated. Cover:
1. **User Validation**: How to test with real users before the full build
2. **Technical Testing**: Core testing strategy for critical functionality
3. **Launch Criteria**: Minimum quality bar required to go live
4. **Post-Launch Monitoring**: How to detect and respond to problems early""",
    },
    "COMPLETE": {
        "title": "Final Product Brief Assembly",
        "task": """Assemble all sections into a cohesive, publication-ready product brief.
Ensure cross-references are consistent, the narrative flows logically, and there is no generic filler.
Every section must reflect the actual product being built.

Include all sections:
- Title and metadata
- Executive Summary
- Context & Market Analysis
- User Research (Personas, Journeys)
- Problem & Vision
- Value Proposition
- Feature Scope (MVP + Roadmap)
- Technical Constraints & Risks
- Success Metrics & Validation Strategy
- Appendix (technical context summary)""",
    },
}


def _build_prompt(
    pass_type: str,
    step_config: dict,
    problem_description: str,
    context: str,
    codebase_context: str,
    artifact_so_far: str,
    previous_output: str,
    critique_output: str,
) -> str:
    title = step_config["title"]
    task = step_config["task"]

    if pass_type == "draft":
        return f"""## Task: Draft — {title}

{task}

<artifact_so_far>
{artifact_so_far}
</artifact_so_far>

<problem_description>
{problem_description}
</problem_description>

<additional_context>
{context}
</additional_context>

<codebase_context>
{codebase_context}
</codebase_context>

Output the draft in clean markdown with clear section headers. Be specific — reference the actual product, not generic examples."""

    elif pass_type == "critique":
        return f"""## Task: Critique — {title}

Review the draft below. Identify specific weaknesses, gaps, and improvements needed.

<draft>
{previous_output}
</draft>

<problem_description>
{problem_description}
</problem_description>

<artifact_so_far>
{artifact_so_far}
</artifact_so_far>

Provide a numbered list of specific critiques. Focus on: missing specificity, incorrect assumptions, gaps in coverage, and generic filler that needs replacing."""

    elif pass_type == "refine":
        return f"""## Task: Refine — {title}

Incorporate the critique and produce a substantially improved version. Address every critique point explicitly.

<draft>
{previous_output}
</draft>

<critique>
{critique_output}
</critique>

<problem_description>
{problem_description}
</problem_description>

Output improved markdown. Do not make cosmetic changes only — meaningfully address each critique point."""

    elif pass_type == "validate":
        return f"""## Task: Validate — {title}

Validate this section against: (1) technical feasibility given the codebase, (2) internal consistency with prior sections, (3) alignment with the core problem statement.

<refined_content>
{previous_output}
</refined_content>

<artifact_so_far>
{artifact_so_far}
</artifact_so_far>

<codebase_context>
{codebase_context}
</codebase_context>

<problem_description>
{problem_description}
</problem_description>

Output a validation report: what checks out, what needs correction, and specific fixes required."""

    elif pass_type == "deepen":
        return f"""## Task: Deepen — {title}

Deepen and enrich this section. Add concrete examples, specific data points, and actionable detail. Address the validation findings.

<current_content>
{previous_output}
</current_content>

<validation_findings>
{critique_output}
</validation_findings>

<problem_description>
{problem_description}
</problem_description>

<codebase_context>
{codebase_context}
</codebase_context>

Output enriched markdown. Every claim must be specific and grounded. No generic filler."""

    elif pass_type == "polish":
        return f"""## Task: Polish — {title}

Produce the final, publication-ready version. Clean prose, consistent formatting, zero generic filler. This is the definitive output for this section.

<deepened_content>
{previous_output}
</deepened_content>

<problem_description>
{problem_description}
</problem_description>

Output final polished markdown ready to hand to a development team."""

    else:
        raise ValueError(f"Unknown pass_type: {pass_type}")


def get_prompt(
    step: str,
    pass_type: str,
    problem_description: str,
    context: str | None,
    codebase_context: str,
    artifact_so_far: str,
    previous_output: str,
    critique_output: str,
) -> str:
    """Build the full prompt for a given step and pass."""
    step_config = STEP_CONFIGS[step]
    return _build_prompt(
        pass_type=pass_type,
        step_config=step_config,
        problem_description=problem_description,
        context=context or "",
        codebase_context=codebase_context,
        artifact_so_far=artifact_so_far,
        previous_output=previous_output,
        critique_output=critique_output,
    )


def total_passes() -> int:
    """Total number of LLM passes in a full workflow."""
    return len(BMAD_STEPS) * len(PASS_TYPES)
