// src/langfuse/usage.ts
import {
  LANGFUSE_BASE_URL,
  LANGFUSE_PUBLIC_KEY,
  LANGFUSE_SECRET_KEY,
} from "@/config/env";

export type ObservationUsageItem = {
  traceId: string;
  observationId: string;
  startTime: string;
  environment?: string;
  userId?: string;
  sessionId?: string;
  promptName?: string;
  promptVersion?: number | null;
};

function basicAuthHeader(publicKey: string, secretKey: string) {
  const token = Buffer.from(`${publicKey}:${secretKey}`).toString("base64");
  return `Basic ${token}`;
}

/**
 * Fetch recent generations for a user using Langfuse Observations API v2.
 * This replaces the in-memory usage log with real data from Langfuse.
 */
export async function getRecentGenerationsForUser(params: {
  userId: string;
  limit?: number;
  environment?: string;
}): Promise<ObservationUsageItem[]> {
  const limit = Math.min(params.limit ?? 50, 1000);

  const baseUrl = LANGFUSE_BASE_URL.replace(/\/+$/, "");
  const url = new URL(`${baseUrl}/api/public/v2/observations`);

  url.searchParams.set("type", "GENERATION");
  url.searchParams.set("userId", params.userId);
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("fields", "core,basic,prompt,time");

  if (params.environment) {
    url.searchParams.set("environment", params.environment);
  }

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: basicAuthHeader(LANGFUSE_PUBLIC_KEY, LANGFUSE_SECRET_KEY),
    },
  });

  if (!res.ok) {
    throw new Error(
      `Langfuse observations error: ${res.status} ${res.statusText}`,
    );
  }

  const json = await res.json();
  const data = Array.isArray(json?.data) ? json.data : [];

  return data.map((o: any) => ({
    traceId: o.traceId,
    observationId: o.id,
    startTime: o.startTime,
    environment: o.environment,
    userId: o.userId,
    sessionId: o.sessionId,
    promptName: o.promptName,
    promptVersion: o.promptVersion ?? null,
  }));
}
