import type { GraphQLContext } from "../context";
import { eq, and, sql } from "drizzle-orm";
import { studyTopics, studyConceptExplanations } from "@/db/schema";
import { isAdminEmail } from "@/lib/admin";
import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { createDeepSeekClient, DEEPSEEK_MODELS } from "@/deepseek";
import type { ChatMessage } from "@/deepseek/types";

function toSlug(s: string): string {
  return s.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

async function sha256Hex(input: string): Promise<string> {
  const encoded = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function mapExplanation(row: typeof studyConceptExplanations.$inferSelect) {
  return {
    id: String(row.id),
    selectedText: row.selected_text,
    explanation: row.explanation_md,
    createdAt: row.created_at,
  };
}

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

    studyCategories: async (_: unknown, __: unknown, context: GraphQLContext) => {
      const rows = await context.db
        .selectDistinct({ category: studyTopics.category })
        .from(studyTopics)
        .orderBy(sql`${studyTopics.category} asc`);
      return rows.map((r) => r.category);
    },
  },

  Mutation: {
    createStudyTopic: async (
      _: unknown,
      args: { category?: string; topic?: string; title?: string; summary?: string; difficulty?: string; tags?: string[] },
      context: GraphQLContext,
    ) => {
      if (!context.userId || !isAdminEmail(context.userEmail)) {
        throw new Error("Forbidden");
      }

      const [row] = await context.db
        .insert(studyTopics)
        .values({
          category: toSlug(args.category?.trim() ?? ""),
          topic: toSlug(args.topic?.trim() ?? ""),
          title: args.title?.trim() ?? "",
          summary: args.summary?.trim() ?? null,
          difficulty: (args.difficulty ?? "intermediate") as "beginner" | "intermediate" | "advanced",
          tags: args.tags?.length ? JSON.stringify(args.tags) : null,
        })
        .returning();

      return row!;
    },

    generateStudyTopicsForCategory: async (
      _: unknown,
      args: { category: string; count?: number },
      context: GraphQLContext,
    ) => {
      if (!context.userId || !isAdminEmail(context.userEmail)) {
        throw new Error("Forbidden");
      }

      const category = toSlug(args.category.trim());
      const count = Math.min(args.count ?? 5, 10);

      const client = createDeepSeekClient();
      const messages: ChatMessage[] = [
        {
          role: "system",
          content: "You are a technical interview coach. Output ONLY valid JSON, no markdown, no code fences.",
        },
        {
          role: "user",
          content: `Generate ${count} study topics for the "${category}" category for software engineering interview prep.
Return a JSON array of objects with these fields:
- topic: kebab-case slug (string)
- title: display name (string)
- summary: one sentence description (string)
- difficulty: one of "beginner", "intermediate", "advanced"
- tags: array of 2-4 relevant tag strings`,
        },
      ];

      const response = await client.chat({ model: DEEPSEEK_MODELS.REASONER, messages, max_tokens: 2000 });
      const text = response.choices[0]?.message?.content ?? "";

      let parsed: Array<{ topic: string; title: string; summary?: string; difficulty?: string; tags?: string[] }>;
      try {
        const clean = text.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
        parsed = JSON.parse(clean);
      } catch {
        throw new Error("AI returned invalid JSON");
      }

      const results = await Promise.all(
        parsed.map((t) =>
          context.db
            .insert(studyTopics)
            .values({
              category,
              topic: toSlug(t.topic ?? t.title ?? ""),
              title: t.title ?? "",
              summary: t.summary ?? null,
              difficulty: (t.difficulty ?? "intermediate") as "beginner" | "intermediate" | "advanced",
              tags: t.tags?.length ? JSON.stringify(t.tags) : null,
            })
            .onConflictDoNothing()
            .returning(),
        ),
      );

      return results.flatMap((rows) => rows);
    },

    generateStudyConceptExplanation: async (
      _: unknown,
      args: { studyTopicId: string; selectedText: string; context?: string },
      context: GraphQLContext,
    ) => {
      // 1. Auth guard
      if (!context.userId) throw new Error("Forbidden");

      // 2. Validate input
      const text = args.selectedText.trim();
      if (!text || text.length > 2000) {
        throw new Error("Selected text must be 1-2000 characters");
      }

      // 3. Compute hash
      const hash = await sha256Hex(text);

      // 4. Check cache
      const topicId = parseInt(args.studyTopicId, 10);
      const [cached] = await context.db
        .select()
        .from(studyConceptExplanations)
        .where(
          and(
            eq(studyConceptExplanations.study_topic_id, topicId),
            eq(studyConceptExplanations.text_hash, hash),
          ),
        )
        .limit(1);
      if (cached) return mapExplanation(cached);

      // 5. Fetch topic for LLM context
      const [topic] = await context.db
        .select()
        .from(studyTopics)
        .where(eq(studyTopics.id, topicId))
        .limit(1);
      if (!topic) throw new Error("Study topic not found");

      // 6. Generate explanation
      const { text: explanation } = await generateText({
        model: anthropic("claude-haiku-4-5-20251001"),
        system: `You are a technical instructor explaining a concept to a software engineer studying for interviews.

Topic context:
- Title: ${topic.title}
- Category: ${topic.category}
- Difficulty: ${topic.difficulty}

Explain the selected excerpt clearly and concisely in the context of this topic. Use markdown formatting. Keep the explanation focused — 3-8 paragraphs max. Include a short code example if relevant. Do not repeat the selected text back verbatim.`,
        prompt: `Explain the following excerpt:\n\n"${text}"${args.context ? `\n\nSurrounding context:\n${args.context}` : ""}`,
      });

      // 7. Cache result (INSERT OR IGNORE for race safety)
      await context.db
        .insert(studyConceptExplanations)
        .values({
          study_topic_id: topicId,
          text_hash: hash,
          selected_text: text,
          explanation_md: explanation,
        })
        .onConflictDoNothing();

      // 8. Read back (handles concurrent insert race condition)
      const [row] = await context.db
        .select()
        .from(studyConceptExplanations)
        .where(
          and(
            eq(studyConceptExplanations.study_topic_id, topicId),
            eq(studyConceptExplanations.text_hash, hash),
          ),
        )
        .limit(1);

      return mapExplanation(row!);
    },

    generateStudyDeepDive: async (
      _: unknown,
      args: { studyTopicId: string; force?: boolean },
      context: GraphQLContext,
    ) => {
      if (!context.userId) throw new Error("Forbidden");

      const topicId = parseInt(args.studyTopicId, 10);
      const [topic] = await context.db
        .select()
        .from(studyTopics)
        .where(eq(studyTopics.id, topicId))
        .limit(1);
      if (!topic) throw new Error("Study topic not found");

      if (topic.deep_dive_md && !args.force) return topic;

      const client = createDeepSeekClient();
      const response = await client.chat({
        model: DEEPSEEK_MODELS.REASONER,
        messages: [
          {
            role: "user",
            content: `You are a senior staff engineer and technical interview coach. Generate a focused, technically rigorous deep dive on a study topic for a software engineer preparing for interviews.

Topic: "${topic.title}" (${topic.category}, ${topic.difficulty})

${topic.body_md ? `Existing content summary:\n${topic.body_md.slice(0, 1000)}\n\n` : ""}Write a technically rigorous deep dive in markdown. Go beyond definitions into mechanisms, trade-offs, and concrete examples. Structure it with these sections:

## What It Actually Is
The precise technical definition and mechanism. No hand-waving. Include how it works internally where relevant.

## When It Matters (and When It Doesn't)
Concrete scenarios where this concept is load-bearing. Name real systems and explain how they handle this.

## How to Talk About It in an Interview
The exact reasoning pattern a senior engineer uses: state your constraints, name the trade-offs, give a concrete recommendation with justification.

## The Trap Answers
What mid-level engineers say that reveals shallow understanding. Be blunt.

## One Concrete Example
A real production scenario where this concept was the crux. What happened, why, and what to learn from it.`,
          },
        ],
        max_tokens: 2500,
      });

      const deepDive = response.choices[0]?.message?.content;

      if (!deepDive) throw new Error("Empty response from AI");

      const [updated] = await context.db
        .update(studyTopics)
        .set({ deep_dive_md: deepDive, updated_at: new Date().toISOString() })
        .where(eq(studyTopics.id, topicId))
        .returning();

      return updated!;
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
    deepDive(parent: { deep_dive_md: string | null }) {
      return parent.deep_dive_md ?? null;
    },
    createdAt(parent: { created_at: string }) {
      return parent.created_at;
    },
  },
};
