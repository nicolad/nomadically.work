import { resumeStatus } from "./resume-status";
import { askAboutResume } from "./ask-about-resume";
import { uploadResume } from "./upload-resume";
import { createScore } from "@/langfuse/scores";
import { isLangfuseConfigured } from "@/langfuse";

export const resumeResolvers = {
  Query: {
    resumeStatus,
    askAboutResume,
  },

  Mutation: {
    uploadResume,

    async rateResumeAnswer(
      _parent: any,
      args: { traceId: string; helpful: boolean },
      context: any,
    ) {
      if (!context.userId) throw new Error("Unauthorized");
      if (!isLangfuseConfigured()) return false;
      await createScore({
        traceId: args.traceId,
        name: "helpfulness",
        value: args.helpful ? 1 : 0,
        dataType: "BOOLEAN",
        comment: args.helpful ? "User found answer helpful" : "User found answer unhelpful",
      });
      return true;
    },

    async ingestResumeParse(
      _parent: any,
      args: { email: string; job_id: string; filename: string },
      context: any,
    ) {
      if (!context.userId) {
        throw new Error("Unauthorized");
      }
      // No longer needed — Trigger.dev task handles full pipeline
      return {
        success: true,
        status: "COMPLETE",
        job_id: args.job_id,
        resume_id: null,
        chunks_stored: null,
      };
    },
  },
};
