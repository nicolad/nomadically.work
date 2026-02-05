import { db } from "@/db";
import { jobs } from "@/db/schema";
import { eq, and, or, like, desc, count } from "drizzle-orm";
import type { GraphQLContext } from "./context";
import { last, split } from "lodash";

export const resolvers = {
  Query: {
    async jobs(
      _parent: any,
      args: {
        sourceType?: string;
        status?: string;
        search?: string;
        limit?: number;
        offset?: number;
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
            )!,
          );
        }

        let query = db.select().from(jobs);
        let countQuery = db.select({ count: count() }).from(jobs);

        if (conditions.length > 0) {
          query = query.where(and(...conditions)!) as any;
          countQuery = countQuery.where(and(...conditions)!) as any;
        }

        query = query.orderBy(
          desc(jobs.posted_at),
          desc(jobs.created_at),
        ) as any;

        if (args.limit) {
          query = query.limit(args.limit) as any;
        }

        if (args.offset) {
          query = query.offset(args.offset) as any;
        }

        const [result, totalCountResult] = await Promise.all([
          query,
          countQuery,
        ]);

        return {
          jobs: result || [],
          totalCount: totalCountResult[0]?.count || 0,
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
};
