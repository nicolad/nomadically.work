import { jobs } from "@/db/schema";
import type { Job } from "@/db/schema";
import { eq, like, sql } from "drizzle-orm";
import type { GraphQLContext } from "../../context";
import { isAdminEmail } from "@/lib/admin";
import { jobsQuery } from "./jobs-query";
import { enhanceJobFromATS } from "./enhance-job";
import { processAllJobs } from "./process-all-jobs";
import { JOB_STATUS } from "@/constants/job-status";
import type {
  JobResolvers,
  QueryResolvers,
  MutationResolvers,
} from "@/__generated__/resolvers-types";

async function dispatchToReporter(payload: {
  jobId: number;
  reportedBy: string;
  prevStatus: string;
}): Promise<void> {
  const url    = process.env.JOB_REPORTER_WORKER_URL;
  const secret = process.env.JOB_REPORTER_WORKER_SECRET;
  if (!url || !secret) return;
  try {
    await fetch(`${url}/api/report-job`, {
      method:  "POST",
      headers: { "Content-Type": "application/json", "X-Worker-Secret": secret },
      body:    JSON.stringify(payload),
      signal:  AbortSignal.timeout(3_000),
    });
  } catch (err) {
    console.error("[reporter] dispatch failed:", err);
  }
}

/** Map DB hyphenated status values to GraphQL enum values (underscored) */
const STATUS_TO_ENUM: Record<string, string> = {
  [JOB_STATUS.NEW]: "new",
  [JOB_STATUS.ENHANCED]: "enhanced",
  [JOB_STATUS.ROLE_MATCH]: "role_match",
  [JOB_STATUS.ROLE_NOMATCH]: "role_nomatch",
  [JOB_STATUS.EU_REMOTE]: "eu_remote",
  [JOB_STATUS.NON_EU]: "non_eu",
  [JOB_STATUS.ERROR]: "error",
  [JOB_STATUS.REPORTED]: "reported",
};

/**
 * Job field resolvers.
 *
 * ParentType is the raw Drizzle row (DB integers for booleans, JSON strings
 * for nested objects). Each resolver maps to the GraphQL scalar expected by
 * the generated `JobResolvers` type.
 */
