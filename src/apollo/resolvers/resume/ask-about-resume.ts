import { generateText } from "ai";
import { deepseek } from "@ai-sdk/deepseek";
import { eq } from "drizzle-orm";
import { resumes } from "@/db/schema";
import type { GraphQLContext } from "../../context";
import { getLlamaClient, getResumePipelineId } from "@/lib/llama-cloud";
import { aiTelemetry } from "@/lib/telemetry";

export async function askAboutResume(
  _parent: any,
  args: { email: string; question: string },
  context: GraphQLContext,
) {
  if (!context.userId) {
    throw new Error("Unauthorized");
  }

  const { email, question } = args;
  const traceId = crypto.randomUUID();

  const RESUME_SYSTEM_PROMPT = `You are a helpful assistant answering questions about a candidate's resume.
Answer concisely and accurately based only on the resume content provided.
If the resume doesn't contain enough information to answer, say so clearly.`;

  // Use LlamaCloud retrieval with metadata filter for this user
  try {
    const client = getLlamaClient();
    const pipelineId = await getResumePipelineId();

    const results = await client.pipelines.retrieve(pipelineId, {
      query: question,
      dense_similarity_top_k: 8,
      search_filters: {
        filters: [
          { key: "user_email", value: email, operator: "==" },
        ],
      },
    });

    const nodes = results.retrieval_nodes ?? [];
    if (nodes.length > 0) {
      const contextText = nodes
        .map((n) => n.node?.text ?? "")
        .filter(Boolean)
        .join("\n\n---\n\n");

      const { text } = await generateText({
        model: deepseek("deepseek-chat"),
        system: RESUME_SYSTEM_PROMPT,
        prompt: `Resume sections:\n\n${contextText}\n\n---\n\nQuestion: ${question}`,
        experimental_telemetry: aiTelemetry("ask-about-resume", {
          source: "llamacloud",
          userId: context.userId,
          langfuseTraceId: traceId,
        }),
      });

      return { answer: text, context_count: nodes.length, trace_id: traceId };
    }
  } catch (e) {
    console.warn("[askAboutResume] LlamaCloud retrieval failed:", e);
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

  const rawText = rows[0].raw_text.slice(0, 12000);

  const { text } = await generateText({
    model: deepseek("deepseek-chat"),
    system: RESUME_SYSTEM_PROMPT,
    prompt: `Resume content:\n\n${rawText}\n\n---\n\nQuestion: ${question}`,
    experimental_telemetry: aiTelemetry("ask-about-resume", {
      source: "d1-fallback",
      userId: context.userId,
      langfuseTraceId: traceId,
    }),
  });

  return { answer: text, context_count: 1, trace_id: traceId };
}
