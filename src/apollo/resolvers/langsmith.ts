import {
  fetchLangSmithPrompt,
  fetchLangSmithPromptCommit,
  listLangSmithPrompts,
  createLangSmithPrompt,
  updateLangSmithPrompt,
  deleteLangSmithPrompt,
  pushLangSmithPrompt,
} from "@/langsmith";
import { GraphQLContext } from "@/apollo/context";

export const langsmithResolvers = {
  Query: {
    langsmithPrompt: async (
      _: any,
      { promptIdentifier }: { promptIdentifier: string },
      context: GraphQLContext
    ) => {
      try {
        return await fetchLangSmithPrompt(promptIdentifier);
      } catch (error) {
        console.error("Error fetching LangSmith prompt:", error);
        throw new Error(
          `Failed to fetch prompt: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    },

    langsmithPrompts: async (
      _: any,
      {
        isPublic,
        isArchived,
        query,
      }: { isPublic?: boolean; isArchived?: boolean; query?: string },
      context: GraphQLContext
    ) => {
      try {
        // Fetch all prompts (include private by default)
        // Note: LangSmith API will only return prompts accessible by the API key
        const allPrompts = await listLangSmithPrompts({ 
          isPublic: isPublic ?? undefined, // Don't filter by public/private by default
          isArchived, 
          query 
        });
        
        console.log('LangSmith raw prompts:', allPrompts.length, allPrompts.map(p => ({ 
          name: p.fullName, 
          tags: p.tags, 
          owner: p.owner,
          isPublic: p.isPublic 
        })));
        
        // If no user email, return empty array
        if (!context.userEmail) {
          return [];
        }
        
        // Filter prompts that belong to the user
        // Check if prompt has user tags or if user is the owner
        const userPrompts = allPrompts.filter((prompt) => {
          // Check user tags
          const hasUserTag = prompt.tags.some((tag) =>
            tag.includes(`user:${context.userEmail}`) ||
            tag.includes(`owner:${context.userEmail}`) ||
            tag.includes(`created-by:${context.userEmail}`)
          );
          
          // Check if owner matches user email
          const isOwner = prompt.owner === context.userEmail;
          
          return hasUserTag || isOwner;
        });
        
        console.log('Filtered user prompts:', userPrompts.length, userPrompts.map(p => p.fullName));
        
        return userPrompts;
      } catch (error) {
        console.error("Error listing LangSmith prompts:", error);
        // Return empty array on error instead of throwing
        return [];
      }
    },

    langsmithPromptCommit: async (
      _: any,
      {
        promptIdentifier,
        includeModel,
      }: { promptIdentifier: string; includeModel?: boolean },
      context: GraphQLContext
    ) => {
      try {
        return await fetchLangSmithPromptCommit(promptIdentifier, {
          includeModel,
        });
      } catch (error) {
        console.error("Error fetching LangSmith prompt commit:", error);
        throw new Error(
          `Failed to fetch prompt commit: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    },
  },

  Mutation: {
    createLangSmithPrompt: async (
      _: any,
      {
        promptIdentifier,
        input,
      }: {
        promptIdentifier: string;
        input?: {
          description?: string;
          readme?: string;
          tags?: string[];
          isPublic?: boolean;
        };
      },
      context: GraphQLContext
    ) => {
      if (!context.userEmail) {
        throw new Error("Authentication required to create prompts");
      }

      try {
        // Add user-related tags for tracking ownership
        // Note: LangSmith uses API key tenant for ownership, not prompt identifier prefix
        const userTags = [
          `user:${context.userEmail}`,
          `created-by:${context.userEmail}`,
          `owner:${context.userEmail}`,
        ];

        const enhancedInput = {
          ...input,
          tags: [...(input?.tags || []), ...userTags],
        };

        return await createLangSmithPrompt(promptIdentifier, enhancedInput);
      } catch (error) {
        console.error("Error creating LangSmith prompt:", error);
        throw new Error(
          `Failed to create prompt: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    },

    updateLangSmithPrompt: async (
      _: any,
      {
        promptIdentifier,
        input,
      }: {
        promptIdentifier: string;
        input: {
          description?: string;
          readme?: string;
          tags?: string[];
          isPublic?: boolean;
          isArchived?: boolean;
        };
      },
      context: GraphQLContext
    ) => {
      if (!context.userEmail) {
        throw new Error("Authentication required to update prompts");
      }

      try {
        // LangSmith uses API key tenant for ownership validation
        return await updateLangSmithPrompt(promptIdentifier, input);
      } catch (error) {
        console.error("Error updating LangSmith prompt:", error);
        throw new Error(
          `Failed to update prompt: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    },

    deleteLangSmithPrompt: async (
      _: any,
      { promptIdentifier }: { promptIdentifier: string },
      context: GraphQLContext
    ) => {
      if (!context.userEmail) {
        throw new Error("Authentication required to delete prompts");
      }

      try {
        // LangSmith uses API key tenant for ownership validation
        return await deleteLangSmithPrompt(promptIdentifier);
      } catch (error) {
        console.error("Error deleting LangSmith prompt:", error);
        throw new Error(
          `Failed to delete prompt: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    },

    pushLangSmithPrompt: async (
      _: any,
      {
        promptIdentifier,
        input,
      }: {
        promptIdentifier: string;
        input?: {
          object?: any;
          parentCommitHash?: string;
          description?: string;
          readme?: string;
          tags?: string[];
          isPublic?: boolean;
        };
      },
      context: GraphQLContext
    ) => {
      if (!context.userEmail) {
        throw new Error("Authentication required to push prompts");
      }

      try {
        // Add user-related tags if creating new prompt
        // LangSmith uses API key tenant for ownership, not prompt identifier prefix
        const userTags = [
          `user:${context.userEmail}`,
          `created-by:${context.userEmail}`,
          `owner:${context.userEmail}`,
        ];

        const enhancedInput = {
          ...input,
          tags: [...(input?.tags || []), ...userTags],
        };

        return await pushLangSmithPrompt(promptIdentifier, enhancedInput);
      } catch (error) {
        console.error("Error pushing LangSmith prompt:", error);
        throw new Error(
          `Failed to push prompt: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    },
  },
};
