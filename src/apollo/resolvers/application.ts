import type { GraphQLContext } from "../context";
import { applications, applicationTracks, jobs, companies } from "@/db/schema";
import { eq, desc, and, sql } from "drizzle-orm";
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
    notes: app.notes ?? null,
    jobTitle: app.job_title ?? null,
    companyName: app.company_name ?? null,
    companyKey: companyKey ?? null,
    jobDescription: app.job_description ?? jobDescription ?? null,
    createdAt: app.created_at,
    aiInterviewPrep: app.ai_interview_prep
      ? (() => {
          try { return JSON.parse(app.ai_interview_prep); }
          catch { return null; }
        })()
      : null,
    aiInterviewQuestions: app.ai_interview_questions
      ? (() => {
          try {
            const parsed = JSON.parse(app.ai_interview_questions);
            return {
              ...parsed,
              recruiterQuestions: parsed.recruiterQuestions ?? [],
              technicalQuestions: parsed.technicalQuestions ?? [],
            };
          }
          catch { return null; }
        })()
      : null,
    agenticCoding: app.ai_agentic_coding
      ? (() => {
          try { return JSON.parse(app.ai_agentic_coding); }
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
      jobCompanyKey: jobs.company_key,
      nameCompanyKey: companies.key,
    })
    .from(applications)
    .leftJoin(jobs, eq(jobs.url, applications.job_id))
    .leftJoin(companies, sql`lower(${companies.key}) = lower(${applications.company_name}) OR lower(${companies.name}) = lower(${applications.company_name})`)
    .where(and(eq(applications.id, id), eq(applications.user_email, userEmail)));
  if (!row) return null;
  return mapApplication(row.app, row.jobDescription, row.jobCompanyKey ?? row.nameCompanyKey);
}

