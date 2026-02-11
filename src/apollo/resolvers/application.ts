import type { GraphQLContext } from "../context";

export const applicationResolvers = {
  Query: {
    async applications(
      _parent: any,
      _args: any,
      context: GraphQLContext,
    ) {
      try {
        // Get applications for authenticated user
        if (!context.userEmail) {
          throw new Error("User must be authenticated to view applications");
        }

        // TODO: Fetch applications from database
        // For now, return empty array
        return [];
      } catch (error) {
        console.error("Error fetching applications:", error);
        throw new Error("Failed to fetch applications");
      }
    },
  },
  Mutation: {
    async createApplication(
      _parent: any,
      args: {
        input: {
          jobId: string;
          resume?: File;
          questions: Array<{
            questionId: string;
            questionText: string;
            answerText: string;
          }>;
        };
      },
      context: GraphQLContext,
    ) {
      try {
        // Get email from authenticated user context
        if (!context.userEmail) {
          throw new Error(
            "User must be authenticated to submit an application",
          );
        }

        // TODO: Implement application creation logic
        // - Store application in database
        // - Handle resume upload
        // - Send confirmation email

        return {
          email: context.userEmail,
          jobId: args.input.jobId,
          resume: args.input.resume,
          questions: args.input.questions,
        };
      } catch (error) {
        console.error("Error creating application:", error);
        throw new Error("Failed to create application");
      }
    },
  },
};
