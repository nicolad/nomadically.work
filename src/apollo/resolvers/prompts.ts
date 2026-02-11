import {
  createLangfusePrompt,
  fetchLangfusePrompt,
  listLangfusePrompts,
  resolveComposedPrompt,
  toUserPromptName,
  assertPromptAccess,
  compilePrompt,
  pickAbLabel,
} from "@/langfuse";
import { getRecentGenerationsForUser } from "@/langfuse/usage";
import { createScore } from "@/langfuse/scores";
import { GraphQLContext } from "@/apollo/context";

export const promptResolvers = {
  Query: {
    prompt: async (
      _: any,
      {
        name,
        version,
        label,
        resolveComposition,
      }: {
        name: string;
        version?: number;
        label?: string;
        resolveComposition?: boolean;
      },
      context: GraphQLContext,
    ) => {
      try {
        // Convert short name to user-namespaced name if needed
        const fullName = name.includes("/")
          ? name
          : toUserPromptName(context.userEmail, name);

        // Enforce ACL
        if (context.userEmail) {
          assertPromptAccess(fullName, context.userEmail);
        }

        let prompt = await fetchLangfusePrompt(fullName, {
          version,
          label,
          type: undefined, // auto-detect
        });

        // Optionally resolve composed prompts
        if (resolveComposition !== false) {
          prompt = await resolveComposedPrompt(prompt);
        }

        // Note: No longer logging usage in-memory
        // Real usage is available via myPromptUsage query

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
          isUserSpecific: fullName.startsWith("users/"),
        };
      } catch (error) {
        console.error("Error fetching prompt:", error);
        throw new Error(
          `Failed to fetch prompt: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    },

    prompts: async (_: any, __: any, context: GraphQLContext) => {
      try {
        const apiResponse = await listLangfusePrompts(context.userEmail);

        // Fetch full details for each prompt to get the content
        const registeredPrompts = await Promise.all(
          (apiResponse.data || []).map(async (promptMeta: any) => {
            try {
              // Fetch the full prompt with content using the latest label
              const fullPrompt = await fetchLangfusePrompt(promptMeta.name, {
                label: promptMeta.labels?.[0] || undefined,
              });

              // For text prompts, content is a string
              // For chat prompts, content is an array of messages
              const content = fullPrompt.prompt;

              return {
                ...promptMeta,
                content, // Add the actual prompt content
                // Usage count would require separate Observations API call per prompt
                usageCount: 0,
                lastUsedBy: null,
              };
            } catch (err) {
              // If fetching individual prompt fails, return metadata only
              console.error(`Failed to fetch full prompt ${promptMeta.name}:`, err);
              return {
                ...promptMeta,
                content: null,
                usageCount: 0,
                lastUsedBy: null,
              };
            }
          }),
        );

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
      context: GraphQLContext,
    ) => {
      if (!context.userEmail) {
        return [];
      }

      try {
        // Use real Observations API instead of in-memory log
        const observations = await getRecentGenerationsForUser({
          userId: context.userEmail,
          limit,
        });

        return observations.map((o) => ({
          promptName: o.promptName,
          userEmail: context.userEmail,
          version: o.promptVersion ?? 0,
          usedAt: o.startTime,
          traceId: o.traceId,
        }));
      } catch (error) {
        console.error("Error fetching prompt usage:", error);
        return [];
      }
    },
  },

  Mutation: {
    createPrompt: async (
      _: any,
      { input }: { input: any },
      context: GraphQLContext,
    ) => {
      if (!context.userEmail) {
        throw new Error("Authentication required to create prompts");
      }

      try {
        // Create user-specific prompt name using folder-style naming
        const userSpecificName = toUserPromptName(
          context.userEmail,
          input.name,
        );

        // Create prompt in Langfuse with user tags for ownership
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

        const created = await createLangfusePrompt(promptData);
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
        throw new Error(
          `Failed to create prompt: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    },

    updatePromptLabel: async (
      _: any,
      {
        name,
        version,
        label,
      }: { name: string; version: number; label: string },
      context: GraphQLContext,
    ) => {
      if (!context.userEmail) {
        throw new Error("Authentication required to update prompt labels");
      }

      try {
        // Note: Langfuse SDK doesn't have direct label update method
        // This would typically be done via the Langfuse UI or API
        // For now, we'll fetch the prompt and return it
        const prompt = await fetchLangfusePrompt(name, { version });
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
        throw new Error(
          `Failed to update prompt label: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    },
  },
};
