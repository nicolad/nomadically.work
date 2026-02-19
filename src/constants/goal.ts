/**
 * Platform Goal — Single source of truth
 *
 * Every agent, workflow, and evaluation in this codebase ultimately serves
 * the owner's job-search goal defined here. Import these constants wherever
 * an agent system prompt needs to be anchored to the platform mission.
 */

// ---------------------------------------------------------------------------
// Core goal definition
// ---------------------------------------------------------------------------

/** The owner's job-search goal in plain language. */
export const PLATFORM_GOAL =
  "Find a fully remote job in Europe or worldwide as an AI Engineer or as a React Engineer.";

/** Target role families the platform optimises for. */
export const TARGET_ROLES = [
  "AI Engineer",
  "ML Engineer",
  "LLM Engineer",
  "GenAI Engineer",
  "React Engineer",
  "Frontend Engineer",
  "Full-Stack Engineer (React)",
] as const;

/** Acceptable remote scopes. */
export const REMOTE_SCOPES = [
  "fully remote — EU",
  "fully remote — worldwide",
  "fully remote — EMEA",
] as const;

/** EU & adjacent regions the owner can work from. */
export const TARGET_REGIONS = [
  "EU member states",
  "EEA countries",
  "UK (if remote-worldwide)",
  "Worldwide (timezone-compatible with CET ± 3 h)",
] as const;

// ---------------------------------------------------------------------------
// Reusable prompt fragments
// ---------------------------------------------------------------------------

/**
 * A short paragraph suitable for injecting into any agent system prompt.
 * Gives enough context so the agent always operates in service of the goal.
 */
export const GOAL_PROMPT_FRAGMENT = `
PLATFORM GOAL — nomadically.work
You are part of an AI-powered job board that serves one primary mission:
"${PLATFORM_GOAL}"

Target roles: ${TARGET_ROLES.join(", ")}.
Acceptable remote scope: ${REMOTE_SCOPES.join("; ")}.
Target regions: ${TARGET_REGIONS.join("; ")}.

Every output you produce — whether it is a SQL query, a code review, a search result, a classification, or a recommendation — should ultimately advance this goal. Prioritise relevance to the owner's job search when making decisions.
`.trim();

/**
 * A concise one-liner for agents that only need light context
 * (e.g. code helpers, linters).
 */
export const GOAL_CONTEXT_LINE = `This codebase powers nomadically.work — a job board helping its owner land a fully remote AI Engineer or React Engineer role in Europe/worldwide.`;
