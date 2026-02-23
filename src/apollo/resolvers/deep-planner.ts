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
};

function mapDeepPlannerTask(row: DeepPlannerTask) {
  return {
    id: row.id,
    workflowType: row.workflow_type,
    problemDescription: row.problem_description,
    context: row.context,
    status: STATUS_MAP[row.status] || row.status.toUpperCase(),
    currentStep: row.current_step,
    checkpointCount: row.checkpoint_count,
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
  },
};
