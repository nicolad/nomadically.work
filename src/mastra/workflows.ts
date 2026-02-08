import { init } from "@mastra/inngest";
import { inngest } from "./inngest";

/**
 * Initialize Inngest-compatible workflow builders
 * These functions create workflows and steps that work with Inngest's execution model
 */
export const { createWorkflow, createStep } = init(inngest);
