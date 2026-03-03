// src/langfuse/datasets.ts
//
// REST-based Langfuse Datasets helpers (Edge Runtime compatible).
// Follows the same fetch pattern as scores.ts and index.ts.

import {
  LANGFUSE_BASE_URL,
  LANGFUSE_PUBLIC_KEY,
  LANGFUSE_SECRET_KEY,
} from "@/config/env";

function authHeader() {
  return `Basic ${btoa(`${LANGFUSE_PUBLIC_KEY}:${LANGFUSE_SECRET_KEY}`)}`;
}

function baseUrl() {
  return LANGFUSE_BASE_URL.replace(/\/+$/, "");
}

/**
 * Create a dataset if it doesn't exist yet.
 * Langfuse returns 200 even if the dataset already exists with the same name.
 */
export async function ensureDataset(
  name: string,
  description?: string,
) {
  const res = await fetch(`${baseUrl()}/api/public/v2/datasets`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader(),
    },
    body: JSON.stringify({ name, description }),
  });

  if (!res.ok) {
    const body = await res.text();
    // 409 = already exists, which is fine
    if (res.status !== 409) {
      throw new Error(`ensureDataset failed: ${res.status} ${body}`);
    }
  }
}

/**
 * Upsert a dataset item (test case) by id.
 * If the id already exists in the dataset, Langfuse updates it.
 */
export async function upsertDatasetItem(input: {
  datasetName: string;
  id: string;
  input: unknown;
  expectedOutput: unknown;
  metadata?: Record<string, unknown>;
}) {
  const res = await fetch(`${baseUrl()}/api/public/dataset-items`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader(),
    },
    body: JSON.stringify({
      datasetName: input.datasetName,
      id: input.id,
      input: input.input,
      expectedOutput: input.expectedOutput,
      metadata: input.metadata,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`upsertDatasetItem failed: ${res.status} ${body}`);
  }

  return res.json();
}

/**
 * Link a trace to a dataset item within a named run.
 * This is what creates the experiment in the Langfuse Datasets UI.
 */
export async function createDatasetRunItem(input: {
  datasetItemId: string;
  runName: string;
  traceId: string;
  observationId?: string;
}) {
  const res = await fetch(`${baseUrl()}/api/public/dataset-run-items`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader(),
    },
    body: JSON.stringify({
      datasetItemId: input.datasetItemId,
      runName: input.runName,
      traceId: input.traceId,
      observationId: input.observationId,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`createDatasetRunItem failed: ${res.status} ${body}`);
  }

  return res.json();
}
