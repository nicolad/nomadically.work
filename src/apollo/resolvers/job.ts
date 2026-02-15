import { db } from "@/db";
import { jobs, jobSkillTags, companies } from "@/db/schema";
import { eq, like } from "drizzle-orm";
import type { GraphQLContext } from "../context";
import { last, split } from "lodash";
import { isAdminEmail } from "@/lib/admin";
import {
  fetchGreenhouseJobPost,
  saveGreenhouseJobData,
} from "@/ingestion/greenhouse";
import { jobsQuery } from "./job/jobs-query";

// Helper to safely parse ats_data
function parseAtsData(parent: any): any | null {
  if (!parent.ats_data) return null;
  try {
    return JSON.parse(parent.ats_data);
  } catch (error) {
    console.error("Error parsing ats_data:", error);
    return null;
  }
}

export const jobResolvers = {
  Job: {
    async skills(parent: any) {
      try {
        const skills = await db
          .select()
          .from(jobSkillTags)
          .where(eq(jobSkillTags.job_id, parent.id));
        return skills;
      } catch (error) {
        console.error("Error fetching job skills:", error);
        return [];
      }
    },
    async company(parent: any) {
      try {
        if (!parent.company_id) {
          return null;
        }
        const [company] = await db
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
      const atsData = parseAtsData(parent);
      // Greenhouse provides 'content' field with full HTML description
      if (atsData?.content) {
        return atsData.content;
      }
      // Fall back to the original description field
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
  },

  Query: {
    jobs: jobsQuery,

    async job(_parent: any, args: { id: string }, _context: GraphQLContext) {
      try {
        // Try to find the job by matching external_id pattern
        // external_id typically contains the full URL like:
        // https://job-boards.greenhouse.io/databricks/jobs/7434532002
        // We need to match jobs where external_id ends with the provided id

        const results = await db
          .select()
          .from(jobs)
          .where(like(jobs.external_id, `%/${args.id}`));

        if (results.length > 0) {
          return results[0];
        }

        // If no match found with trailing slash, try without it
        // (in case it's a direct match or different format)
        const directResults = await db
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
        await db.delete(jobs).where(eq(jobs.id, args.id));

        return {
          success: true,
          message: "Job deleted successfully",
        };
      } catch (error) {
        console.error("Error deleting job:", error);
        throw error;
      }
    },

    async enhanceJobFromATS(
      _parent: any,
      args: { jobId: string; company: string; source: string },
      _context: GraphQLContext,
    ) {
      try {
        const { jobId, company, source } = args;

        // Currently only Greenhouse is supported
        if (source !== "greenhouse") {
          throw new Error(`ATS source "${source}" is not yet supported`);
        }

        // Find the job in the database first
        const allJobs = await db.select().from(jobs);
        const job = allJobs.find((job) => {
          const jobIdFromUrl = last(split(job.external_id, "/"));
          return jobIdFromUrl === jobId;
        });

        if (!job) {
          return {
            success: false,
            message: `Job not found with ID: ${jobId}`,
            job: null,
            enhancedData: null,
          };
        }

        // Construct the appropriate ATS URL based on source
        let enhancedData;
        if (source === "greenhouse") {
          const jobBoardUrl = `https://job-boards.greenhouse.io/${company}/jobs/${jobId}`;
          enhancedData = await fetchGreenhouseJobPost(jobBoardUrl, {
            questions: true,
          });

          // Save the enhanced data to the database
          await saveGreenhouseJobData(job.id, enhancedData);
        }

        return {
          success: true,
          message: "Job enhanced and saved successfully",
          job: job,
          enhancedData,
        };
      } catch (error) {
        console.error("Error enhancing job:", error);
        return {
          success: false,
          message:
            error instanceof Error ? error.message : "Failed to enhance job",
          job: null,
          enhancedData: null,
        };
      }
    },
  },
};
