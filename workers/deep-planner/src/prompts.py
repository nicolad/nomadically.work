"""BMAD Product Brief workflow prompts.

Each BMAD step has three passes: draft, critique, refine.
Steps follow the BMAD product brief template structure.
"""

# Workflow steps in execution order
BMAD_STEPS = [
    "INIT",       # Executive summary + vision statement
    "VISION",     # Problem space, target users, value proposition
    "USERS",      # User personas and journey mapping
    "SCOPE",      # Feature scope, MVP boundaries, technical constraints
    "METRICS",    # Success metrics, KPIs, acceptance criteria
    "COMPLETE",   # Final assembly, cross-references, coherence pass
]

# System prompt injected into all calls
SYSTEM_BASE = """You are a senior product strategist executing the BMAD (Business Model Architecture Design) methodology.
You are generating a Product Brief for a software product.
You must produce structured, actionable output following the BMAD template format.
Be specific, concrete, and grounded in the codebase context provided.
Do not use generic placeholder text — every section must reflect the actual product."""

# Step-specific prompts
STEP_PROMPTS: dict[str, dict[str, str]] = {
    "INIT": {
        "draft": """## Task: Draft Executive Summary & Vision

Based on the problem description and codebase context below, draft:

1. **Executive Summary** (2-3 paragraphs): What is this product? What problem does it solve? Who is it for?
2. **Vision Statement** (1 sentence): The aspirational north-star for this product.
3. **Problem Statement**: The core pain point in specific, measurable terms.

<problem_description>
{problem_description}
</problem_description>

<additional_context>
{context}
</additional_context>

<codebase_context>
{codebase_context}
</codebase_context>

Output the draft in markdown format with clear section headers.""",

        "critique": """## Task: Critique the Draft

Review the following draft executive summary and vision for a product brief.
Identify weaknesses, gaps, and areas for improvement. Be specific.

<draft>
{previous_output}
</draft>

<problem_description>
{problem_description}
</problem_description>

Provide a numbered list of specific critiques and suggestions.""",

        "refine": """## Task: Refine Based on Critique

Rewrite the executive summary and vision, incorporating the critique feedback.
Produce the final version of this section.

<draft>
{previous_output}
</draft>

<critique>
{critique_output}
</critique>

<problem_description>
{problem_description}
</problem_description>

Output the refined section in clean markdown.""",
    },

    "VISION": {
        "draft": """## Task: Draft Problem Space & Value Proposition

Building on the executive summary, draft:

1. **Problem Space**: Detailed analysis of the problem domain, market context, and existing solutions
2. **Target Users**: High-level user segments (detailed personas come later)
3. **Value Proposition**: Why this solution is uniquely positioned
4. **Key Differentiators**: 3-5 specific advantages over alternatives

<artifact_so_far>
{artifact_so_far}
</artifact_so_far>

<problem_description>
{problem_description}
</problem_description>

<codebase_context>
{codebase_context}
</codebase_context>

Output in markdown with clear section headers.""",

        "critique": """## Task: Critique Problem Space & Value Proposition

Review this section for clarity, specificity, and alignment with the executive summary.

<draft>
{previous_output}
</draft>

<artifact_so_far>
{artifact_so_far}
</artifact_so_far>

Provide specific, actionable critiques.""",

        "refine": """## Task: Refine Problem Space & Value Proposition

Incorporate the critique and produce the final version.

<draft>
{previous_output}
</draft>

<critique>
{critique_output}
</critique>

Output refined markdown.""",
    },

    "USERS": {
        "draft": """## Task: Draft User Personas & Journey Maps

Create detailed user personas and journey maps:

1. **Primary Persona**: Name, role, goals, pain points, tech comfort level
2. **Secondary Persona(s)**: Additional key user types
3. **User Journey**: Key touchpoints from discovery to regular use
4. **Jobs to Be Done**: Functional, emotional, and social jobs

<artifact_so_far>
{artifact_so_far}
</artifact_so_far>

<problem_description>
{problem_description}
</problem_description>

<codebase_context>
{codebase_context}
</codebase_context>

Output in markdown with structured persona cards.""",

        "critique": """## Task: Critique User Personas

Review personas for realism, specificity, and coverage of the target market.

<draft>
{previous_output}
</draft>

<artifact_so_far>
{artifact_so_far}
</artifact_so_far>

Provide specific critiques.""",

        "refine": """## Task: Refine User Personas

Incorporate critique and produce final personas.

<draft>
{previous_output}
</draft>

<critique>
{critique_output}
</critique>

Output refined markdown.""",
    },

    "SCOPE": {
        "draft": """## Task: Draft Feature Scope & Technical Constraints

Define the product scope:

1. **MVP Feature Set**: Prioritized list of must-have features for v1
2. **Future Features**: Features explicitly deferred to later versions
3. **Technical Constraints**: Architecture limitations, integration requirements, performance targets
4. **Out of Scope**: What this product explicitly does NOT do

<artifact_so_far>
{artifact_so_far}
</artifact_so_far>

<problem_description>
{problem_description}
</problem_description>

<codebase_context>
{codebase_context}
</codebase_context>

Output in markdown. Reference actual schemas and architecture from the codebase context.""",

        "critique": """## Task: Critique Scope Definition

Review for completeness, feasibility, and alignment with user needs.

<draft>
{previous_output}
</draft>

<artifact_so_far>
{artifact_so_far}
</artifact_so_far>

Provide specific critiques.""",

        "refine": """## Task: Refine Scope Definition

Incorporate critique and produce final scope.

<draft>
{previous_output}
</draft>

<critique>
{critique_output}
</critique>

Output refined markdown.""",
    },

    "METRICS": {
        "draft": """## Task: Draft Success Metrics & KPIs

Define measurable success criteria:

1. **North Star Metric**: The single most important measure of success
2. **Primary KPIs**: 3-5 key performance indicators with targets
3. **Secondary Metrics**: Supporting metrics for deeper insight
4. **Acceptance Criteria**: Minimum thresholds for launch readiness
5. **Anti-Metrics**: What we explicitly do NOT optimize for

<artifact_so_far>
{artifact_so_far}
</artifact_so_far>

<problem_description>
{problem_description}
</problem_description>

Output in markdown with specific, measurable targets.""",

        "critique": """## Task: Critique Success Metrics

Review metrics for measurability, relevance, and completeness.

<draft>
{previous_output}
</draft>

<artifact_so_far>
{artifact_so_far}
</artifact_so_far>

Provide specific critiques.""",

        "refine": """## Task: Refine Success Metrics

Incorporate critique and produce final metrics.

<draft>
{previous_output}
</draft>

<critique>
{critique_output}
</critique>

Output refined markdown.""",
    },

    "COMPLETE": {
        "draft": """## Task: Assemble Final Product Brief

Combine all sections into a cohesive product brief document.
Ensure cross-references are consistent and the narrative flows logically.

<artifact_so_far>
{artifact_so_far}
</artifact_so_far>

<problem_description>
{problem_description}
</problem_description>

Output the complete product brief as a single markdown document with:
- Title and metadata
- Executive Summary
- Vision & Problem Space
- User Personas
- Feature Scope
- Success Metrics
- Appendix (technical context summary)""",

        "critique": """## Task: Final Quality Review

Review the complete product brief for:
1. Internal consistency across sections
2. Specificity (no generic filler)
3. Actionability (can a team build from this?)
4. Completeness (all BMAD sections present)

<draft>
{previous_output}
</draft>

Provide a final quality assessment with specific fixes needed.""",

        "refine": """## Task: Final Polish

Apply the final critique and produce the publication-ready product brief.

<draft>
{previous_output}
</draft>

<critique>
{critique_output}
</critique>

Output the final, complete product brief in clean markdown.""",
    },
}

PASS_TYPES = ["draft", "critique", "refine"]


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
    template = STEP_PROMPTS[step][pass_type]
    return template.format(
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
