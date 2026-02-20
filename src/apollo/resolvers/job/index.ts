import { jobs, jobSkillTags, companies } from "@/db/schema";
import { eq, like } from "drizzle-orm";
import type { GraphQLContext } from "../../context";
import { last, split } from "lodash";
import { isAdminEmail } from "@/lib/admin";
import { jobsQuery } from "./jobs-query";
import { enhanceJobFromATS } from "./enhance-job";
import { processAllJobs } from "./process-all-jobs";

export const jobResolvers = {
  Job: {
    async skills(parent: any, _args: any, context: GraphQLContext) {
      try {
        const skills = await context.db
          .select()
          .from(jobSkillTags)
          .where(eq(jobSkillTags.job_id, parent.id));
        return skills;
      } catch (error) {
        console.error("Error fetching job skills:", error);
        return [];
      }
    },
    async company(parent: any, _args: any, context: GraphQLContext) {
      try {
        if (!parent.company_id) {
          return null;
        }
        const [company] = await context.db
          .select()
          .from(companies)
          .where(eq(companies.id, parent.company_id))
          .limit(1);
        return company || null;
      } catch (error) {
        console.error("Error fetching company:", error);
        return null;
      }
    },
    description(parent: any) {
      // Description is stored directly in the column (from Greenhouse's 'content' or Lever's text)
      return parent.description;
    },
    absolute_url(parent: any) {
      return parent.absolute_url || null;
    },
    internal_job_id(parent: any) {
      return parent.internal_job_id || null;
    },
    requisition_id(parent: any) {
      return parent.requisition_id || null;
    },
    company_name(parent: any) {
      return parent.company_name || null;
    },
    first_published(parent: any) {
      return parent.first_published || null;
    },
    language(parent: any) {
      return parent.language || null;
    },
    metadata(parent: any) {
      if (!parent.metadata) return [];
      try {
        return JSON.parse(parent.metadata);
      } catch {
        return [];
      }
    },
    departments(parent: any) {
      if (!parent.departments) return [];
      try {
        return JSON.parse(parent.departments);
      } catch {
        return [];
      }
    },
    offices(parent: any) {
      if (!parent.offices) return [];
      try {
        return JSON.parse(parent.offices);
      } catch {
        return [];
      }
    },
    questions(parent: any) {
      if (!parent.questions) return [];
      try {
        return JSON.parse(parent.questions);
      } catch {
        return [];
      }
    },
    location_questions(parent: any) {
      if (!parent.location_questions) return [];
      try {
        return JSON.parse(parent.location_questions);
      } catch {
        return [];
      }
    },
    compliance(parent: any) {
      if (!parent.compliance) return [];
      try {
        return JSON.parse(parent.compliance);
      } catch {
        return [];
      }
    },
    demographic_questions(parent: any) {
      if (!parent.demographic_questions) return null;
      try {
        const parsed = JSON.parse(parent.demographic_questions);
        // Return null if it's an empty object
        if (Object.keys(parsed).length === 0) return null;
        return parsed;
      } catch {
        return null;
      }
    },
    data_compliance(parent: any) {
      if (!parent.data_compliance) return [];
      try {
        return JSON.parse(parent.data_compliance);
      } catch {
        return [];
      }
    },

    // Ashby ATS field resolvers - read from individual columns
    ashby_department(parent: any) {
      return parent.ashby_department || null;
    },
    ashby_team(parent: any) {
      return parent.ashby_team || null;
    },
    ashby_employment_type(parent: any) {
      return parent.ashby_employment_type || null;
    },
    ashby_is_remote(parent: any) {
      return parent.ashby_is_remote ?? null;
    },
    ashby_is_listed(parent: any) {
      return parent.ashby_is_listed ?? null;
    },
    ashby_published_at(parent: any) {
      return parent.ashby_published_at || null;
    },
    ashby_job_url(parent: any) {
      return parent.ashby_job_url || null;
    },
    ashby_apply_url(parent: any) {
      return parent.ashby_apply_url || null;
    },
    ashby_secondary_locations(parent: any) {
      if (!parent.ashby_secondary_locations) return [];
      try {
        return typeof parent.ashby_secondary_locations === "string"
          ? JSON.parse(parent.ashby_secondary_locations)
          : parent.ashby_secondary_locations;
      } catch {
        return [];
      }
    },
    ashby_compensation(parent: any) {
      if (!parent.ashby_compensation) return null;
      try {
        const parsed =
          typeof parent.ashby_compensation === "string"
            ? JSON.parse(parent.ashby_compensation)
            : parent.ashby_compensation;
        // Return null if compensation data is empty/meaningless
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
    ashby_address(parent: any) {
      if (!parent.ashby_address) return null;
      try {
        return typeof parent.ashby_address === "string"
          ? JSON.parse(parent.ashby_address)
          : parent.ashby_address;
      } catch {
        return null;
      }
    },

    // Lever ATS field resolvers - read from individual columns
    categories(parent: any) {
      if (!parent.categories) return null;
      try {
        return typeof parent.categories === "string"
          ? JSON.parse(parent.categories)
          : parent.categories;
      } catch {
        return null;
      }
    },
    workplace_type(parent: any) {
      return parent.workplace_type || null;
    },
    country(parent: any) {
      return parent.country || null;
    },
    opening(parent: any) {
      return parent.opening || null;
    },
    opening_plain(parent: any) {
      return parent.opening_plain || null;
    },
    description_body(parent: any) {
      return parent.description_body || null;
    },
    description_body_plain(parent: any) {
      return parent.description_body_plain || null;
    },
    additional(parent: any) {
      return parent.additional || null;
    },
    additional_plain(parent: any) {
      return parent.additional_plain || null;
    },
    lists(parent: any) {
      if (!parent.lists) return [];
      try {
        return typeof parent.lists === "string"
          ? JSON.parse(parent.lists)
          : parent.lists;
      } catch {
        return [];
      }
    },
    ats_created_at(parent: any) {
      return parent.ats_created_at || null;
    },
  },

  Query: {
    jobs: jobsQuery,

    async job(_parent: any, args: { id: string }, context: GraphQLContext) {
      try {
        // Try to find the job by matching external_id pattern
        // external_id typically contains the full URL like:
        // https://job-boards.greenhouse.io/databricks/jobs/7434532002
        // We need to match jobs where external_id ends with the provided id

        const results = await context.db
          .select()
          .from(jobs)
          .where(like(jobs.external_id, `%/${args.id}`));

        if (results.length > 0) {
          return results[0];
        }

        // If no match found with trailing slash, try without it
        // (in case it's a direct match or different format)
        const directResults = await context.db
          .select()
          .from(jobs)
          .where(like(jobs.external_id, `%${args.id}%`));

        if (directResults.length > 0) {
          // Find the one where the id is actually at the end
          const exactMatch = directResults.find((job) => {
            const jobId = last(split(job.external_id, "/"));
            return jobId === args.id;
          });
          return exactMatch || directResults[0];
        }

        console.log(`❌ [Job Resolver] No job found for ID: ${args.id}`);
        return null;
      } catch (error) {
        console.error("❌ [Job Resolver] Error fetching job:", error);
        return null;
      }
    },
  },

  Mutation: {
    async deleteJob(
      _parent: any,
      args: { id: number },
      context: GraphQLContext,
    ) {
      try {
        // Check if user is authenticated
        if (!context.userId) {
          throw new Error("Unauthorized");
        }

        // Check if user is admin
        if (!isAdminEmail(context.userEmail)) {
          throw new Error("Forbidden - Admin access required");
        }

        // Delete the job
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

    enhanceJobFromATS,

    processAllJobs,
  },
};