const Job: JobResolvers<GraphQLContext, Job> = {
  // Map DB status (hyphenated) to GraphQL JobStatus enum (underscored)
  status(parent) {
    return (STATUS_TO_ENUM[parent.status ?? ""] ?? parent.status ?? null) as any;
  },
  // Read directly from DB column — the actual source of truth
  is_remote_eu(parent) {
    return (parent.is_remote_eu as unknown) === 1 || parent.is_remote_eu === true;
  },
  remote_eu_confidence(parent) {
    return parent.remote_eu_confidence ?? null;
  },
  remote_eu_reason(parent) {
    return parent.remote_eu_reason ?? null;
  },
  async skills(parent, _args, context) {
    try {
      return context.loaders.jobSkills.load(parent.id);
    } catch (error) {
      console.error("Error fetching job skills:", error);
      return [];
    }
  },
  async company(parent, _args, context) {
    try {
      if (!parent.company_id) {
        return null;
      }
      return context.loaders.company.load(parent.company_id);
    } catch (error) {
      console.error("Error fetching company:", error);
      return null;
    }
  },
  description(parent) {
    return parent.description;
  },
  absolute_url(parent) {
    return parent.absolute_url || null;
  },
  internal_job_id(parent) {
    return parent.internal_job_id?.toString() || null;
  },
  requisition_id(parent) {
    return parent.requisition_id || null;
  },
  company_name(parent) {
    return parent.company_name || null;
  },
  first_published(parent) {
    return parent.first_published || null;
  },
  language(parent) {
    return parent.language || null;
  },
  metadata(parent) {
    if (!parent.metadata) return [];
    try {
      const parsed = JSON.parse(parent.metadata);
      // Coerce non-string `value` fields to strings for GraphQL
      return parsed.map((m: any) => ({
        ...m,
        value: m.value == null ? null : typeof m.value === 'string' ? m.value : JSON.stringify(m.value),
      }));
    } catch {
      return [];
    }
  },
  departments(parent) {
    if (!parent.departments) return [];
    try {
      return JSON.parse(parent.departments);
    } catch {
      return [];
    }
  },
  offices(parent) {
    if (!parent.offices) return [];
    try {
      return JSON.parse(parent.offices);
    } catch {
      return [];
    }
  },
  questions(parent) {
    if (!parent.questions) return [];
    try {
      return JSON.parse(parent.questions);
    } catch {
      return [];
    }
  },
  location_questions(parent) {
    if (!parent.location_questions) return [];
    try {
      return JSON.parse(parent.location_questions);
    } catch {
      return [];
    }
  },
  compliance(parent) {
    if (!parent.compliance) return [];
    try {
      return JSON.parse(parent.compliance);
    } catch {
      return [];
    }
  },
  demographic_questions(parent) {
    if (!parent.demographic_questions) return null;
    try {
      const parsed = JSON.parse(parent.demographic_questions);
      if (Object.keys(parsed).length === 0) return null;
      return parsed;
    } catch {
      return null;
    }
  },
  data_compliance(parent) {
    if (!parent.data_compliance) return [];
    try {
      return JSON.parse(parent.data_compliance);
    } catch {
      return [];
    }
  },

  // Ashby ATS field resolvers - read from individual columns
  ashby_department(parent) {
    return parent.ashby_department || null;
  },
  ashby_team(parent) {
    return parent.ashby_team || null;
  },
  ashby_employment_type(parent) {
    return parent.ashby_employment_type || null;
  },
  ashby_is_remote(parent) {
    return parent.ashby_is_remote ?? null;
  },
  ashby_is_listed(parent) {
    return parent.ashby_is_listed ?? null;
  },
  ashby_published_at(parent) {
    return parent.ashby_published_at || null;
  },
  ashby_job_url(parent) {
    return parent.ashby_job_url || null;
  },
  ashby_apply_url(parent) {
    return parent.ashby_apply_url || null;
  },
  ashby_secondary_locations(parent) {
    if (!parent.ashby_secondary_locations) return [];
    try {
      return typeof parent.ashby_secondary_locations === "string"
        ? JSON.parse(parent.ashby_secondary_locations)
        : parent.ashby_secondary_locations;
    } catch {
      return [];
    }
  },
  ashby_compensation(parent) {
    if (!parent.ashby_compensation) return null;
    try {
      const parsed =
        typeof parent.ashby_compensation === "string"
          ? JSON.parse(parent.ashby_compensation)
          : parent.ashby_compensation;
      if (
        !parsed ||
        (!parsed.compensationTierSummary &&
          !parsed.scrapeableCompensationSalarySummary &&
          (!parsed.compensationTiers ||
            parsed.compensationTiers.length === 0) &&
          (!parsed.summaryComponents ||
            parsed.summaryComponents.length === 0))
      ) {
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  },
  ashby_address(parent) {
    if (!parent.ashby_address) return null;
    try {
      return typeof parent.ashby_address === "string"
        ? JSON.parse(parent.ashby_address)
        : parent.ashby_address;
    } catch {
      return null;
    }
  },

  async skillMatch(parent, _args, context) {
    if (!context.userId) return null;

    const settings = await context.loaders.userSettings.load(context.userId);

    if (!settings?.preferred_skills) return null;
    const preferredSkills: string[] = JSON.parse(settings.preferred_skills);
    if (!preferredSkills.length) return null;

    const jobSkills = await context.loaders.jobSkills.load(parent.id);

    if (!jobSkills.length) return null;

    const jobTagMap = new Map(jobSkills.map((s) => [s.tag.toLowerCase(), s]));
    const preferredLower = preferredSkills.map((s) => s.toLowerCase());

    const matched = preferredLower.filter((s) => jobTagMap.has(s));
    const requiredSkills = jobSkills.filter((s) => s.level === "required");
    const matchedRequired = requiredSkills.filter((s) =>
      preferredLower.includes(s.tag.toLowerCase())
    );

    const userCoverage = (matched.length / preferredSkills.length) * 100;
    const jobCoverage = (matched.length / jobSkills.length) * 100;
    const requiredCoverage =
      requiredSkills.length > 0
        ? (matchedRequired.length / requiredSkills.length) * 100
        : 100;

    const score =
      requiredCoverage * 0.5 + userCoverage * 0.3 + jobCoverage * 0.2;

    const details = preferredSkills.map((tag) => ({
      tag,
      level: jobTagMap.get(tag.toLowerCase())?.level ?? "none",
      matched: jobTagMap.has(tag.toLowerCase()),
    }));

    return {
      score,
      userCoverage,
      jobCoverage,
      requiredCoverage,
      matchedCount: matched.length,
      totalPreferred: preferredSkills.length,
      details,
    };
  },
};

const Query: QueryResolvers = {
  jobs: jobsQuery as QueryResolvers["jobs"],

  /**
   * Three-step lookup:
   *  1. Exact match on external_id — bare UUIDs (Ashby)
   *  2. Suffix match on external_id — full URL IDs (Greenhouse)
   *  3. Numeric match on integer `id` column — fallback for jobs whose
   *     external_id is a board-only URL (extractJobSlug falls back to job.id)
   */
  async job(_parent, args, context) {
    try {
      // 1. Exact match on external_id (Ashby UUIDs, bare IDs)
      const exactResults = await context.db
        .select()
        .from(jobs)
        .where(eq(jobs.external_id, args.id))
        .limit(1);

      if (exactResults.length > 0) {
        return exactResults[0] as any;
      }

      // 2. Suffix match on external_id (Greenhouse URL-based IDs)
      //    Also handles external_ids with query strings (e.g. .../5040710007?gh_jid=...)
      const suffixResults = await context.db
        .select()
        .from(jobs)
        .where(like(jobs.external_id, `%/${args.id}%`))
        .limit(1);

      if (suffixResults.length > 0) {
        return suffixResults[0] as any;
      }

      // 3. Numeric ID fallback — for jobs with board-only external_ids
      const numericId = Number(args.id);
      if (Number.isFinite(numericId) && numericId > 0) {
        const idResults = await context.db
          .select()
          .from(jobs)
          .where(eq(jobs.id, numericId))
          .limit(1);

        if (idResults.length > 0) {
          return idResults[0] as any;
        }
      }

      console.log(`[Job Resolver] No job found for ID: ${args.id}`);
      return null;
    } catch (error) {
      console.error("[Job Resolver] Error fetching job:", error);
      return null;
    }
  },
};

const Mutation: MutationResolvers = {
  async deleteJob(_parent, args, context) {
    try {
      if (!context.userId) {
        throw new Error("Unauthorized");
      }
      if (!isAdminEmail(context.userEmail)) {
        throw new Error("Forbidden - Admin access required");
      }
      await context.db.delete(jobs).where(eq(jobs.id, args.id));
      return {
        success: true,
        message: "Job deleted successfully",
      };
    } catch (error) {
      console.error("Error deleting job:", error);
      throw error;
    }
  },

  enhanceJobFromATS: enhanceJobFromATS as MutationResolvers["enhanceJobFromATS"],

  processAllJobs: processAllJobs as MutationResolvers["processAllJobs"],

  async reportJob(_parent, args, context) {
    if (!context.userId) {
      throw new Error("Unauthorized — sign in to report a job");
    }

    const [existing] = await context.db
      .select({ status: jobs.status })
      .from(jobs)
      .where(eq(jobs.id, args.id))
      .limit(1);

    const result = await context.db
      .update(jobs)
      .set({ status: JOB_STATUS.REPORTED, updated_at: sql`datetime('now')` })
      .where(eq(jobs.id, args.id))
      .returning();

    const updated = result[0] ?? null;

    // Fire-and-forget — GraphQL response is not blocked
    if (updated) {
      dispatchToReporter({
        jobId:      args.id,
        reportedBy: context.userId,
        prevStatus: existing?.status ?? "enhanced",
      });
    }

    return updated as any;
  },
};

export const jobResolvers = {
  Job,
  Query,
  Mutation,
};
