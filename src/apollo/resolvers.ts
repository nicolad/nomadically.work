import { getD1Client } from "@/lib/cloudflare-d1";
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
        limit?: number;
        offset?: number;
      },
      _context: GraphQLContext,
    ) {
      try {
        const d1Client = getD1Client();
        const jobs = await d1Client.getJobsFiltered({
          limit: args.limit,
          offset: args.offset,
          status: args.status,
        });
        return jobs;
      } catch (error) {
        console.error("Error fetching jobs:", error);
        return [];
      }
    },
    async job(_parent: any, args: { id: string }, _context: GraphQLContext) {
      try {
        const d1Client = getD1Client();
        const job = await d1Client.getJobById(args.id);
        return job;
      } catch (error) {
        console.error("Error fetching job:", error);
        return null;
      }
    },
  },
  Mutation: {
