import { db } from "@/db";
import { jobs } from "@/db/schema";
import { eq, and, or, like, desc } from "drizzle-orm";
import type { GraphQLContext } from "../../context";

export async function jobsQuery(
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

    query = query.orderBy(desc(jobs.posted_at), desc(jobs.created_at)) as any;

    // Get all results first
    const allResults = await query;

    // Filter out excluded companies and specific locations
    let filteredJobs = allResults || [];

    // Filter out excluded companies
    if (args.excludedCompanies && args.excludedCompanies.length > 0) {
      filteredJobs = filteredJobs.filter(
        (job) => !args.excludedCompanies!.includes(job.company_key),
      );
    }

    // Filter out jobs with location "Bangalore "
    filteredJobs = filteredJobs.filter(
      // (job) => job.location !== "Bangalore ",
      (job) => job?.location?.includes("Bangalore") === false,
    );

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
}
