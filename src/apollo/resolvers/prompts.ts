import { Langfuse } from "langfuse";
import { LangfuseClient } from "@langfuse/client";
import {
  LANGFUSE_SECRET_KEY,
  LANGFUSE_PUBLIC_KEY,
  LANGFUSE_BASE_URL,
} from "@/config/env";
import { PROMPTS } from "@/observability/prompts";
import { GraphQLContext } from "@/apollo/context";

const langfuse = new Langfuse({
  secretKey: LANGFUSE_SECRET_KEY,
  publicKey: LANGFUSE_PUBLIC_KEY,
  baseUrl: LANGFUSE_BASE_URL,
});

const langfuseClient = new LangfuseClient({
  secretKey: LANGFUSE_SECRET_KEY,
  publicKey: LANGFUSE_PUBLIC_KEY,
  baseUrl: LANGFUSE_BASE_URL,
});

// In-memory storage for prompt usage tracking (replace with DB in production)
const promptUsageLog: Array<{
  promptName: string;
  userEmail: string;
  version: number;
  label?: string;
  usedAt: string;
  traceId?: string;
}> = [];

export const promptResolvers = {
  Query: {
    prompt: async (
      _: any,
      { name, version, label }: { name: string; version?: number; label?: string },
      context: GraphQLContext
    ) => {
      try {
        let prompt;
        
        if (label) {
          // Fetch by label (e.g., 'production', 'latest')
          prompt = await langfuse.getPrompt(name, undefined, { label });
        } else if (version) {
          prompt = await langfuse.getPrompt(name, version);
        } else {
          // Default to production label
          prompt = await langfuse.getPrompt(name);
        }

        // Log usage if user is authenticated
        if (context.userEmail) {
          promptUsageLog.push({
            promptName: name,
            userEmail: context.userEmail,
            version: prompt.version || 0,
            label: label,
            usedAt: new Date().toISOString(),
          });

          // Keep only last 1000 entries
          if (promptUsageLog.length > 1000) {
            promptUsageLog.shift();
          }
        }

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
          createdAt: null,
          updatedAt: null,
          createdBy: null, // Langfuse SDK doesn't expose creator
          isUserSpecific: false, // Could be enhanced to check tags/metadata
        };
      } catch (error) {
        console.error("Error fetching prompt:", error);
        throw new Error(`Failed to fetch prompt: ${error instanceof Error ? error.message : String(error)}`);
      }
    },

    prompts: async (_: any, __: any, context: GraphQLContext) => {
   
    },

    myPromptUsage: async (
      _: any,
      { limit = 50 }: { limit?: number },
      context: GraphQLContext
    ) => {
      if (!context.userEmail) {
        return [];
      }

      return promptUsageLog
        .filter(u => u.userEmail === context.userEmail)
        .slice(-limit)
        .reverse();
    },
  },

  Mutation: {
    createPrompt: async (
      _: any,
      { input }: { input: any },
      context: GraphQLContext
    ) => {
      if (!context.userEmail) {
        throw new Error("Authentication required to create prompts");
      }

      try {
        // Create prompt in Langfuse with user tag
        const promptData: any = {
          name: input.name,
          type: input.type.toLowerCase(),
          labels: input.labels || [],
          tags: [...(input.tags || []), `created-by:${context.userEmail}`],
        };

        if (input.type === "TEXT") {
          promptData.prompt = input.prompt;
        } else {
          promptData.prompt = input.chatMessages;
        }

        if (input.config) {
          promptData.config = input.config;
        }

        // Use the Langfuse client SDK to create prompt
        await langfuseClient.prompt.create(promptData);

        // Fetch the created prompt to get full details with version
        const created = await langfuse.getPrompt(input.name);
        const isChat = created.type === "chat";

        return {
          name: created.name,
          version: created.version || 1,
          type: created.type === "chat" ? "CHAT" : "TEXT",
          prompt: isChat ? null : created.prompt,
          chatMessages: isChat ? created.prompt : null,
          config: created.config || null,
          labels: created.labels || [],
          tags: created.tags || [],
          createdAt: new Date().toISOString(),
          updatedAt: null,
          createdBy: context.userEmail,
          isUserSpecific: true,
        };
      } catch (error) {
        console.error("Error creating prompt:", error);
        throw new Error(`Failed to create prompt: ${error instanceof Error ? error.message : String(error)}`);
      }
    },

    updatePromptLabel: async (
      _: any,
      { name, version, label }: { name: string; version: number; label: string },
      context: GraphQLContext
    ) => {
      if (!context.userEmail) {
        throw new Error("Authentication required to update prompt labels");
      }

      try {
        // Note: Langfuse SDK doesn't have direct label update method
        // This would typically be done via the Langfuse UI or API
        // For now, we'll fetch the prompt and return it
        const prompt = await langfuse.getPrompt(name, version);
        const isChat = prompt.type === "chat";

        return {
          name: prompt.name,
          version: prompt.version,
          type: prompt.type === "chat" ? "CHAT" : "TEXT",
          prompt: isChat ? null : prompt.prompt,
          chatMessages: isChat ? prompt.prompt : null,
          config: prompt.config || null,
          labels: [...(prompt.labels || []), label],
          tags: prompt.tags || [],
          createdAt: null,
          updatedAt: new Date().toISOString(),
          createdBy: context.userEmail,
          isUserSpecific: false,
        };
      } catch (error) {
        console.error("Error updating prompt label:", error);
        throw new Error(`Failed to update prompt label: ${error instanceof Error ? error.message : String(error)}`);
      }
    },
  },
};
