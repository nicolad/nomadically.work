import { getTursoClient } from "@/lib/turso";
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
        const client = getTursoClient();
        
        let sql = "SELECT * FROM jobs";
        const params: any[] = [];
        const conditions: string[] = [];

        if (args.status) {
          conditions.push("status = ?");
          params.push(args.status);
        }

        if (conditions.length > 0) {
          sql += " WHERE " + conditions.join(" AND ");
        }

        sql += " ORDER BY created_at DESC";

        if (args.limit) {
          sql += " LIMIT ?";
          params.push(args.limit);
        }

        if (args.offset) {
          sql += " OFFSET ?";
          params.push(args.offset);
        }

        const result = await client.execute({ sql, args: params });
        return result.rows || [];
      } catch (error) {
        console.error("Error fetching jobs:", error);
        return [];
      }
    },
    async job(_parent: any, args: { id: string }, _context: GraphQLContext) {
      try {
        const client = getTursoClient();
        const result = await client.execute({
          sql: "SELECT * FROM jobs WHERE id = ?",
          args: [args.id],
        });
        return result.rows?.[0] || null;
      } catch (error) {
        console.error("Error fetching job:", error);
        return null;
      }
    },
  },
};
