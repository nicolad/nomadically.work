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
      _context: GraphQLContext,
    ) {
      try {
        const response = await fetch(`${RESUME_RAG_WORKER_URL}/resume-status`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: args.email }),
        });

        if (!response.ok) {
          throw new Error(`Worker error: ${await response.text()}`);
        }

        const result = (await response.json()) as {
          success: boolean;
          exists: boolean;
          resume_id?: string;
          chunk_count?: number;
          filename?: string;
          ingested_at?: string;
        };

        return {
          exists: result.exists ?? false,
          resume_id: result.resume_id ?? null,
          chunk_count: result.chunk_count ?? null,
          filename: result.filename ?? null,
          ingested_at: result.ingested_at ?? null,
        };
      } catch (error) {
        console.error("Error checking resume status:", error);
        return { exists: false };
      }
    },

    async askAboutResume(
      _parent: any,
      args: { email: string; question: string },
      _context: GraphQLContext,
    ) {
      try {
        const { email, question } = args;

        const response = await fetch(`${RESUME_RAG_WORKER_URL}/chat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            user_id: email,
            message: question,
            resume_id: "latest",
          }),
        });

        if (!response.ok) {
          const error = await response.text();
          throw new Error(`Worker error: ${error}`);
        }

        const result = (await response.json()) as WorkerChatResponse;

        if (!result.success) {
          throw new Error(result.error || "Failed to query resume");
        }

        return {
          answer: result.response || "",
          context_count: result.context_count || 0,
        };
      } catch (error) {
        console.error("Error querying resume:", error);
        throw new Error(
          `Failed to query resume: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    },
  },

  Mutation: {
    async uploadResume(
      _parent: any,
      args: { email: string; resumePdf: string; filename: string },
      _context: GraphQLContext,
    ) {
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
      _context: GraphQLContext,
    ) {
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
