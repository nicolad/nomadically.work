import type { GraphQLContext } from "../../context";
import { isAdminEmail } from "@/lib/admin";

/**
 * GraphQL mutation resolver to trigger the classify-jobs Cloudflare Worker.
 *
 * Follows the langchain-cloudflare pattern of calling CF workers via HTTP POST
 * with Bearer token authentication (see test_worker_integration.py).
 *
 * The worker runs DeepSeek-based classification for remote-EU eligibility
 * on all unclassified jobs in the D1 database.
 *
 * @param _parent - Parent resolver (unused)
 * @param args - Mutation arguments
 * @param args.limit - Optional max number of jobs to process (default: worker decides)
 * @param context - GraphQL context with auth info
 * @returns ProcessAllJobsResponse with success status, stats, and message
 */
export async function processAllJobs(
  _parent: any,
  args: { limit?: number },
  context: GraphQLContext,
) {
  // Require authentication
  if (!context.userId) {
    return {
      success: false,
      message: "Unauthorized — sign in required",
      enhanced: null,
      enhanceErrors: null,
      processed: null,
      euRemote: null,
      nonEuRemote: null,
      errors: null,
    };
  }

  // Require admin privileges
  if (!isAdminEmail(context.userEmail)) {
    return {
      success: false,
      message: "Forbidden — admin access required",
      enhanced: null,
      enhanceErrors: null,
      processed: null,
      euRemote: null,
      nonEuRemote: null,
      errors: null,
    };
  }

  // Resolve worker URL — the classify-jobs CF worker
  const workerUrl =
    process.env.CLASSIFY_JOBS_WORKER_URL ??
    process.env.NEXT_PUBLIC_CLASSIFY_JOBS_WORKER_URL;

  if (!workerUrl) {
    return {
      success: false,
      message:
        "CLASSIFY_JOBS_WORKER_URL is not configured. Set it in your environment.",
      enhanced: null,
      enhanceErrors: null,
      processed: null,
      euRemote: null,
      nonEuRemote: null,
      errors: null,
    };
  }

  const cronSecret = process.env.CRON_SECRET;

  try {
    console.log(
      `🔄 [ProcessAllJobs] Triggering classify-jobs worker at ${workerUrl}`,
    );

    // Following the langchain-cloudflare pattern:
    //   response = requests.post(url, json=payload, headers={"Authorization": f"Bearer {secret}"})
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

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
      console.error(
        `❌ [ProcessAllJobs] Worker returned ${response.status}: ${errorText}`,
      );
      return {
        success: false,
        message: `Worker returned ${response.status}: ${errorText}`,
        enhanced: null,
        enhanceErrors: null,
        processed: null,
        euRemote: null,
        nonEuRemote: null,
        errors: null,
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

    console.log(
      `✅ [ProcessAllJobs] Worker response: ${result.message ?? "OK"}${result.queued ? " (queued)" : ""}`,
    );

    return {
      success: result.success,
      message: result.message ?? "Processing queued",
      enhanced: result.stats?.enhanced ?? null,
      enhanceErrors: result.stats?.enhanceErrors ?? null,
      processed: result.stats?.processed ?? null,
      euRemote: result.stats?.euRemote ?? null,
      nonEuRemote: result.stats?.nonEuRemote ?? null,
      errors: result.stats?.errors ?? null,
    };
  } catch (error) {
    console.error("❌ [ProcessAllJobs] Error calling worker:", error);
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Unknown error calling worker",
      enhanced: null,
      enhanceErrors: null,
      processed: null,
      euRemote: null,
      nonEuRemote: null,
      errors: null,
    };
  }
}
