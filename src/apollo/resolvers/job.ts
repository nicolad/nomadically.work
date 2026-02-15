import { db } from "@/db";
import { jobs, jobSkillTags, companies } from "@/db/schema";
import { eq, and, or, like, desc } from "drizzle-orm";
import type { GraphQLContext } from "../context";
import { last, split } from "lodash";
import { isAdminEmail } from "@/lib/admin";
import {
  fetchGreenhouseJobPost,
  saveGreenhouseJobData,
} from "@/ingestion/greenhouse";

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
  },

  Query: {
    async jobs(
      _parent: any,
      args: {
        sourceType?: string;
        status?: string;
        search?: string;
        limit?: number;
        offset?: number;
        excludedCompanies?: string[];
      },
      _context: GraphQLContext,
    ) {
      try {
        const conditions = [];

        if (args.status) {
          conditions.push(eq(jobs.status, args.status));
        }

        if (args.search) {
          const searchPattern = `%${args.search}%`;
          conditions.push(
            or(
              like(jobs.title, searchPattern),
              like(jobs.company_key, searchPattern),
              like(jobs.location, searchPattern),
              like(jobs.description, searchPattern),
            )!,
          );
        }

        // Query all jobs (without pagination yet)
        let query = db.select().from(jobs);

        if (conditions.length > 0) {
          query = query.where(and(...conditions)!) as any;
        }

        query = query.orderBy(
          desc(jobs.posted_at),
          desc(jobs.created_at),
        ) as any;

        // Get all results first
        const allResults = await query;

        // Filter out excluded companies
        let filteredJobs = allResults || [];
        if (args.excludedCompanies && args.excludedCompanies.length > 0) {
          filteredJobs = filteredJobs.filter(
            (job) => !args.excludedCompanies!.includes(job.company_key),
          );
        }

        // Calculate total count from filtered results
        const totalCount = filteredJobs.length;

        // Apply pagination to filtered results
        const limit = args.limit ?? 20;
        const offset = args.offset ?? 0;
        const paginatedJobs = filteredJobs.slice(offset, offset + limit);

        return {
          jobs: paginatedJobs,
          totalCount,
        };
      } catch (error) {
        console.error("Error fetching jobs:", error);
        return { jobs: [], totalCount: 0 };
      }
    },

    async job(_parent: any, args: { id: string }, _context: GraphQLContext) {
      try {
        // The id might be just a UUID, so we need to match against external_id which contains full URL
        // Find by checking if external_id ends with the provided id
        const allJobs = await db.select().from(jobs);
        const result = allJobs.find((job) => {
          const jobId = last(split(job.external_id, "/"));
          return jobId === args.id;
        });
        return result || null;
      } catch (error) {
        console.error("Error fetching job:", error);
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
