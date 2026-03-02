import type { GraphQLContext } from "../context";
import { deepPlannerTasks } from "@/db/schema";
import type { DeepPlannerTask } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { isAdminEmail } from "@/lib/admin";
import { ulid } from "ulid";

const STATUS_MAP: Record<string, string> = {
  pending: "PENDING",
  running: "RUNNING",
  complete: "COMPLETE",
  failed: "FAILED",
  cancelled: "CANCELLED",
};

// SDD pipeline phases × passes = total checkpoints
const TOTAL_STEPS = 102;

const SDD_AGENT_URL = process.env.SDD_AGENT_URL || "https://sdd-agent.eeeew.workers.dev";

function log(level: string, msg: string, data?: Record<string, unknown>) {
  const entry = { ts: new Date().toISOString(), level, msg, ...data };
  if (level === "error") console.error(JSON.stringify(entry));
  else console.log(JSON.stringify(entry));
}

function mapDeepPlannerTask(row: DeepPlannerTask) {
  const checkpointCount = row.checkpoint_count ?? 0;
  const progressPercent =
    row.status === "complete"
      ? 100
      : Math.min(99, Math.round((checkpointCount / TOTAL_STEPS) * 100));

  return {
    id: row.id,
    workflowType: row.workflow_type,
    problemDescription: row.problem_description,
    context: row.context,
    status: STATUS_MAP[row.status] || row.status.toUpperCase(),
    currentStep: row.current_step,
    checkpointCount,
    totalSteps: TOTAL_STEPS,
    progressPercent,
    outputArtifact: row.output_artifact,
    errorMessage: row.error_message,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function assertAdmin(context: GraphQLContext) {
  if (!context.userId || !isAdminEmail(context.userEmail)) {
    throw new Error("Forbidden");
  }
}

export const deepPlannerResolvers = {
  Query: {
    async deepPlannerTasks(
      _parent: unknown,
      _args: unknown,
      context: GraphQLContext
    ) {
      assertAdmin(context);
      const rows = await context.db
        .select()
        .from(deepPlannerTasks)
        .orderBy(desc(deepPlannerTasks.created_at));
      return rows.map(mapDeepPlannerTask);
    },

    async deepPlannerTask(
      _parent: unknown,
      args: { id: string },
      context: GraphQLContext
    ) {
      assertAdmin(context);
      const rows = await context.db
        .select()
        .from(deepPlannerTasks)
        .where(eq(deepPlannerTasks.id, args.id));
      if (rows.length === 0) return null;
      return mapDeepPlannerTask(rows[0]);
    },
  },

  Mutation: {
    async createDeepPlannerTask(
      _parent: unknown,
      args: {
        workflowType: string;
        problemDescription: string;
        context?: string | null;
      },
      context: GraphQLContext
    ) {
      assertAdmin(context);
      const now = new Date().toISOString();
      const id = ulid();
      const [row] = await context.db
        .insert(deepPlannerTasks)
        .values({
          id,
          workflow_type: args.workflowType,
          problem_description: args.problemDescription,
          context: args.context ?? null,
          status: "pending",
          checkpoint_count: 0,
          created_at: now,
          updated_at: now,
        })
        .returning();
      return mapDeepPlannerTask(row);
    },

    async triggerDeepPlannerTask(
      _parent: unknown,
      args: { id: string },
      context: GraphQLContext
    ) {
      assertAdmin(context);

      // Verify task exists
      const rows = await context.db
        .select()
        .from(deepPlannerTasks)
        .where(eq(deepPlannerTasks.id, args.id));
      if (rows.length === 0) {
        throw new Error("Task not found");
      }
      const task = rows[0];
      if (task.status === "running") {
        throw new Error("Task is already running");
      }

      // Mark task as running
      const now = new Date().toISOString();
      const [updated] = await context.db
        .update(deepPlannerTasks)
        .set({
          status: "running",
          current_step: "Initializing SDD pipeline",
          started_at: task.started_at ?? now,
          updated_at: now,
        })
        .where(eq(deepPlannerTasks.id, args.id))
        .returning();

      log("info", "Triggering SDD pipeline", {
        taskId: args.id,
        workflowType: task.workflow_type,
        sddAgentUrl: SDD_AGENT_URL,
      });

      // Parse context for repo URLs
      let parsedContext: Record<string, string> = {};
      try {
        if (task.context) parsedContext = JSON.parse(task.context);
      } catch {}

      // Fire-and-forget: call sdd-agent /sdd/pipeline
      // The worker updates D1 directly as it progresses through phases
      const pipelineBody = {
        name: `dp-${args.id}`,
        description: task.problem_description,
        workflow_type: task.workflow_type,
        context: [
          task.problem_description,
          parsedContext.repoUrl ? `Base repo: ${parsedContext.repoUrl}` : "",
          parsedContext.integrationRepoUrl ? `Integration repo: ${parsedContext.integrationRepoUrl}` : "",
          parsedContext.note || "",
        ].filter(Boolean).join("\n"),
      };

      fetch(`${SDD_AGENT_URL}/sdd/pipeline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pipelineBody),
      })
        .then(async (res) => {
          const body = await res.text();
          const completedAt = new Date().toISOString();

          if (!res.ok) {
            log("error", "SDD pipeline returned error", {
              taskId: args.id,
              status: res.status,
              body: body.slice(0, 500),
            });
            await context.db
              .update(deepPlannerTasks)
              .set({
                status: "failed",
                error_message: `SDD agent error (${res.status}): ${body.slice(0, 200)}`,
                completed_at: completedAt,
                updated_at: completedAt,
              })
              .where(eq(deepPlannerTasks.id, args.id));
            return;
          }

          log("info", "SDD pipeline completed", { taskId: args.id });

          // Parse result and store as output artifact
          let outputArtifact = body;
          try {
            const parsed = JSON.parse(body);
            if (parsed?.data?.results) {
              outputArtifact = parsed.data.results
                .map((r: { phase?: string; result?: string }) =>
                  `## Phase: ${r.phase || "unknown"}\n\n${r.result || ""}`
                )
                .join("\n\n---\n\n");
            }
          } catch {
            // Use raw body as artifact
          }

          await context.db
            .update(deepPlannerTasks)
            .set({
              status: "complete",
              output_artifact: outputArtifact,
              checkpoint_count: TOTAL_STEPS,
              current_step: "Complete",
              completed_at: completedAt,
              updated_at: completedAt,
            })
            .where(eq(deepPlannerTasks.id, args.id));
        })
        .catch(async (err) => {
          const msg = err instanceof Error ? err.message : String(err);
          log("error", "SDD pipeline fetch failed", { taskId: args.id, error: msg });
          const failedAt = new Date().toISOString();
          try {
            await context.db
              .update(deepPlannerTasks)
              .set({
                status: "failed",
                error_message: `Worker unreachable: ${msg}`,
                completed_at: failedAt,
                updated_at: failedAt,
              })
              .where(eq(deepPlannerTasks.id, args.id));
          } catch (dbErr) {
            log("error", "Failed to update task status after error", {
              taskId: args.id,
              dbError: String(dbErr),
            });
          }
        });

      return mapDeepPlannerTask(updated);
    },

    async cancelDeepPlannerTask(
      _parent: unknown,
      args: { id: string },
      context: GraphQLContext
    ) {
      assertAdmin(context);

      const rows = await context.db
        .select()
        .from(deepPlannerTasks)
        .where(eq(deepPlannerTasks.id, args.id));
      if (rows.length === 0) {
        throw new Error("Task not found");
      }
      const task = rows[0];
      if (task.status !== "running") {
        throw new Error("Only running tasks can be cancelled");
      }

      const now = new Date().toISOString();
      const [updated] = await context.db
        .update(deepPlannerTasks)
        .set({
          status: "cancelled",
          error_message: "Cancelled by admin",
          completed_at: now,
          updated_at: now,
        })
        .where(eq(deepPlannerTasks.id, args.id))
        .returning();

      return mapDeepPlannerTask(updated);
    },
  },
};
