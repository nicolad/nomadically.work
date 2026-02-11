import type { GraphQLContext } from "../context";
import { getDb } from "@/db";
import { applications, userSettings } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export const applicationResolvers = {
  Query: {
    async applications(_parent: any, _args: any, context: GraphQLContext) {
      try {
        // Get applications for authenticated user
        if (!context.userEmail || !context.userId) {
          throw new Error("User must be authenticated to view applications");
        }

        const db = getDb();
        const userApplications = await db
          .select()
          .from(applications)
          .where(eq(applications.user_id, context.userId))
          .orderBy(desc(applications.created_at));

        return userApplications.map((app) => ({
          email: app.email,
          jobId: app.job_id,
          resume: app.resume_url,
          questions: app.questions ? JSON.parse(app.questions) : [],
        }));
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
        if (!context.userEmail || !context.userId) {
          throw new Error(
            "User must be authenticated to submit an application",
          );
        }

        const db = getDb();

        // Ensure user_settings record exists for this user
        const existingSettings = await db
          .select()
          .from(userSettings)
          .where(eq(userSettings.user_id, context.userId))
          .limit(1);

        if (existingSettings.length === 0) {
          // Create user_settings record if it doesn't exist
          await db.insert(userSettings).values({
            user_id: context.userId,
          });
        }

        // TODO: Handle resume upload to cloud storage
        // For now, store resume as-is (it's an Upload scalar)
        const resumeUrl = args.input.resume ? null : null;

        // Insert application into database
        const [newApplication] = await db
          .insert(applications)
          .values({
            user_id: context.userId,
            email: context.userEmail,
            job_id: args.input.jobId,
            resume_url: resumeUrl,
            questions: JSON.stringify(args.input.questions),
            status: "pending",
          })
          .returning();

        return {
          email: newApplication.email,
          jobId: newApplication.job_id,
          resume: newApplication.resume_url,
          questions: newApplication.questions
            ? JSON.parse(newApplication.questions)
            : [],
        };
      } catch (error) {
        console.error("Error creating application:", error);
        throw new Error("Failed to create application");
      }
    },
  },
};
