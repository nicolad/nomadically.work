/**
 * OpenRouter Agent Helpers
 *
 * Pre-configured agent templates using DeepSeek models through OpenRouter.
 * These helpers make it easy to create agents with consistent configurations.
 */

import { Agent } from "@mastra/core/agent";
import { deepseekModels } from "./provider";
import type { OpenRouterOptions } from "./config";
import { GOAL_CONTEXT_LINE } from "@/constants/goal";

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

  return new Agent({
    id: config.id || `chat-agent-${Date.now()}`,
    name: config.name,
    instructions: config.instructions,
    model,
  });
}

/**
 * Create a reasoning agent using DeepSeek R1 through OpenRouter
 */
export function createReasoningAgent(config: Omit<AgentConfig, "model">) {
  return new Agent({
    id: config.id || `reasoning-agent-${Date.now()}`,
    name: config.name,
    instructions: config.instructions,
    model: deepseekModels.r1(),
  });
}

/**
 * Create a coding agent using DeepSeek Coder through OpenRouter
 */
export function createCodingAgent(config: Omit<AgentConfig, "model">) {
  return new Agent({
    id: config.id || `coding-agent-${Date.now()}`,
    name: config.name,
    instructions: config.instructions,
    model: deepseekModels.coder(),
  });
}

/**
 * Pre-configured agent templates
 */
export const agentTemplates = {
  /**
   * General assistant using DeepSeek Chat
   */
  assistant: (instructions?: string) =>
    createChatAgent({
      name: "Assistant",
      instructions:
        instructions || `${GOAL_CONTEXT_LINE} You are a helpful assistant.`,
      model: "chat",
    }),

  /**
   * Reasoning agent using DeepSeek R1
   */
  reasoning: (instructions?: string) =>
    createReasoningAgent({
      name: "Reasoning Assistant",
      instructions:
        instructions ||
        `${GOAL_CONTEXT_LINE} You are a reasoning assistant. Think through problems step by step.`,
    }),

  /**
   * Coding agent using DeepSeek Coder
   */
  coder: (instructions?: string) =>
    createCodingAgent({
      name: "Coding Assistant",
      instructions:
        instructions ||
        `${GOAL_CONTEXT_LINE} You are an expert coding assistant specialized in software development.`,
    }),
} as const;
