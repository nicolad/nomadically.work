// src/langfuse/scores.ts
import { getLangfuseClient } from "./index";

export type ScoreDataType = "NUMERIC" | "CATEGORICAL" | "BOOLEAN";

export async function createScore(input: {
  traceId: string;
  observationId?: string;
  sessionId?: string;

  name: string; // e.g. "helpfulness", "correctness"
  value: number | string; // boolean => 0/1
  dataType?: ScoreDataType;
  comment?: string;

  // idempotency key so "update feedback" overwrites the same score
  id?: string;
  configId?: string;
}) {
  const langfuse = getLangfuseClient();

  langfuse.score.create({
    traceId: input.traceId,
    observationId: input.observationId,
    sessionId: input.sessionId,
    name: input.name,
    value: input.value as any,
    dataType: input.dataType,
    comment: input.comment,
    id: input.id,
    configId: input.configId,
  });

  // Important for short-lived runtimes (serverless/edge)
  await langfuse.flush();
}
