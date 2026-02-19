import type { GraphQLContext } from "../context";
import { applications } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";

function mapApplication(app: typeof applications.$inferSelect) {
  return {
    id: app.id,
    email: app.user_email,
    jobId: app.job_id,
    resume: app.resume_url,
    questions: app.questions ? JSON.parse(app.questions) : [],
    status: app.status,
    notes: (app as any).notes ?? null,
    jobTitle: (app as any).job_title ?? null,
    companyName: (app as any).company_name ?? null,
    createdAt: app.created_at,
  };
}

export const applicationResolvers = {
  Query: {
    async applications(_parent: any, _args: any, context: GraphQLContext) {
      try {
        if (!context.userEmail || !context.userId) {
          throw new Error("User must be authenticated to view applications");
        }

        const userApplications = await context.db
          .select()
          .from(applications)
          .where(eq(applications.user_email, context.userEmail))
          .orderBy(desc(applications.created_at));

        return userApplications.map(mapApplication);
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
          jobTitle?: string;
          companyName?: string;
        };
      },
      context: GraphQLContext,
    ) {
      try {
        if (!context.userEmail || !context.userId) {
          throw new Error(
            "User must be authenticated to submit an application",
          );
        }

        const [newApplication] = await context.db
          .insert(applications)
          .values({
            user_email: context.userEmail,
            job_id: args.input.jobId,
            resume_url: null,
            questions: JSON.stringify(args.input.questions),
            status: "pending",
            // @ts-expect-error new columns added via migration 0003
            job_title: args.input.jobTitle ?? null,
            // @ts-expect-error new columns added via migration 0003
            company_name: args.input.companyName ?? null,
          })
          .returning();

        return mapApplication(newApplication);
      } catch (error) {
        console.error("Error creating application:", error);
        throw new Error("Failed to create application");
      }
    },

    async updateApplication(
      _parent: any,
      args: {
        id: number;
        input: {
          status?: "pending" | "submitted" | "reviewed" | "rejected" | "accepted";
          notes?: string;
        };
      },
      context: GraphQLContext,
    ) {
      try {
        if (!context.userEmail || !context.userId) {
          throw new Error(
            "User must be authenticated to update an application",
          );
        }

        const updateValues: Record<string, unknown> = {
          updated_at: new Date().toISOString(),
        };

        if (args.input.status !== undefined) {
          updateValues.status = args.input.status;
        }
        if (args.input.notes !== undefined) {
          updateValues.notes = args.input.notes;
        }

        const [updated] = await context.db
          .update(applications)
          .set(updateValues as any)
          .where(
            and(
              eq(applications.id, args.id),
              eq(applications.user_email, context.userEmail),
            ),
          )
          .returning();

        if (!updated) {
          throw new Error("Application not found or access denied");
        }

        return mapApplication(updated);
      } catch (error) {
        console.error("Error updating application:", error);
        throw new Error("Failed to update application");
      }
    },
  },
};
