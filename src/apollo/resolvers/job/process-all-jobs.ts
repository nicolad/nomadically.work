import type { GraphQLContext } from "../../context";
import { isAdminEmail } from "@/lib/admin";
import { tasks } from "@trigger.dev/sdk/v3";
import type { enhanceJobsOnDemand } from "@/trigger/enhance-all";

const EMPTY_STATS = {
  enhanced: null,
  enhanceErrors: null,
  processed: null,
  euRemote: null,
  nonEuRemote: null,
  errors: null,
} as const;

/**
 * GraphQL mutation resolver: one-click enhancement + classification.
 *
 * 1. Fires off Trigger.dev enhancement (fan-out to individual ATS jobs) — fire-and-forget
 * 2. Calls the classify-jobs Cloudflare Worker (waits for response)
 *
 * Both pipelines run concurrently. Enhancement enriches jobs from Greenhouse/Ashby APIs;
 * classification runs the DeepSeek remote-EU pipeline on all unclassified jobs.
 */
export async function processAllJobs(
  _parent: any,
  args: { limit?: number },
  context: GraphQLContext,
) {
  // Require authentication
  if (!context.userId) {
    return { success: false, message: "Unauthorized — sign in required", ...EMPTY_STATS };
  }

  // Require admin privileges
  if (!isAdminEmail(context.userEmail)) {
    return { success: false, message: "Forbidden — admin access required", ...EMPTY_STATS };
  }

  // Resolve worker URL — the classify-jobs CF worker
  const workerUrl =
    process.env.CLASSIFY_JOBS_WORKER_URL ??
    process.env.NEXT_PUBLIC_CLASSIFY_JOBS_WORKER_URL;

  if (!workerUrl) {
    return {
      success: false,
      message: "CLASSIFY_JOBS_WORKER_URL is not configured. Set it in your environment.",
      ...EMPTY_STATS,
    };
  }

  const cronSecret = process.env.CRON_SECRET;
  const messages: string[] = [];

  // --- Step 1: Trigger.dev enhancement (fire-and-forget) ---
  try {
    const handle = await tasks.trigger<typeof enhanceJobsOnDemand>(
      "enhance-jobs-on-demand",
      { limit: args.limit ?? 200 },
    );
    console.log(`[ProcessAllJobs] Enhancement triggered: ${handle.id}`);
    messages.push(`Enhancement triggered (run ${handle.id})`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[ProcessAllJobs] Enhancement trigger failed: ${msg}`);
    messages.push(`Enhancement skipped: ${msg}`);
  }

  // --- Step 2: Classification worker ---
  try {
    console.log(`[ProcessAllJobs] Triggering classify-jobs worker at ${workerUrl}`);

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (cronSecret) {
      headers["Authorization"] = `Bearer ${cronSecret}`;
    }

    const body: Record<string, unknown> = {};
    if (args.limit != null) {
      body.limit = args.limit;
    }

    const response = await fetch(workerUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[ProcessAllJobs] Worker returned ${response.status}: ${errorText}`);
      messages.push(`Classification failed: ${response.status}`);
      return {
        success: false,
        message: messages.join(" | "),
        ...EMPTY_STATS,
      };
    }

    const result = (await response.json()) as {
      success: boolean;
      message?: string;
      queued?: boolean;
      stats?: {
        enhanced?: number;
        enhanceErrors?: number;
        processed?: number;
        euRemote?: number;
        nonEuRemote?: number;
        errors?: number;
      };
    };

    console.log(`[ProcessAllJobs] Worker response: ${result.message ?? "OK"}${result.queued ? " (queued)" : ""}`);
    messages.push(result.message ?? "Classification queued");

    return {
      success: result.success,
      message: messages.join(" | "),
      enhanced: result.stats?.enhanced ?? null,
      enhanceErrors: result.stats?.enhanceErrors ?? null,
      processed: result.stats?.processed ?? null,
      euRemote: result.stats?.euRemote ?? null,
      nonEuRemote: result.stats?.nonEuRemote ?? null,
      errors: result.stats?.errors ?? null,
    };
  } catch (error) {
    console.error("[ProcessAllJobs] Error calling worker:", error);
    messages.push(error instanceof Error ? error.message : "Unknown error");
    return {
      success: false,
      message: messages.join(" | "),
      ...EMPTY_STATS,
    };
  }
}
