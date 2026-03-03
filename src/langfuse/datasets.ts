// src/langfuse/datasets.ts
//
// Langfuse Datasets helpers using the official SDK.

import { Langfuse } from "langfuse";

function getClient() {
  return new Langfuse({
    secretKey: process.env.LANGFUSE_SECRET_KEY,
    publicKey: process.env.LANGFUSE_PUBLIC_KEY,
    baseUrl: process.env.LANGFUSE_BASE_URL,
  });
}

/**
 * Create a dataset if it doesn't exist yet.
 */
export async function ensureDataset(name: string, description?: string) {
  const lf = getClient();
  await lf.createDataset({ name, description });
}

/**
 * Upsert a dataset item (test case) by id.
 */
export async function upsertDatasetItem(input: {
  datasetName: string;
  id: string;
  input: unknown;
  expectedOutput: unknown;
  metadata?: Record<string, unknown>;
}) {
  const lf = getClient();
  await lf.createDatasetItem({
    datasetName: input.datasetName,
    id: input.id,
    input: input.input,
    expectedOutput: input.expectedOutput,
    metadata: input.metadata,
  });
}

/**
 * Link a trace to a dataset item within a named run.
 */
export async function createDatasetRunItem(input: {
  datasetItemId: string;
  runName: string;
  traceId: string;
  observationId?: string;
}) {
  const lf = getClient();
  await lf.createDatasetRunItem({
    datasetItemId: input.datasetItemId,
    runName: input.runName,
    traceId: input.traceId,
    observationId: input.observationId,
  });
}
