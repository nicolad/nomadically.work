import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { eq } from "drizzle-orm";
import { resumes } from "@/db/schema";
import type { GraphQLContext } from "../context";

const RESUME_RAG_WORKER_URL =
  "https://nomadically-work-resume-rag.eeeew.workers.dev";

interface WorkerChatResponse {
  success: boolean;
  message?: string;
  response?: string;
  context_count?: number;
  error?: string;
}

interface WorkerUploadResponse {
  success: boolean;
  job_id?: string;
  tier?: string;
  status?: string;
  error?: string;
}

interface WorkerIngestResponse {
  success: boolean;
  status?: string;
  job_id?: string;
  resume_id?: string;
  chunks_stored?: number;
  error?: string;
}

export const resumeResolvers = {
  Query: {
    async resumeStatus(
      _parent: any,
      args: { email: string },
      context: GraphQLContext,
    ) {
      if (!context.userId) {
        throw new Error("Unauthorized");
      }

      // First check the RAG worker (Vectorize)
      try {
        const response = await fetch(`${RESUME_RAG_WORKER_URL}/resume-status`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: args.email }),
        });

        if (response.ok) {
          const result = (await response.json()) as {
            success: boolean;
            exists: boolean;
            resume_id?: string;
            chunk_count?: number;
            filename?: string;
            ingested_at?: string;
          };

          if (result.exists) {
            return {
              exists: true,
              resume_id: result.resume_id ?? null,
              chunk_count: result.chunk_count ?? null,
              filename: result.filename ?? null,
              ingested_at: result.ingested_at ?? null,
            };
          }
        }
      } catch {
        // RAG worker unavailable — fall through to D1 check
      }

      // Fall back: check D1 skill profile (uploaded via Job Matching section)
      const rows = await context.db
        .select({
          id: resumes.id,
          filename: resumes.filename,
          updated_at: resumes.updated_at,
          raw_text: resumes.raw_text,
        })
        .from(resumes)
        .where(eq(resumes.user_id, context.userId))
        .limit(1);

      if (rows.length > 0 && rows[0].raw_text?.trim()) {
        const row = rows[0];
        const updatedAt = row.updated_at instanceof Date
          ? row.updated_at.toISOString()
          : new Date(Number(row.updated_at) * 1000).toISOString();
        return {
          exists: true,
          resume_id: row.id,
          chunk_count: null,
          filename: row.filename ?? null,
          ingested_at: updatedAt,
        };
      }

      return { exists: false };
    },

    async askAboutResume(
      _parent: any,
      args: { email: string; question: string },
      context: GraphQLContext,
    ) {
      if (!context.userId) {
        throw new Error("Unauthorized");
      }

      const { email, question } = args;

      // Try RAG worker first (Vectorize-backed semantic search)
      try {
        const response = await fetch(`${RESUME_RAG_WORKER_URL}/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: email, message: question, resume_id: "latest" }),
        });

        if (response.ok) {
          const result = (await response.json()) as WorkerChatResponse;
          if (result.success && result.response) {
            return {
              answer: result.response,
              context_count: result.context_count || 0,
            };
          }
        }
      } catch {
        // RAG worker unavailable — fall through to D1 fallback
      }

      // Fallback: answer using raw text stored in D1 from the skill-profile upload
      const rows = await context.db
        .select({ raw_text: resumes.raw_text, filename: resumes.filename })
        .from(resumes)
        .where(eq(resumes.user_id, context.userId))
        .limit(1);

      if (rows.length === 0 || !rows[0].raw_text?.trim()) {
        throw new Error("No resume found. Please upload your resume first.");
      }

      const rawText = rows[0].raw_text.slice(0, 12000); // ~3k tokens max

      const { text } = await generateText({
        model: anthropic("claude-haiku-4-5-20251001"),
        system: `You are a helpful assistant answering questions about a candidate's resume.
Answer concisely and accurately based only on the resume content provided.
If the resume doesn't contain enough information to answer, say so clearly.`,
        prompt: `Resume content:\n\n${rawText}\n\n---\n\nQuestion: ${question}`,
      });

      return { answer: text, context_count: 1 };
    },
  },

  Mutation: {
    async uploadResume(
      _parent: any,
      args: { email: string; resumePdf: string; filename: string },
      context: GraphQLContext,
    ) {
      if (!context.userId) {
        throw new Error("Unauthorized");
      }
      try {
        const { email, resumePdf, filename } = args;

        const response = await fetch(`${RESUME_RAG_WORKER_URL}/upload-pdf`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            user_id: email,
            pdf_base64: resumePdf,
            filename,
          }),
        });

        if (!response.ok) {
          const error = await response.text();
          throw new Error(`Worker error: ${error}`);
        }

        const result = (await response.json()) as WorkerUploadResponse;

        if (!result.success) {
          throw new Error(result.error || "Failed to upload resume");
        }

        return {
          success: true,
          job_id: result.job_id || "",
          tier: result.tier || "fast",
          status: result.status || "PENDING",
        };
      } catch (error) {
        console.error("Error uploading resume:", error);
        throw new Error(
          `Failed to upload resume: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    },

    async ingestResumeParse(
      _parent: any,
      args: { email: string; job_id: string; filename: string },
      context: GraphQLContext,
    ) {
      if (!context.userId) {
        throw new Error("Unauthorized");
      }
      try {
        const { email, job_id, filename } = args;

        const response = await fetch(
          `${RESUME_RAG_WORKER_URL}/ingest-parse`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              job_id,
              user_id: email,
              filename,
            }),
          },
        );

        if (!response.ok) {
          const error = await response.text();
          throw new Error(`Worker error: ${error}`);
        }

        const result = (await response.json()) as WorkerIngestResponse;

        if (!result.success) {
          return {
            success: false,
            status: result.status || "ERROR",
            job_id,
            error: result.error || "Ingest failed",
          };
        }

        return {
          success: true,
          status: result.status || "PENDING",
          job_id,
          resume_id: result.resume_id || null,
          chunks_stored: result.chunks_stored || null,
        };
      } catch (error) {
        console.error("Error ingesting resume parse:", error);
        throw new Error(
          `Failed to ingest resume: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    },
  },
};
