import type { GraphQLContext } from "../context";
import { eq, and } from "drizzle-orm";
import { studyTopics } from "@/db/schema";

export const studyTopicResolvers = {
  Query: {
    studyTopic: async (
      _: unknown,
      args: { category: string; topic: string },
      context: GraphQLContext,
    ) => {
      const rows = await context.db
        .select()
        .from(studyTopics)
        .where(
          and(
            eq(studyTopics.category, args.category),
            eq(studyTopics.topic, args.topic),
          ),
        )
        .limit(1);
      return rows[0] ?? null;
    },

    studyTopics: async (
      _: unknown,
      args: { category: string },
      context: GraphQLContext,
    ) => {
      return context.db
        .select()
        .from(studyTopics)
        .where(eq(studyTopics.category, args.category));
    },
  },

  StudyTopic: {
    tags(parent: { tags: string | null }) {
      if (!parent.tags) return [];
      try {
        return JSON.parse(parent.tags);
      } catch {
        return [];
      }
    },
    bodyMd(parent: { body_md: string | null }) {
      return parent.body_md ?? null;
    },
    createdAt(parent: { created_at: string }) {
      return parent.created_at;
    },
  },
};
