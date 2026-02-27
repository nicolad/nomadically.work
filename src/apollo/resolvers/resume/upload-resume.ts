import { tasks } from "@trigger.dev/sdk/v3";
import type { GraphQLContext } from "../../context";
import type { processResumeTask } from "@/trigger/process-resume";

export async function uploadResume(
  _parent: any,
  args: { email: string; resumePdf: string; filename: string },
  context: GraphQLContext,
) {
  if (!context.userId) {
    throw new Error("Unauthorized");
  }
  try {
    const { email, resumePdf, filename } = args;

    const handle = await tasks.trigger<typeof processResumeTask>(
      "process-resume",
      { email, pdfBase64: resumePdf, filename },
    );

    console.log(
      `[uploadResume] Triggered process-resume task: ${handle.id}`,
    );

    return {
      success: true,
      job_id: handle.id,
      tier: "trigger",
      status: "PENDING",
    };
  } catch (error) {
    console.error("Error uploading resume:", error);
    throw new Error(
      `Failed to upload resume: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
