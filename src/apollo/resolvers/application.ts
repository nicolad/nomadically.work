import type { GraphQLContext } from "../context";
import { applications, applicationTracks, jobs } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { mockTracks } from "./track";
import { createDeepSeekClient, DEEPSEEK_MODELS } from "@/deepseek";

function mapApplication(
  app: typeof applications.$inferSelect,
  jobDescription?: string | null,
) {
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
    jobDescription: jobDescription ?? null,
    createdAt: app.created_at,
    aiInterviewPrep: app.ai_interview_prep
      ? (() => {
          try { return JSON.parse(app.ai_interview_prep); }
          catch { return null; }
        })()
      : null,
  };
}

async function getApplicationById(id: number, userEmail: string, db: GraphQLContext["db"]) {
  const [row] = await db
    .select({
      app: applications,
      jobDescription: jobs.description,
    })
    .from(applications)
    .leftJoin(jobs, eq(jobs.url, applications.job_id))
    .where(and(eq(applications.id, id), eq(applications.user_email, userEmail)));
  if (!row) return null;
  return mapApplication(row.app, row.jobDescription);
}

export const applicationResolvers = {
  Application: {
    async interviewPrep(parent: { id: number }, _args: unknown, context: GraphQLContext) {
      const rows = await context.db
        .select()
        .from(applicationTracks)
        .where(eq(applicationTracks.application_id, parent.id));

      return rows
        .map((row) => mockTracks.find((t) => t.slug === row.track_slug))
        .filter(Boolean);
    },
  },
  Query: {
    async applications(_parent: any, _args: any, context: GraphQLContext) {
      try {
        if (!context.userEmail || !context.userId) {
          throw new Error("User must be authenticated to view applications");
        }

        const userApplications = await context.db
          .select({
            app: applications,
            jobDescription: jobs.description,
          })
          .from(applications)
          .leftJoin(jobs, eq(jobs.url, applications.job_id))
          .where(eq(applications.user_email, context.userEmail))
          .orderBy(desc(applications.created_at));

        return userApplications.map(({ app, jobDescription }) =>
          mapApplication(app, jobDescription),
        );
      } catch (error) {
        console.error("Error fetching applications:", error);
        throw new Error("Failed to fetch applications");
      }
    },

    async application(_parent: any, args: { id: number }, context: GraphQLContext) {
      if (!context.userEmail || !context.userId) {
        throw new Error("User must be authenticated to view an application");
      }

      const [row] = await context.db
        .select({
          app: applications,
          jobDescription: jobs.description,
        })
        .from(applications)
        .leftJoin(jobs, eq(jobs.url, applications.job_id))
        .where(
          and(
            eq(applications.id, args.id),
            eq(applications.user_email, context.userEmail),
          ),
        );

      if (!row) return null;
      return mapApplication(row.app, row.jobDescription);
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

    async linkTrackToApplication(
      _parent: unknown,
      args: { applicationId: number; trackSlug: string },
      context: GraphQLContext,
    ) {
      if (!context.userEmail || !context.userId) {
        throw new Error("User must be authenticated");
      }

      // Verify ownership before write
      const app = await getApplicationById(args.applicationId, context.userEmail, context.db);
      if (!app) throw new Error("Application not found or access denied");

      const track = mockTracks.find((t) => t.slug === args.trackSlug);
      if (!track) {
        throw new Error("Track not found");
      }

      await context.db
        .insert(applicationTracks)
        .values({
          application_id: args.applicationId,
          track_slug: args.trackSlug,
        })
        .onConflictDoNothing();

      return app;
    },

    async unlinkTrackFromApplication(
      _parent: unknown,
      args: { applicationId: number; trackSlug: string },
      context: GraphQLContext,
    ) {
      if (!context.userEmail || !context.userId) {
        throw new Error("User must be authenticated");
      }

      // Verify ownership before write
      const app = await getApplicationById(args.applicationId, context.userEmail, context.db);
      if (!app) throw new Error("Application not found or access denied");

      await context.db
        .delete(applicationTracks)
        .where(
          and(
            eq(applicationTracks.application_id, args.applicationId),
            eq(applicationTracks.track_slug, args.trackSlug),
          ),
        );

      return app;
    },

    async generateInterviewPrep(
      _parent: any,
      args: { applicationId: number },
      context: GraphQLContext,
    ) {
      if (!context.userEmail || !context.userId) {
        throw new Error("User must be authenticated");
      }

      // Fetch application + jobDescription in one query.
      // Can't reuse getApplicationById() here because that helper doesn't return jobDescription.
      const [row] = await context.db
        .select({ app: applications, jobDescription: jobs.description })
        .from(applications)
        .leftJoin(jobs, eq(jobs.url, applications.job_id))
        .where(
          and(
            eq(applications.id, args.applicationId),
            eq(applications.user_email, context.userEmail),
          ),
        );

      if (!row) throw new Error("Application not found or access denied");
      if (!row.jobDescription) {
        throw new Error("No job description available for this application");
      }

      // Strip HTML tags and truncate to ~8000 chars to stay within model context
      const plainText = row.jobDescription
        .replace(/(<([^>]+)>)/gi, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 8000);

      // Call DeepSeek with structured JSON prompt
      const client = createDeepSeekClient();
      const response = await client.chat({
        model: DEEPSEEK_MODELS.CHAT,
        messages: [
          {
            role: "system",
            content: `You are an expert interview coach. Analyze the job description and return ONLY a JSON object with this exact shape:
{
  "summary": "2-3 sentence overview of the role and what to focus on for the interview",
  "requirements": [
    {
      "requirement": "Requirement name (e.g. React expertise)",
      "questions": ["Tailored interview question 1", "Tailored interview question 2"],
      "studyTopics": ["Study topic 1", "Study topic 2"],
      "sourceQuote": "at most 20 words copied verbatim from the job description that most directly triggered this requirement"
    }
  ]
}
Extract 4-6 key requirements from the job description. For each: 2-3 tailored interview questions specific to the role, and 2-3 concrete study topics. For sourceQuote: copy at most 20 words verbatim from the job description that most directly triggered this requirement.`,
          },
          {
            role: "user",
            content: `Job description:\n\n${plainText}`,
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.1,
        max_tokens: 2000,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) throw new Error("Empty response from AI");

      let parsed: any;
      try {
        parsed = JSON.parse(content);
      } catch {
        throw new Error("Failed to parse AI response as JSON");
      }

      // Validate required structure before persisting
      if (
        typeof parsed.summary !== "string" ||
        !Array.isArray(parsed.requirements) ||
        parsed.requirements.length === 0
      ) {
        throw new Error("AI returned an unexpected response structure");
      }

      // Enforce sourceQuote word limit in case the model overshoots
      for (const req of parsed.requirements) {
        if (typeof req.sourceQuote === "string") {
          const words = req.sourceQuote.trim().split(/\s+/);
          if (words.length > 20) {
            req.sourceQuote = words.slice(0, 20).join(" ") + "…";
          }
        }
      }

      parsed.generatedAt = new Date().toISOString();

      // Persist to DB (include updated_at for consistency with other mutations)
      const [updated] = await context.db
        .update(applications)
        .set({
          ai_interview_prep: JSON.stringify(parsed),
          updated_at: new Date().toISOString(),
        } as any)
        .where(
          and(
            eq(applications.id, args.applicationId),
            eq(applications.user_email, context.userEmail),
          ),
        )
        .returning();

      if (!updated) throw new Error("Failed to save interview prep");

      return mapApplication(updated, row.jobDescription);
    },
  },
};
