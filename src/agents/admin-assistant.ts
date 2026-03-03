/**
 * Admin Assistant Agent
 *
 * Ops-grade agent for internal debugging, evidence inspection, and batch reprocessing.
 * TODO: Re-implement with Vercel AI SDK when D1 tooling is ready.
 */

import { deepseek } from "@ai-sdk/deepseek";
import { generateText } from "ai";
import { GOAL_PROMPT_FRAGMENT } from "@/constants/goal";
import { aiTelemetry } from "@/lib/telemetry";

const ADMIN_INSTRUCTIONS = `${GOAL_PROMPT_FRAGMENT}

You are an admin assistant for the Nomadically.work job platform. Your role is to help debug classification decisions, inspect evidence, and coordinate reprocessing runs.`;

export const adminAssistantAgent = {
  async generate(prompt: string) {
    const result = await generateText({
      model: deepseek("deepseek-chat"),
      system: ADMIN_INSTRUCTIONS,
      prompt,
      experimental_telemetry: aiTelemetry("admin-assistant"),
    });
    return { text: result.text };
  },
};
