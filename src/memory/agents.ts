/**
 * Personalization Agents
 *
 * Uses Mastra's memory and working memory features to track user preferences
 * and provide personalized job recommendations.
 */

import { Agent } from "@mastra/core/agent";
import { Memory } from "@mastra/memory";
import { z } from "zod";
import { preferenceManager, PREFERENCE_FIELDS } from "./preferences";
import {
  GOAL_PROMPT_FRAGMENT,
  TARGET_ROLES,
  REMOTE_SCOPES,
} from "@/constants/goal";

// Working memory schema for user context
const userContextSchema = z.object({
  preferredCountries: z.array(z.string()).optional(),
  preferredTimezones: z.array(z.string()).optional(),
  excludedCompanyTypes: z.array(z.string()).optional(),
  minSalary: z.number().optional(),
  maxSalary: z.number().optional(),
  seniorityLevel: z.string().optional(),
  techStack: z.array(z.string()).optional(),
  preferredCompanies: z.array(z.string()).optional(),
  dislikedCompanies: z.array(z.string()).optional(),
  preferredSkills: z.array(z.string()).optional(),
  workArrangement: z.string().optional(),
  contractType: z.string().optional(),
  lastUpdated: z.string().optional(),
  notes: z.string().optional(),
});

/**
 * Memory configuration for personalization agents
 *
 * Features:
 * - lastMessages: 20 - Keep last 20 messages in context
 * - generateTitle: Auto-generate thread titles from first message
 * - workingMemory: Structured user preference context that persists across threads
 * - scope: "resource" - Per-user memory (isolated by userId)
 *
 * Thread and resource identifiers:
 * - thread: conversation session ID (e.g., "conversation-abc-123")
 * - resource: user ID that owns the thread (e.g., "user_123")
 *
 * Both are required when calling agent.generate() or agent.stream():
 *
 * const response = await personalizationAgent.generate("hello", {
 *   memory: {
 *     thread: threadId,
 *     resource: userId,
 *   },
 * });
 */
const memory = new Memory({
  options: {
    lastMessages: 20,
    generateTitle: {
      // Use smaller, faster model for title generation
      model: "deepseek/deepseek-chat",
      // Keep titles concise for UI display
      instructions:
        "Generate a concise 3-5 word title summarizing the user's main preference or question",
    },
    workingMemory: {
      enabled: true,
      scope: "resource", // Per-user context persists across threads
      schema: userContextSchema,
    },
  },
});

/**
 * Personalization Agent
 *
 * Helps users define and refine their job search preferences.
 * Uses working memory to maintain user context across conversations.
 */
export const personalizationAgent = new Agent({
  id: "personalization-agent",
  name: "Personalization Assistant",
  instructions: `${GOAL_PROMPT_FRAGMENT}

You are a helpful personalization assistant for nomadically.work — a remote job search platform.

The owner's default profile targets: ${TARGET_ROLES.join(", ")}.
Acceptable remote scope: ${REMOTE_SCOPES.join("; ")}.
Use these as sensible defaults when the user hasn't specified preferences yet.

Your role is to help users define and refine their job search preferences through natural conversation.

CAPABILITIES:
- Help users specify preferred countries, time zones, and locations
- Define tech stack priorities and required skills
- Set salary expectations and seniority level
- Identify preferred companies and those to avoid
- Filter out staffing agencies if desired
- Track work arrangement preferences (fully remote, hybrid, etc.)

WORKING MEMORY GUIDELINES:
- You have access to the user's preference context in working memory
- Update the working memory as you learn new preferences
- When a user mentions a preference, immediately update the relevant field
- Always acknowledge what preferences you've captured
- Ask clarifying questions to refine vague preferences

EXAMPLES:
- If user says "I don't want staffing agencies", update excludedCompanyTypes to include ["STAFFING", "AGENCY"]
- If user says "I'm looking for senior roles in Europe", update seniorityLevel to "senior" and preferredCountries to European countries
- If user says "I need at least $120k", update minSalary to 120000

RESPONSE STYLE:
- Conversational and helpful
- Confirm preferences as you capture them
- Suggest related preferences to consider
- Be concise but thorough`,
  model: {
    id: "deepseek/deepseek-reasoner",
  },
  memory,
});

/**
 * Job Recommendation Agent
 *
 * Uses user preferences to filter and recommend jobs.
 * Integrates with the preference manager for evidence-based personalization.
 */
export const recommendationAgent = new Agent({
  id: "recommendation-agent",
  name: "Job Recommendation Assistant",
  instructions: `${GOAL_PROMPT_FRAGMENT}

You are a job recommendation assistant that helps users find relevant fully-remote jobs in the EU or worldwide, with a focus on AI Engineer and React Engineer roles.

Your role is to:
1. Understand user preferences from their working memory context
2. Query the preference manager for evidence-based preferences
3. Filter and rank jobs based on these preferences — default to target roles (${TARGET_ROLES.join(", ")}) when no explicit preference is set
4. Explain why jobs match or don't match user criteria

When a user asks about jobs:
- Check their working memory for preferences
- Consider preference confidence scores
- Prioritize explicit settings over inferred preferences
- Explain recommendations clearly
- Ask for feedback to improve preferences

FILTERING RULES:
- HARD FILTERS (must match):
  - excludedCompanyTypes: Never show jobs from these company types
  - minSalary: Must meet minimum salary if specified
  - preferredCountries: Only show jobs in these countries if specified

- SOFT FILTERS (boost ranking):
  - techStack: Boost jobs with preferred technologies
  - preferredCompanies: Boost jobs from liked companies
  - preferredSkills: Boost jobs requiring preferred skills
  - seniorityLevel: Boost jobs matching experience level

- NEGATIVE SIGNALS:
  - dislikedCompanies: Demote or filter out
  - Staffing agencies (if excludedCompanyTypes includes them)

Always explain your reasoning and ask for feedback.`,
  model: {
    id: "deepseek/deepseek-reasoner",
  },
  memory,
});

/**
 * Helper function to sync preferences to working memory
 */
export async function syncPreferencesToWorkingMemory(params: {
  userId: string;
  threadId: string;
}): Promise<void> {
  const { userId, threadId } = params;

  // Get merged preferences
  const prefs = await preferenceManager.getMergedPreferences({ userId });

  // Build working memory context
  const context: Record<string, unknown> = {
    lastUpdated: new Date().toISOString(),
  };

  for (const [field, data] of Object.entries(prefs)) {
    // Convert field names to camelCase for working memory
    const camelField = field.replace(/_([a-z])/g, (_, letter) =>
      letter.toUpperCase(),
    );
    context[camelField] = data.value;
  }

  // Update working memory
  // This would be done through the agent's memory interface
  console.log(
    `[Sync] Would update working memory for user ${userId}, thread ${threadId}`,
  );
  console.log("Context:", context);
}

/**
 * Helper function to capture preference from user action
 */
export async function capturePreferenceFromAction(params: {
  userId: string;
  action: "view" | "apply" | "like" | "dislike" | "skip";
  jobId: number;
}): Promise<void> {
  const { userId, action, jobId } = params;

  // Infer preferences from action
  await preferenceManager.inferFromAction({
    userId,
    action,
    jobId,
    confidence: action === "apply" ? 0.9 : action === "like" ? 0.7 : 0.5,
  });

  console.log(
    `[Capture] Recorded ${action} for job ${jobId} by user ${userId}`,
  );
}
