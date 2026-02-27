import { task, logger, wait } from "@trigger.dev/sdk/v3";
import { toFile } from "@llamaindex/llama-cloud";
import { getLlamaClient, getResumePipelineId } from "../lib/llama-cloud";

export interface ProcessResumePayload {
  email: string;
  pdfBase64: string;
  filename: string;
}

export const processResumeTask = task({
  id: "process-resume",
  maxDuration: 300,
  retry: {
    maxAttempts: 2,
    minTimeoutInMs: 5000,
    maxTimeoutInMs: 30000,
    factor: 2,
  },
  queue: {
    concurrencyLimit: 3,
  },

  run: async (payload: ProcessResumePayload) => {
    const { email, pdfBase64, filename } = payload;
    const client = getLlamaClient();
    const externalFileId = `resume-${email}`;

    // Step 1: Delete existing file if re-uploading (paginated cursor)
    try {
      const existing = await client.files.list({ external_file_id: externalFileId });
      for await (const f of existing) {
        logger.info("Deleting existing file", { fileId: f.id });
        await client.files.delete(f.id);
      }
    } catch (e) {
      logger.warn("Could not check/delete existing files", {
        error: e instanceof Error ? e.message : String(e),
      });
    }

    // Step 2: Upload file to LlamaCloud
    logger.info("Uploading PDF to LlamaCloud", { filename, email });
    const pdfBuffer = Buffer.from(pdfBase64, "base64");

    const file = await client.files.create({
      file: await toFile(pdfBuffer, filename, { type: "application/pdf" }),
      purpose: "user_data",
      external_file_id: externalFileId,
    });

    logger.info("File uploaded", { fileId: file.id, name: file.name });

    // Step 2: Add file to the resume pipeline with user email as metadata
    const pipelineId = await getResumePipelineId();

    await client.pipelines.files.create(pipelineId, {
      body: [
        {
          file_id: file.id,
          custom_metadata: { user_email: email, type: "resume" },
        },
      ],
    });

    logger.info("File added to pipeline", { pipelineId });

    // Step 3: Trigger sync and wait for ingestion
    await client.pipelines.sync.create(pipelineId);
    logger.info("Pipeline sync triggered");

    // Poll pipeline status until ingestion completes
    for (let attempt = 0; attempt < 40; attempt++) {
      await wait.for({ seconds: 3 });

      const status = await client.pipelines.getStatus(pipelineId);
      logger.info("Pipeline status", { attempt, status: status.status });

      if (
        status.status === "SUCCESS" ||
        status.status === "success" ||
        status.status === "IDLE"
      ) {
        logger.info("Resume indexed successfully", { email });
        return {
          success: true,
          file_id: file.id,
          pipeline_id: pipelineId,
          email,
        };
      }

      if (status.status === "ERROR") {
        throw new Error("Pipeline ingestion failed");
      }
    }

    // If we get here, ingestion may still be running but we've waited long enough
    logger.warn("Pipeline sync still in progress after polling", { email });
    return {
      success: true,
      file_id: file.id,
      pipeline_id: pipelineId,
      email,
      note: "Ingestion may still be in progress",
    };
  },

  catchError: async ({ payload, error }) => {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error("Failed to process resume", {
      email: payload.email,
      filename: payload.filename,
      error: msg,
    });
  },
});
