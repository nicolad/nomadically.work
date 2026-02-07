import { db } from "@/db";
import { jobs, userSettings, jobSkillTags } from "@/db/schema";
import { eq, and, or, like, desc, count } from "drizzle-orm";
import type { GraphQLContext } from "./context";
import { last, split } from "lodash";
import { isAdminEmail } from "@/lib/admin";

export const resolvers = {
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
    async userSettings(
      _parent: any,
      args: { userId: string },
      _context: GraphQLContext,
    ) {
      try {
        const [settings] = await db
          .select()
          .from(userSettings)
          .where(eq(userSettings.user_id, args.userId));

        if (!settings) {
          return null;
        }

        // Parse JSON fields
        return {
          ...settings,
          preferred_locations: settings.preferred_locations
            ? JSON.parse(settings.preferred_locations)
            : [],
          preferred_skills: settings.preferred_skills
            ? JSON.parse(settings.preferred_skills)
            : [],
          excluded_companies: settings.excluded_companies
            ? JSON.parse(settings.excluded_companies)
            : [],
        };
      } catch (error) {
        console.error("Error fetching user settings:", error);
        return null;
      }
    },
  },
  Mutation: {
    async updateUserSettings(
      _parent: any,
      args: {
        userId: string;
        settings: {
          email_notifications?: boolean;
          daily_digest?: boolean;
          new_job_alerts?: boolean;
          preferred_locations?: string[];
          preferred_skills?: string[];
          excluded_companies?: string[];
          dark_mode?: boolean;
          jobs_per_page?: number;
        };
      },
      _context: GraphQLContext,
    ) {
      try {
        const { userId, settings: settingsInput } = args;

        // Check if settings exist
        const [existingSettings] = await db
          .select()
          .from(userSettings)
          .where(eq(userSettings.user_id, userId));

        const settingsData = {
          user_id: userId,
          ...(settingsInput.email_notifications !== undefined && {
            email_notifications: settingsInput.email_notifications,
          }),
          ...(settingsInput.daily_digest !== undefined && {
            daily_digest: settingsInput.daily_digest,
          }),
          ...(settingsInput.new_job_alerts !== undefined && {
            new_job_alerts: settingsInput.new_job_alerts,
          }),
          ...(settingsInput.preferred_locations !== undefined && {
            preferred_locations: JSON.stringify(
              settingsInput.preferred_locations,
            ),
          }),
          ...(settingsInput.preferred_skills !== undefined && {
            preferred_skills: JSON.stringify(settingsInput.preferred_skills),
          }),
          ...(settingsInput.excluded_companies !== undefined && {
            excluded_companies: JSON.stringify(
              settingsInput.excluded_companies,
            ),
          }),
          ...(settingsInput.dark_mode !== undefined && {
            dark_mode: settingsInput.dark_mode,
          }),
          ...(settingsInput.jobs_per_page !== undefined && {
            jobs_per_page: settingsInput.jobs_per_page,
          }),
          updated_at: new Date().toISOString(),
        };

        let result;
        if (existingSettings) {
          // Update existing settings
          [result] = await db
            .update(userSettings)
            .set(settingsData)
            .where(eq(userSettings.user_id, userId))
            .returning();
        } else {
          // Insert new settings
          [result] = await db
            .insert(userSettings)
            .values(settingsData)
            .returning();
        }

        // Parse JSON fields for response
        return {
          ...result,
          preferred_locations: result.preferred_locations
            ? JSON.parse(result.preferred_locations)
            : [],
          preferred_skills: result.preferred_skills
            ? JSON.parse(result.preferred_skills)
            : [],
          excluded_companies: result.excluded_companies
            ? JSON.parse(result.excluded_companies)
            : [],
        };
      } catch (error) {
        console.error("Error updating user settings:", error);
        throw new Error("Failed to update user settings");
      }
    },
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
        const result = await db.delete(jobs).where(eq(jobs.id, args.id));

        return {
          success: true,
          message: "Job deleted successfully",
        };
      } catch (error) {
        console.error("Error deleting job:", error);
        throw error;
      }
    },
  },
};
