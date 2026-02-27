import { eq } from "drizzle-orm";
import { resumes } from "@/db/schema";
import type { GraphQLContext } from "../../context";
import { getLlamaClient, getResumePipelineId } from "@/lib/llama-cloud";

export async function resumeStatus(
  _parent: any,
  args: { email: string },
  context: GraphQLContext,
) {
  if (!context.userId) {
    throw new Error("Unauthorized");
  }

  // Check LlamaCloud pipeline for files with this user's email
  try {
    const client = getLlamaClient();
    const pipelineId = await getResumePipelineId();
    const pipelineFiles = await client.pipelines.files.list(pipelineId, {});
    for await (const f of pipelineFiles) {
      if (f.custom_metadata?.user_email === args.email) {
        const fileId = f.file_id ?? f.id;

        // Get chunk count by listing documents for this file
        let chunkCount: number | null = null;
        try {
          const docs = await client.pipelines.documents.list(pipelineId, {
            file_id: fileId,
          });
          let count = 0;
          for await (const _doc of docs) {
            count++;
          }
          chunkCount = count;
        } catch (e) {
          console.warn("[resumeStatus] Could not fetch document count:", e instanceof Error ? e.message : String(e));
        }

        return {
          exists: true,
          resume_id: fileId,
          chunk_count: chunkCount,
          filename: f.name ?? null,
          ingested_at: f.created_at ?? null,
        };
      }
    }
  } catch (err) {
    console.warn("[resumeStatus] LlamaCloud check failed:", err instanceof Error ? err.message : String(err));
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
    const updatedAt =
      row.updated_at instanceof Date
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
}
