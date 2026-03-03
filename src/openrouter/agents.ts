/**
 * OpenRouter Agent Helpers
 *
 * Pre-configured agent templates using DeepSeek models through OpenRouter.
 * Uses Vercel AI SDK instead of Mastra.
 */

import { generateText } from "ai";
import { deepseekModels } from "./provider";
import type { OpenRouterOptions } from "./config";
import { GOAL_CONTEXT_LINE } from "@/constants/goal";
import { aiTelemetry } from "@/lib/telemetry";

/**
 * Agent configuration options
 */
export interface AgentConfig {
  id?: string;
  name: string;
  instructions: string;
  model?: "chat" | "r1" | "r1DistillQwen32B" | "r1DistillLlama70B" | "coder";
  openrouterOptions?: OpenRouterOptions;
}

/**
 * Create a general-purpose agent using DeepSeek Chat through OpenRouter
 */
export function createChatAgent(config: AgentConfig) {
  const modelKey = config.model || "chat";
  const model = deepseekModels[modelKey]();

  return {
    id: config.id || `chat-agent-${Date.now()}`,
    name: config.name,
    async generate(prompt: string) {
      const result = await generateText({
        model,
        system: config.instructions,
        prompt,
        experimental_telemetry: aiTelemetry(`openrouter-chat-${config.name}`),
      });
      return { text: result.text };
    },
  };
}

/**
 * Create a reasoning agent using DeepSeek R1 through OpenRouter
 */
export function createReasoningAgent(config: Omit<AgentConfig, "model">) {
  return {
    id: config.id || `reasoning-agent-${Date.now()}`,
    name: config.name,
    async generate(prompt: string) {
      const result = await generateText({
        model: deepseekModels.r1(),
        system: config.instructions,
        prompt,
        experimental_telemetry: aiTelemetry(`openrouter-reasoning-${config.name}`),
      });
      return { text: result.text };
    },
  };
}

/**
 * Create a coding agent using DeepSeek Coder through OpenRouter
 */
export function createCodingAgent(config: Omit<AgentConfig, "model">) {
  return {
    id: config.id || `coding-agent-${Date.now()}`,
    name: config.name,
    async generate(prompt: string) {
      const result = await generateText({
        model: deepseekModels.coder(),
        system: config.instructions,
        prompt,
        experimental_telemetry: aiTelemetry(`openrouter-coder-${config.name}`),
      });
      return { text: result.text };
    },
  };
}

/**
 * Pre-configured agent templates
 */
export const agentTemplates = {
  assistant: (instructions?: string) =>
    createChatAgent({
      name: "Assistant",
      instructions:
        instructions || `${GOAL_CONTEXT_LINE} You are a helpful assistant.`,
      model: "chat",
    }),

  reasoning: (instructions?: string) =>
    createReasoningAgent({
      name: "Reasoning Assistant",
      instructions:
        instructions ||
        `${GOAL_CONTEXT_LINE} You are a reasoning assistant. Think through problems step by step.`,
    }),

  coder: (instructions?: string) =>
    createCodingAgent({
      name: "Coding Assistant",
      instructions:
        instructions ||
        `${GOAL_CONTEXT_LINE} You are an expert coding assistant specialized in software development.`,
    }),
} as const;
