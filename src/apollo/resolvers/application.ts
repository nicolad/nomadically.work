import type { GraphQLContext } from "../context";
import { applications, applicationTracks, jobs, companies } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { mockTracks } from "./track";
import { createDeepSeekClient, DEEPSEEK_MODELS } from "@/deepseek";

function mapApplication(
  app: typeof applications.$inferSelect,
  jobDescription?: string | null,
  companyKey?: string | null,
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
    companyKey: companyKey ?? null,
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
      companyKey: companies.key,
    })
    .from(applications)
    .leftJoin(jobs, eq(jobs.url, applications.job_id))
    .leftJoin(companies, eq(companies.id, jobs.company_id))
    .where(and(eq(applications.id, id), eq(applications.user_email, userEmail)));
  if (!row) return null;
  return mapApplication(row.app, row.jobDescription, row.companyKey);
}

export const applicationResolvers = {
  AIInterviewPrepRequirement: {
    studyTopicDeepDives(parent: any) {
      return parent.studyTopicDeepDives ?? [];
    },
  },
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
        const query = context.db
          .select({
            app: applications,
            jobDescription: jobs.description,
            companyKey: companies.key,
          })
          .from(applications)
          .leftJoin(jobs, eq(jobs.url, applications.job_id))
          .leftJoin(companies, eq(companies.id, jobs.company_id))
          .orderBy(desc(applications.created_at));

        const userApplications = context.userEmail
          ? await query.where(eq(applications.user_email, context.userEmail))
          : await query;

        return userApplications.map(({ app, jobDescription, companyKey }) =>
          mapApplication(app, jobDescription, companyKey),
        );
      } catch (error) {
        console.error("Error fetching applications:", error);
        throw new Error("Failed to fetch applications");
      }
    },

    async application(_parent: any, args: { id: number }, context: GraphQLContext) {
      const whereClause = context.userEmail
        ? and(eq(applications.id, args.id), eq(applications.user_email, context.userEmail))
        : eq(applications.id, args.id);

      const [row] = await context.db
        .select({
          app: applications,
          jobDescription: jobs.description,
          companyKey: companies.key,
        })
        .from(applications)
        .leftJoin(jobs, eq(jobs.url, applications.job_id))
        .leftJoin(companies, eq(companies.id, jobs.company_id))
        .where(whereClause);

      if (!row) return null;
      return mapApplication(row.app, row.jobDescription, row.companyKey);
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

    async generateTopicDeepDive(
      _parent: any,
      args: { applicationId: number; requirement: string; force?: boolean },
      context: GraphQLContext,
    ) {
      const whereClause = context.userEmail
        ? and(eq(applications.id, args.applicationId), eq(applications.user_email, context.userEmail))
        : eq(applications.id, args.applicationId);

      const [row] = await context.db
        .select({ app: applications, jobDescription: jobs.description })
        .from(applications)
        .leftJoin(jobs, eq(jobs.url, applications.job_id))
        .where(whereClause);

      if (!row) throw new Error("Application not found or access denied");

      // Parse existing prep data — we need the full requirement context
      let prepData: any;
      try {
        prepData = row.app.ai_interview_prep ? JSON.parse(row.app.ai_interview_prep) : null;
      } catch {
        throw new Error("Could not parse existing interview prep data");
      }
      if (!prepData) throw new Error("No interview prep data found. Generate interview prep first.");

      const reqEntry = prepData.requirements?.find(
        (r: any) => r.requirement === args.requirement,
      );
      if (!reqEntry) throw new Error("Requirement not found in interview prep data");

      // Return immediately if already generated (unless force regeneration requested)
      if (reqEntry.deepDive && !args.force) return mapApplication(row.app, row.jobDescription);

      const plainJobDesc = (row.jobDescription ?? "")
        .replace(/(<([^>]+)>)/gi, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 4000);

      const client = createDeepSeekClient();
      const response = await client.chat({
        model: DEEPSEEK_MODELS.REASONER,
        messages: [
          {
            role: "user",
            content: `You are a senior staff engineer and technical interview coach. The candidate is preparing for a technical interview at ${(row.app as any).company_name ?? "a tech company"} for the role of ${(row.app as any).job_title ?? "software engineer"}.

Job description context:
${plainJobDesc}

Topic to master: "${args.requirement}"

Related interview questions:
${reqEntry.questions?.map((q: string) => `- ${q}`).join("\n")}

Study areas identified:
${reqEntry.studyTopics?.map((t: string) => `- ${t}`).join("\n")}

Write a deep, technically rigorous preparation guide in markdown. This is for a senior engineer — avoid surface-level definitions. Every section must contain concrete, specific technical content.

Structure your response exactly as follows:

## Why This Matters for This Role
Explain specifically why this topic is critical for this company and role. Reference the job description context. Be concrete about the technical decisions the candidate will face on the job.

## Core Technical Concepts
For each concept, go beyond the definition. Explain the mechanism, the trade-offs, and when each applies. Use concrete named systems as examples (e.g. PostgreSQL, Cassandra, Redis, Kafka, DynamoDB). Where relevant, include a trade-off comparison table.

## How to Answer in the Interview
Provide a structured framework for answering questions on this topic. Don't use generic STAR framing for technical topics — instead give a technical reasoning pattern: state your assumptions, name the constraints, explain the trade-offs, give a concrete recommendation with justification.

## Battle-Tested Examples
2-3 real-world scenarios where this topic caused a production incident or shaped a major architectural decision. Describe what went wrong (or right), why, and what the candidate can learn from it.

## What Separates Senior Answers
Exactly what a senior engineer says that a mid-level engineer misses. Be specific — quote the kind of phrasing, the specific trade-offs named, or the edge cases mentioned.

## Common Mistakes to Avoid
What weak or under-prepared candidates get wrong. Be blunt and specific.

## Targeted Study Plan
3-5 specific things to review before the interview (concepts, papers, system internals — not generic URLs). Prioritized by impact.`,
          },
        ],
        max_tokens: 4000,
      });

      const deepDive = response.choices[0]?.message?.content;
      if (!deepDive) throw new Error("Empty response from AI");

      // Store deep dive back into the JSON blob for the matching requirement
      reqEntry.deepDive = deepDive;

      const [updated] = await context.db
        .update(applications)
        .set({
          ai_interview_prep: JSON.stringify(prepData),
          updated_at: new Date().toISOString(),
        } as any)
        .where(whereClause)
        .returning();

      if (!updated) throw new Error("Failed to save deep dive");

      return mapApplication(updated, row.jobDescription);
    },

    async generateInterviewPrep(
      _parent: any,
      args: { applicationId: number },
      context: GraphQLContext,
    ) {
      // Fetch application + jobDescription in one query.
      const whereClause = context.userEmail
        ? and(eq(applications.id, args.applicationId), eq(applications.user_email, context.userEmail))
        : eq(applications.id, args.applicationId);

      const [row] = await context.db
        .select({ app: applications, jobDescription: jobs.description })
        .from(applications)
        .leftJoin(jobs, eq(jobs.url, applications.job_id))
        .where(whereClause);

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
          context.userEmail
            ? and(eq(applications.id, args.applicationId), eq(applications.user_email, context.userEmail))
            : eq(applications.id, args.applicationId),
        )
        .returning();

      if (!updated) throw new Error("Failed to save interview prep");

      return mapApplication(updated, row.jobDescription);
    },

    async generateStudyTopicDeepDive(
      _parent: any,
      args: { applicationId: number; requirement: string; studyTopic: string; force?: boolean },
      context: GraphQLContext,
    ) {
      const whereClause = context.userEmail
        ? and(eq(applications.id, args.applicationId), eq(applications.user_email, context.userEmail))
        : eq(applications.id, args.applicationId);

      const [row] = await context.db
        .select({ app: applications, jobDescription: jobs.description })
        .from(applications)
        .leftJoin(jobs, eq(jobs.url, applications.job_id))
        .where(whereClause);

      if (!row) throw new Error("Application not found or access denied");

      let prepData: any;
      try {
        prepData = row.app.ai_interview_prep ? JSON.parse(row.app.ai_interview_prep) : null;
      } catch {
        throw new Error("Could not parse existing interview prep data");
      }
      if (!prepData) throw new Error("No interview prep data found. Generate interview prep first.");

      const reqEntry = prepData.requirements?.find(
        (r: any) => r.requirement === args.requirement,
      );
      if (!reqEntry) throw new Error("Requirement not found in interview prep data");

      reqEntry.studyTopicDeepDives = reqEntry.studyTopicDeepDives ?? [];
      const existing = reqEntry.studyTopicDeepDives.find((d: any) => d.topic === args.studyTopic);
      if (existing?.deepDive && !args.force) return mapApplication(row.app, row.jobDescription);

      const plainJobDesc = (row.jobDescription ?? "")
        .replace(/(<([^>]+)>)/gi, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 4000);

      const client = createDeepSeekClient();
      const response = await client.chat({
        model: DEEPSEEK_MODELS.REASONER,
        messages: [
          {
            role: "user",
            content: `You are a senior staff engineer and technical interview coach. The candidate is preparing for a technical interview at ${(row.app as any).company_name ?? "a tech company"} for the role of ${(row.app as any).job_title ?? "software engineer"}.

Job description context:
${plainJobDesc}

Parent topic: "${args.requirement}"
Focused subtopic: "${args.studyTopic}"

Write a technically rigorous, focused deep-dive on "${args.studyTopic}" in markdown. This is for a senior engineer — go beyond definitions into mechanisms, trade-offs, and concrete examples.

## What It Actually Is
The precise technical definition and mechanism. No hand-waving. Include how it works internally where relevant.

## When It Matters (and When It Doesn't)
Concrete scenarios where this concept is load-bearing. Name real systems (PostgreSQL, Cassandra, Redis, Kafka, etc.) and explain how they handle this. Include a trade-off table if applicable.

## How to Talk About It in an Interview
The exact reasoning pattern a senior engineer uses: state your constraints, name the trade-offs, give a concrete recommendation with justification. Show, don't tell.

## The Trap Answers
What mid-level engineers say that reveals shallow understanding. Be blunt.

## One Concrete Example
A real production scenario (incident, design decision, or architectural choice) where this subtopic was the crux. What happened, why, and what to learn from it.`,
          },
        ],
        max_tokens: 2500,
      });

      const deepDive = response.choices[0]?.message?.content;
      if (!deepDive) throw new Error("Empty response from AI");

      if (existing) {
        existing.deepDive = deepDive;
      } else {
        reqEntry.studyTopicDeepDives.push({ topic: args.studyTopic, deepDive });
      }

      const [updated] = await context.db
        .update(applications)
        .set({
          ai_interview_prep: JSON.stringify(prepData),
          updated_at: new Date().toISOString(),
        } as any)
        .where(whereClause)
        .returning();

      if (!updated) throw new Error("Failed to save study topic deep dive");

      return mapApplication(updated, row.jobDescription);
    },
  },
};