export const applicationResolvers = {
  AIInterviewPrepRequirement: {
    studyTopicDeepDives(parent: any) {
      return parent.studyTopicDeepDives ?? [];
    },
  },
  Application: {
    async interviewPrep(parent: { id: number }, _args: unknown, context: GraphQLContext) {
      const rows = await context.loaders.applicationTracks.load(parent.id);

      return rows
        .map((row) => mockTracks.find((t) => t.slug === row.track_slug))
        .filter(Boolean);
    },
  },
  Query: {
    async applications(_parent: any, _args: any, context: GraphQLContext) {
      if (!context.userEmail) {
        throw new Error("Unauthorized");
      }

      try {
        const userApplications = await context.db
          .select({
            app: applications,
            jobDescription: jobs.description,
            jobCompanyKey: jobs.company_key,
            nameCompanyKey: companies.key,
          })
          .from(applications)
          .leftJoin(jobs, eq(jobs.url, applications.job_id))
          .leftJoin(companies, sql`lower(${companies.key}) = lower(${applications.company_name}) OR lower(${companies.name}) = lower(${applications.company_name})`)
          .where(eq(applications.user_email, context.userEmail))
          .orderBy(desc(applications.created_at));

        return userApplications.map(({ app, jobDescription, jobCompanyKey, nameCompanyKey }) =>
          mapApplication(app, jobDescription, jobCompanyKey ?? nameCompanyKey),
        );
      } catch (error) {
        console.error("Error fetching applications:", error);
        throw new Error("Failed to fetch applications");
      }
    },

    async application(_parent: any, args: { id: number }, context: GraphQLContext) {
      if (!context.userEmail) {
        throw new Error("Unauthorized");
      }

      const [row] = await context.db
        .select({
          app: applications,
          jobDescription: jobs.description,
          jobCompanyKey: jobs.company_key,
          nameCompanyKey: companies.key,
        })
        .from(applications)
        .leftJoin(jobs, eq(jobs.url, applications.job_id))
        .leftJoin(companies, sql`lower(${companies.key}) = lower(${applications.company_name}) OR lower(${companies.name}) = lower(${applications.company_name})`)
        .where(and(eq(applications.id, args.id), eq(applications.user_email, context.userEmail)));

      if (!row) return null;
      return mapApplication(row.app, row.jobDescription, row.jobCompanyKey ?? row.nameCompanyKey);
    },
  },
  Mutation: {
    async createApplication(
      _parent: any,
      args: {
        input: {
          jobId?: string | null;
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
            job_id: args.input.jobId ?? null,
            resume_url: null,
            questions: JSON.stringify(args.input.questions),
            status: "pending",
            job_title: args.input.jobTitle ?? null,
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
          jobDescription?: string;
          companyName?: string;
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

        const updateValues: Partial<typeof applications.$inferInsert> = {
          updated_at: new Date().toISOString(),
        };

        if (args.input.status !== undefined) {
          updateValues.status = args.input.status;
        }
        if (args.input.notes !== undefined) {
          updateValues.notes = args.input.notes;
        }
        if (args.input.jobDescription !== undefined) {
          updateValues.job_description = args.input.jobDescription;
        }
        if (args.input.companyName !== undefined) {
          updateValues.company_name = args.input.companyName;
        }

        const [updated] = await context.db
          .update(applications)
          .set(updateValues)
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

        // Re-fetch with JOINs so companyKey resolves correctly
        const result = await getApplicationById(updated.id, context.userEmail!, context.db);
        return result ?? mapApplication(updated);
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
      const effectiveJobDescriptionForTopic = row.app.job_description ?? row.jobDescription ?? null;
      if (reqEntry.deepDive && !args.force) return mapApplication(row.app, effectiveJobDescriptionForTopic);

      const plainJobDesc = (effectiveJobDescriptionForTopic ?? "")
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
            content: `You are a senior staff engineer and technical interview coach. The candidate is preparing for a technical interview at ${row.app.company_name ?? "a tech company"} for the role of ${row.app.job_title ?? "software engineer"}.

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
        })
        .where(whereClause)
        .returning();

      if (!updated) throw new Error("Failed to save deep dive");

      return mapApplication(updated, effectiveJobDescriptionForTopic);
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

      // Prefer the user-supplied job_description on the application row; fall back to the
      // denormalized description from the jobs table (populated via the leftJoin above).
      const effectiveJobDescription = row.app.job_description ?? row.jobDescription ?? null;

      if (!effectiveJobDescription) {
        throw new Error("No job description available for this application");
      }

      // Strip HTML tags and truncate to ~8000 chars to stay within model context
      const plainText = effectiveJobDescription
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
        })
        .where(
          context.userEmail
            ? and(eq(applications.id, args.applicationId), eq(applications.user_email, context.userEmail))
            : eq(applications.id, args.applicationId),
        )
        .returning();

      if (!updated) throw new Error("Failed to save interview prep");

      return mapApplication(updated, effectiveJobDescription);
    },

    async generateRequirementFromSelection(
      _parent: any,
      args: { applicationId: number; selectedText: string },
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

      const effectiveJobDescription = row.app.job_description ?? row.jobDescription ?? null;

      const client = createDeepSeekClient();
      const response = await client.chat({
        model: DEEPSEEK_MODELS.CHAT,
        messages: [
          {
            role: "system",
            content: `You are an expert interview coach. Given a selection from a job description, generate a single interview prep requirement. Return ONLY a JSON object:
{
  "requirement": "Requirement name (4-8 words)",
  "questions": ["Tailored interview question 1", "Tailored interview question 2"],
  "studyTopics": ["Study topic 1", "Study topic 2"]
}`,
          },
          {
            role: "user",
            content: `Job: ${row.app.job_title ?? "Software Engineer"} at ${row.app.company_name ?? "a tech company"}\n\nSelected text: "${args.selectedText}"`,
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.1,
        max_tokens: 500,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) throw new Error("Empty response from AI");

      let newReq: any;
      try {
        newReq = JSON.parse(content);
      } catch {
        throw new Error("Failed to parse AI response");
      }

      newReq.sourceQuote = args.selectedText.trim().split(/\s+/).slice(0, 20).join(" ");
      newReq.studyTopicDeepDives = [];

      prepData.requirements = [...(prepData.requirements ?? []), newReq];

      const [updated] = await context.db
        .update(applications)
        .set({ ai_interview_prep: JSON.stringify(prepData), updated_at: new Date().toISOString() })
        .where(whereClause)
        .returning();

      if (!updated) throw new Error("Failed to save requirement");
      return mapApplication(updated, effectiveJobDescription);
    },

    async linkSelectionToRequirement(
      _parent: any,
      args: { applicationId: number; requirement: string; sourceQuote: string },
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
      if (!prepData) throw new Error("No interview prep data found.");

      const reqEntry = prepData.requirements?.find((r: any) => r.requirement === args.requirement);
      if (!reqEntry) throw new Error("Requirement not found");

      reqEntry.sourceQuote = args.sourceQuote.trim().split(/\s+/).slice(0, 20).join(" ");

      const effectiveJobDescription = row.app.job_description ?? row.jobDescription ?? null;
      const [updated] = await context.db
        .update(applications)
        .set({ ai_interview_prep: JSON.stringify(prepData), updated_at: new Date().toISOString() })
        .where(whereClause)
        .returning();

      if (!updated) throw new Error("Failed to save");
      return mapApplication(updated, effectiveJobDescription);
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
      // Prefer the user-supplied job_description on the application row; fall back to the jobs table value.
      const effectiveJobDescriptionForStudyTopic = row.app.job_description ?? row.jobDescription ?? null;
      if (existing?.deepDive && !args.force) return mapApplication(row.app, effectiveJobDescriptionForStudyTopic);

      const plainJobDesc = (effectiveJobDescriptionForStudyTopic ?? "")
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
            content: `You are a senior staff engineer and technical interview coach. The candidate is preparing for a technical interview at ${row.app.company_name ?? "a tech company"} for the role of ${row.app.job_title ?? "software engineer"}.

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
        })
        .where(whereClause)
        .returning();

      if (!updated) throw new Error("Failed to save study topic deep dive");

      return mapApplication(updated, effectiveJobDescriptionForStudyTopic);
    },

    async generateInterviewQuestions(
      _parent: any,
      args: { applicationId: number; type: string },
      context: GraphQLContext,
    ) {
      if (args.type !== "recruiter" && args.type !== "technical") {
        throw new Error('Invalid type. Must be "recruiter" or "technical".');
      }

      const whereClause = context.userEmail
        ? and(eq(applications.id, args.applicationId), eq(applications.user_email, context.userEmail))
        : eq(applications.id, args.applicationId);

      // Fetch application + job description + company website
      const [row] = await context.db
        .select({
          app: applications,
          jobDescription: jobs.description,
          companyWebsite: companies.website,
        })
        .from(applications)
        .leftJoin(jobs, eq(jobs.url, applications.job_id))
        .leftJoin(companies, sql`lower(${companies.key}) = lower(${applications.company_name}) OR lower(${companies.name}) = lower(${applications.company_name})`)
        .where(whereClause);

      if (!row) throw new Error("Application not found or access denied");

      const effectiveJobDescription = row.app.job_description ?? row.jobDescription ?? null;
      if (!effectiveJobDescription) {
        throw new Error("No job description available for this application");
      }

      const plainJobDesc = effectiveJobDescription
        .replace(/(<([^>]+)>)/gi, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 8000);

      const companyWebsite = row.companyWebsite ?? null;
      const companyName = row.app.company_name ?? "the company";
      const jobTitle = row.app.job_title ?? "software engineer";

      // Fetch company website content if available
      let companyContext = "";
      if (companyWebsite) {
        try {
          const res = await fetch(companyWebsite, {
            headers: { "User-Agent": "Mozilla/5.0 (compatible; InterviewPrepBot/1.0)" },
            signal: AbortSignal.timeout(10000),
          });
          if (res.ok) {
            const html = await res.text();
            // Strip HTML to plain text, take first 6000 chars
            companyContext = html
              .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
              .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
              .replace(/<[^>]+>/g, " ")
              .replace(/\s+/g, " ")
              .trim()
              .slice(0, 6000);
          }
        } catch {
          // Ignore fetch errors — we'll proceed without company context
        }
      }

      const companySection = companyContext
        ? `## Company Website Content\nHere is content from the company's website (${companyWebsite}):\n${companyContext}\n`
        : `## Company\n${companyName} (no website content available)\n`;

      let prompt: string;
      if (args.type === "recruiter") {
        prompt = `I'm a software developer preparing for a recruiter/HR screening call for the role of "${jobTitle}" at ${companyName}.

${companySection}

## Job Description
${plainJobDesc}

## CRITICAL INSTRUCTIONS
Every single question MUST directly reference something specific from either the company website content or the job description above. Do NOT generate generic questions like "What's the team size?" or "What's the culture like?" — instead reference SPECIFIC things:
- If the JD mentions a technology (e.g., "Kubernetes", "RAG", "HIPAA"), ask about THAT technology's role at the company
- If the company website mentions a product, mission, or value, reference IT by name
- If the JD is vague about something specific (e.g., says "competitive salary" but no range, or "remote" without details), probe THAT gap
- If the company describes itself a certain way on their website, ask how that manifests in daily work

## Task
Generate exactly 10 questions I should ask the recruiter. Each question must contain a SPECIFIC reference to something from the company website or job description — quote or paraphrase the exact detail you're referencing.

Topics to cover (but always grounded in specific details from above):
- How specific technologies/tools mentioned in the JD are actually used day-to-day
- What specific products/features mentioned on the website the team works on
- Gaps or vague claims in the JD that need clarification
- How the specific responsibilities listed translate to actual weekly work
- The team building the specific systems described in the JD
- How the company's stated mission/values (from website) show up in engineering decisions

For each question:
1. Write the exact question — it MUST name a specific technology, product, responsibility, or claim from the JD or website
2. Explain what specific part of the JD or website triggered this question, and what red/green flags to listen for
3. Categorize it (e.g., "Culture", "Growth", "Team Structure", "Remote Work", "Process", "Role Clarity", "Compensation", "Red Flags", "Leadership", "Challenges")

Return ONLY a JSON object:
{
  "companyContext": "2-3 sentence summary of what the company does, referencing specific products/services from their website",
  "questions": [
    { "question": "...", "reason": "...", "category": "..." }
  ]
}`;
      } else {
        prompt = `I'm preparing for a technical interview for the role of "${jobTitle}" at ${companyName}.

${companySection}

## Job Description
${plainJobDesc}

## CRITICAL INSTRUCTIONS
Every single question MUST be directly derived from something specific in the job description or company website above. Do NOT generate generic system design or coding questions. Instead:
- If the JD mentions "RAG" — ask a question specifically about RAG architecture decisions at THIS company
- If the JD mentions "Kubernetes/EKS" — ask about THEIR container orchestration challenges
- If the company website describes their product — ask how the candidate would design/improve THAT specific system
- If the JD lists specific responsibilities — turn THOSE into technical deep-dive questions
- If the company operates in a specific domain (healthcare, fintech, etc.) — ask domain-specific technical questions

## Task
Generate exactly 10 deep technical interview questions. Each question must contain a SPECIFIC reference to a technology, system, responsibility, or domain detail from the JD or company website.

For each question:
1. Write the technical question — it MUST reference specific technologies, systems, or domain concepts mentioned in the JD or website (e.g., "How would you design the model gateway for multi-provider routing that Optura needs for their AI orchestration platform?")
2. Quote or reference the specific JD/website detail that makes this question relevant, and explain what technical signal the interviewer is looking for
3. Categorize it (e.g., "System Design", "Coding", "Architecture", "Performance", "Testing", "DevOps", "Domain Knowledge", "Technical Leadership")

Return ONLY a JSON object:
{
  "companyContext": "2-3 sentence summary of the company's technical challenges, referencing specific systems from their website/JD",
  "questions": [
    { "question": "...", "reason": "...", "category": "..." }
  ]
}`;
      }

      const client = createDeepSeekClient();
      const response = await client.chat({
        model: DEEPSEEK_MODELS.REASONER,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        max_tokens: 6000,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) throw new Error("Empty response from AI");

      // DeepSeek Reasoner might wrap response in markdown code fences
      const jsonStr = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

      let parsed: any;
      try {
        parsed = JSON.parse(jsonStr);
      } catch {
        throw new Error("Failed to parse AI response as JSON");
      }

      if (!Array.isArray(parsed.questions) || parsed.questions.length === 0) {
        throw new Error("AI returned an unexpected response structure");
      }

      // Load existing data and merge based on type
      let existingData: any = {};
      if (row.app.ai_interview_questions) {
        try { existingData = JSON.parse(row.app.ai_interview_questions); } catch {}
      }

      if (args.type === "recruiter") {
        existingData.recruiterQuestions = parsed.questions;
        existingData.recruiterGeneratedAt = new Date().toISOString();
      } else {
        existingData.technicalQuestions = parsed.questions;
        existingData.technicalGeneratedAt = new Date().toISOString();
      }
      existingData.companyContext = parsed.companyContext;

      // Ensure the other array exists
      if (!existingData.recruiterQuestions) existingData.recruiterQuestions = [];
      if (!existingData.technicalQuestions) existingData.technicalQuestions = [];

      const [updated] = await context.db
        .update(applications)
        .set({
          ai_interview_questions: JSON.stringify(existingData),
          updated_at: new Date().toISOString(),
        })
        .where(whereClause)
        .returning();

      if (!updated) throw new Error("Failed to save interview questions");

      return mapApplication(updated, effectiveJobDescription);
    },

    async generateAgenticCoding(
      _parent: any,
      args: { applicationId: number },
      context: GraphQLContext,
    ) {
      if (!context.userId || !context.userEmail) {
        throw new Error("Unauthorized");
      }

      const whereClause = and(
        eq(applications.id, args.applicationId),
        eq(applications.user_email, context.userEmail),
      );

      const [row] = await context.db
        .select({
          app: applications,
          jobDescription: jobs.description,
          companyWebsite: companies.website,
        })
        .from(applications)
        .leftJoin(jobs, eq(jobs.url, applications.job_id))
        .leftJoin(companies, sql`lower(${companies.key}) = lower(${applications.company_name}) OR lower(${companies.name}) = lower(${applications.company_name})`)
        .where(whereClause);

      if (!row) throw new Error("Application not found or access denied");

      const effectiveJobDescription = row.app.job_description ?? row.jobDescription ?? null;
      if (!effectiveJobDescription) {
        throw new Error("No job description available for this application");
      }

      const plainJobDesc = effectiveJobDescription
        .replace(/(<([^>]+)>)/gi, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 8000);

      const jobTitle = row.app.job_title ?? "software engineer";
      const companyName = row.app.company_name ?? "the company";

      const ctx = `Role: ${jobTitle} at ${companyName}\n\nJob Description:\n${plainJobDesc}`;

      const client = createDeepSeekClient();

      function dsCall(userPrompt: string, maxTokens = 2000): Promise<string> {
        return client.chat({
          model: DEEPSEEK_MODELS.REASONER,
          messages: [
            {
              role: "system",
              content: "You are a senior AI engineering coach. Return ONLY valid JSON — no markdown fences, no commentary.",
            },
            { role: "user", content: userPrompt },
          ],
          max_tokens: maxTokens,
        }).then((r) => {
          const text = r.choices[0]?.message?.content ?? "";
          return text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        });
      }

      function tryParse<T>(raw: string, fallback: T): T {
        try { return JSON.parse(raw) as T; }
        catch { return fallback; }
      }

      const [
        overviewResult,
        workflowResult,
        exercisesResult,
        promptTemplatesResult,
        qaResult,
        failureModesResult,
        teamResult,
        outcomesResult,
        resourcesResult,
      ] = await Promise.allSettled([

        // 1. Overview
        dsCall(`${ctx}\n\nWrite 4–5 paragraphs explaining HOW and WHERE agentic coding (Claude Code, Cursor, Copilot Workspace, Devin, etc.) changes the day-to-day work for this specific role. Reference the technologies and responsibilities from the JD directly. Explain which skills become MORE important in an agentic workflow (architecture thinking, prompt engineering, verification, code review). Be specific — not generic.\n\nReturn JSON: {"overview": "..."}`, 1500),

        // 2. Workflow pattern
        dsCall(`${ctx}\n\nDescribe a concrete, realistic 30-minute development session using AI agents for a task directly relevant to this role (pick a task from the JD, e.g. "scaffold a new API endpoint" or "add a feature to an existing service"). Walk through it step by step: what tool to open, what prompt to write, what to review, how to iterate, how to verify. Then write a short before/after comparison paragraph. Use markdown headers and bullet points for clarity.\n\nReturn JSON: {"workflowPattern": "..."}`, 1500),

        // 3. Exercises
        dsCall(`${ctx}\n\nCreate 4 agentic coding exercises directly derived from the technologies and responsibilities in this job description. For each exercise the agentPrompt must be a complete, multi-step prompt (150+ words) ready to paste into Claude Code or Cursor that covers: analyse the codebase → plan → implement → write tests → explain trade-offs.\n\nReturn JSON: {"exercises": [{"title":"...","description":"...","difficulty":"easy|medium|hard","skills":["..."],"hints":["...","..."],"agentPrompt":"..."}]}`, 3000),

        // 4. Prompt templates
        dsCall(`${ctx}\n\nCreate 4 prompt templates a developer in this exact role would use daily. Each template must be immediately usable — not generic. Tailor them to the specific stack and responsibilities in the JD (e.g. refactoring a component, generating a schema from a spec, debugging a framework-specific issue, writing integration tests). Each prompt field should be 80–150 words.\n\nReturn JSON: {"promptTemplates": [{"title":"...","purpose":"one sentence","stackContext":"which layer/situation","prompt":"..."}]}`, 2500),

        // 5. QA approach
        dsCall(`${ctx}\n\nDescribe how a senior engineer in this role would rigorously validate AI-generated code. Be specific to the JD's tech stack. Cover: static analysis tools and configs (exact ESLint plugins, TypeScript strict flags, etc.), test coverage thresholds and strategies, security scanning for hallucinated or outdated dependencies, and a code review checklist specifically for AI output (hallucinated APIs, stale patterns, subtle logic bugs, performance gotchas). Write 3 substantial paragraphs.\n\nReturn JSON: {"qaApproach": "..."}`, 1500),

        // 6. Failure modes
        dsCall(`${ctx}\n\nIdentify 4 concrete scenarios from this specific role's domain where using AI coding agents is the wrong approach. For each: name the scenario clearly, explain precisely why agents fail or are inappropriate, and give a concrete alternative. This demonstrates mature, senior-level judgment about AI tooling.\n\nReturn JSON: {"failureModes": [{"scenario":"...","why":"...","alternative":"..."}]}`, 1500),

        // 7. Team practices
        dsCall(`${ctx}\n\nWrite 3 paragraphs on how to roll out agentic coding practices across a team for this type of role — especially when mentoring junior developers. Cover: writing a .cursorrules or CLAUDE.md file with project-specific conventions (give concrete examples of rules for this stack), building a shared prompt library (what to include, how to version it), establishing code review processes for AI-generated code, and ensuring juniors learn fundamentals rather than becoming dependent on generated code.\n\nReturn JSON: {"teamPractices": "..."}`, 1500),

        // 8. Measurable outcomes
        dsCall(`${ctx}\n\nCreate 4 believable, anecdotal before/after impact examples for a developer in this specific role using AI coding agents. Each example should feel realistic and be directly tied to tasks mentioned in or implied by the JD. The improvement field should capture qualitative value beyond just time savings.\n\nReturn JSON: {"measurableOutcomes": [{"task":"...","beforeTime":"...","afterTime":"...","improvement":"..."}]}`, 1000),

        // 9. Resources
        dsCall(`${ctx}\n\nList 5 real, stable, well-known URLs for learning agentic coding practices relevant to this specific tech stack and role. Only include official documentation, major GitHub repos, or widely-cited guides — nothing obscure or likely to 404. For each give a clear title and one-sentence description of why it is useful for this role.\n\nReturn JSON: {"resources": [{"title":"...","url":"...","description":"..."}]}`, 800),
      ]);

      const overview = overviewResult.status === "fulfilled"
        ? (tryParse<any>(overviewResult.value, {}).overview ?? "")
        : "";
      if (!overview) throw new Error("Failed to generate overview — cannot proceed");

      const agenticData = {
        overview,
        workflowPattern: workflowResult.status === "fulfilled"
          ? (tryParse<any>(workflowResult.value, {}).workflowPattern ?? "") : "",
        exercises: exercisesResult.status === "fulfilled"
          ? (tryParse<any>(exercisesResult.value, { exercises: [] }).exercises ?? []) : [],
        promptTemplates: promptTemplatesResult.status === "fulfilled"
          ? (tryParse<any>(promptTemplatesResult.value, { promptTemplates: [] }).promptTemplates ?? []) : [],
        qaApproach: qaResult.status === "fulfilled"
          ? (tryParse<any>(qaResult.value, {}).qaApproach ?? "") : "",
        failureModes: failureModesResult.status === "fulfilled"
          ? (tryParse<any>(failureModesResult.value, { failureModes: [] }).failureModes ?? []) : [],
        teamPractices: teamResult.status === "fulfilled"
          ? (tryParse<any>(teamResult.value, {}).teamPractices ?? "") : "",
        measurableOutcomes: outcomesResult.status === "fulfilled"
          ? (tryParse<any>(outcomesResult.value, { measurableOutcomes: [] }).measurableOutcomes ?? []) : [],
        resources: resourcesResult.status === "fulfilled"
          ? (tryParse<any>(resourcesResult.value, { resources: [] }).resources ?? []) : [],
        generatedAt: new Date().toISOString(),
      };

      const [updated] = await context.db
        .update(applications)
        .set({
          ai_agentic_coding: JSON.stringify(agenticData),
          updated_at: new Date().toISOString(),
        })
        .where(whereClause)
        .returning();

      if (!updated) throw new Error("Failed to save agentic coding data");

      return mapApplication(updated, effectiveJobDescription);
    },

    async deleteApplication(_parent: any, args: { id: number }, context: GraphQLContext) {
      if (!context.userId || !context.userEmail) {
        throw new Error("Unauthorized");
      }
      const whereClause = and(
        eq(applications.id, args.id),
        eq(applications.user_email, context.userEmail),
      );
      const deleted = await context.db.delete(applications).where(whereClause).returning();
      if (deleted.length === 0) {
        return { success: false, message: "Application not found or access denied" };
      }
      return { success: true, message: "Application deleted" };
    },
  },
};
