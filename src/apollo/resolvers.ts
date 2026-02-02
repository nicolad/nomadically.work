import { db } from "@/db";
import { jobs } from "@/db/schema";
import { eq, and, or, like, desc } from "drizzle-orm";
import type { GraphQLContext } from "./context";

export const resolvers = {
  Job: {
    keywords: (parent: any) => {
      if (Array.isArray(parent.keywords)) {
        return parent.keywords;
      }
      if (typeof parent.keywords === "string") {
        try {
          return JSON.parse(parent.keywords);
        } catch {
          return [];
        }
      }
      return [];
    },
    techStack: (parent: any) => {
      if (Array.isArray(parent.techStack)) {
        return parent.techStack;
      }
      if (typeof parent.techStack === "string") {
        try {
          return JSON.parse(parent.techStack);
        } catch {
          return [];
        }
      }
      return [];
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

        if (conditions.length > 0) {
          query = query.where(and(...conditions)!) as any;
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

        const result = await query;
        return result || [];
      } catch (error) {
        console.error("Error fetching jobs:", error);
        return [];
      }
    },
    async job(_parent: any, args: { id: string }, _context: GraphQLContext) {
      try {
        const result = await db
          .select()
          .from(jobs)
          .where(eq(jobs.id, parseInt(args.id)))
          .limit(1);
        return result?.[0] || null;
      } catch (error) {
        console.error("Error fetching job:", error);
        return null;
      }
    },
  },
};
