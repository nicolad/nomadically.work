import { Langfuse } from "langfuse";
import {
  LANGFUSE_SECRET_KEY,
  LANGFUSE_PUBLIC_KEY,
  LANGFUSE_BASE_URL,
} from "@/config/env";
import { PROMPTS } from "@/observability/prompts";

const langfuse = new Langfuse({
  secretKey: LANGFUSE_SECRET_KEY,
  publicKey: LANGFUSE_PUBLIC_KEY,
  baseUrl: LANGFUSE_BASE_URL,
});

export const promptResolvers = {
  Query: {
    prompt: async (
      _: any,
      { name, version }: { name: string; version?: number }
    ) => {
      try {
        const prompt = version
          ? await langfuse.getPrompt(name, version)
          : await langfuse.getPrompt(name);

        // Transform Langfuse prompt to our GraphQL schema
        const isChat = prompt.type === "chat";
        
        return {
          name: prompt.name,
          version: prompt.version,
          type: prompt.type === "chat" ? "CHAT" : "TEXT",
          prompt: isChat ? null : prompt.prompt,
          chatMessages: isChat ? prompt.prompt : null,
          config: prompt.config || null,
          labels: prompt.labels || [],
          tags: prompt.tags || [],
          createdAt: null, // Langfuse SDK doesn't expose these
          updatedAt: null,
        };
      } catch (error) {
        console.error("Error fetching prompt:", error);
        throw new Error(`Failed to fetch prompt: ${error instanceof Error ? error.message : String(error)}`);
      }
    },

    prompts: async () => {
      // Return registered prompts from our application
      const registered = [
        {
          name: PROMPTS.JOB_CLASSIFIER.name,
          fallbackText: PROMPTS.JOB_CLASSIFIER.fallbackText,
          description: "Classifies job postings as Remote EU eligible",
          category: "Job Processing",
        },
      ];

      return registered;
    },
  },
};
