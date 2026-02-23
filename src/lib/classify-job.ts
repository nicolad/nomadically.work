"use server";

export type JobClassificationInput = {
  title: string;
  location: string;
  description: string;
};

export type JobClassificationResponse = {
  isRemoteEU: boolean;
  confidence: "high" | "medium" | "low";
  reason: string;
};

/**
 * Classify a single job via the process-jobs Python worker (LangChain pipeline).
 *
 * The worker runs the full signal-extraction + keyword heuristic + Workers AI +
 * DeepSeek fallback pipeline and writes the result directly to D1 before
 * returning the classification.
 *
 * Env var: CLASSIFY_JOBS_WORKER_URL — base URL of the deployed process-jobs worker.
 */
export const classifyJob = async (
  _input: JobClassificationInput,
  jobId?: number,
): Promise<{
  ok: boolean;
  data?: JobClassificationResponse;
  error?: string;
}> => {
  if (!jobId) {
    return { ok: false, error: "job_id is required for classification" };
  }

  const workerUrl = process.env.CLASSIFY_JOBS_WORKER_URL;
  if (!workerUrl) {
    return {
      ok: false,
      error: "CLASSIFY_JOBS_WORKER_URL is not configured",
    };
  }

  try {
    const url = `${workerUrl.replace(/\/$/, "")}/classify-one`;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret) {
      headers["Authorization"] = `Bearer ${cronSecret}`;
    }

    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ job_id: jobId }),
    });

    const json = (await res.json()) as {
      success: boolean;
      isRemoteEU?: boolean;
      confidence?: "high" | "medium" | "low";
      reason?: string;
      error?: string;
    };

    if (!res.ok || !json.success) {
      return {
        ok: false,
        error: json.error ?? `Worker responded with HTTP ${res.status}`,
      };
    }

    return {
      ok: true,
      data: {
        isRemoteEU: json.isRemoteEU ?? false,
        confidence: json.confidence ?? "low",
        reason: json.reason ?? "",
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `Classification request failed: ${message}` };
  }
};
