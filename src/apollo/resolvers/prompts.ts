import { Langfuse } from "langfuse";
import { LangfuseClient } from "@langfuse/client";
import {
  LANGFUSE_SECRET_KEY,
  LANGFUSE_PUBLIC_KEY,
  LANGFUSE_BASE_URL,
} from "@/config/env";
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
        let promptName = name;
        
        // If user is authenticated and name doesn't include namespace, add it
        if (context.userEmail && !name.includes('__')) {
          const userNamespace = context.userEmail.replace(/[^a-zA-Z0-9@.]/g, '-');
          promptName = `${userNamespace}__${name}`;
        }
        
        if (label) {
          // Fetch by label (e.g., 'production', 'latest')
          prompt = await langfuse.getPrompt(promptName, undefined, { label });
        } else if (version) {
          prompt = await langfuse.getPrompt(promptName, version);
        } else {
          // Default to production label
          prompt = await langfuse.getPrompt(promptName);
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
      try {
        // Fetch prompts filtered by user email tag
        const userTag = context.userEmail ? `user:${context.userEmail}` : null;
        // https://api.reference.langfuse.com/#tag/prompts/GET/api/public/v2/prompts
        const url = new URL(`${LANGFUSE_BASE_URL}/api/public/v2/prompts`);
        if (userTag) {
          url.searchParams.set('tag', userTag);
        }

        const response = await fetch(url.toString(), {
          headers: {
            Authorization: `Basic ${Buffer.from(
              `${LANGFUSE_PUBLIC_KEY}:${LANGFUSE_SECRET_KEY}`
            ).toString("base64")}`,
          },
        });

        if (!response.ok) {
          throw new Error(`Langfuse API error: ${response.statusText}`);
        }

        const apiResponse = await response.json();
        
        // Langfuse API returns: { data: [...], meta: {...}, pagination: {...} }
        // Map to GraphQL schema matching exact Langfuse shape
        const registeredPrompts = (apiResponse.data || []).map((prompt: {
          name: string;
          tags: string[];
          lastUpdatedAt: string;
          versions: number[];
          labels: string[];
          type: 'text' | 'chat';
          lastConfig: Record<string, any>;
        }) => {
          // Get usage count for this prompt from our in-memory log
          const usageCount = promptUsageLog.filter(
            u => u.promptName === prompt.name
          ).length;

          // Get last user who used this prompt
          const lastUsage = promptUsageLog
            .filter(u => u.promptName === prompt.name)
            .sort((a, b) => new Date(b.usedAt).getTime() - new Date(a.usedAt).getTime())[0];

          return {
            name: prompt.name,
            type: prompt.type,
            tags: prompt.tags,
            labels: prompt.labels,
            versions: prompt.versions,
            lastUpdatedAt: prompt.lastUpdatedAt,
            lastConfig: prompt.lastConfig,
            usageCount,
            lastUsedBy: lastUsage?.userEmail || null,
          };
        });

        return registeredPrompts;
      } catch (error) {
        console.error("Error fetching prompts from Langfuse:", error);
        
        // Return empty array on error instead of throwing
        return [];
      }
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
        // Create user-specific prompt name to ensure strict coupling
        const userNamespace = context.userEmail.replace(/[^a-zA-Z0-9@.]/g, '-');
        const userSpecificName = `${userNamespace}__${input.name}`;
        
        // Create prompt in Langfuse with user tags for strict ownership
        const promptData: any = {
          name: userSpecificName,
          type: input.type.toLowerCase(),
          labels: input.labels || [],
          tags: [
            ...(input.tags || []),
            `user:${context.userEmail}`,
            `created-by:${context.userEmail}`,
            `owner:${context.userEmail}`,
          ],
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
        const created = await langfuse.getPrompt(userSpecificName);
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
