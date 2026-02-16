// src/langfuse/scores.ts
import {
  LANGFUSE_BASE_URL,
  LANGFUSE_PUBLIC_KEY,
  LANGFUSE_SECRET_KEY,
} from "@/config/env";

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
  const baseUrl = LANGFUSE_BASE_URL.replace(/\/+$/, "");
  const url = new URL(`${baseUrl}/api/public/scores`);

  const response = await fetch(url.toString(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${btoa(
        `${LANGFUSE_PUBLIC_KEY}:${LANGFUSE_SECRET_KEY}`,
      )}`,
    },
    body: JSON.stringify({
      traceId: input.traceId,
      observationId: input.observationId,
      sessionId: input.sessionId,
      name: input.name,
      value: input.value,
      dataType: input.dataType,
      comment: input.comment,
      id: input.id,
      configId: input.configId,
    }),
  });

  if (!response.ok) {
    throw new Error(`Langfuse API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}
