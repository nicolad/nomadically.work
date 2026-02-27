import LlamaCloud from "@llamaindex/llama-cloud";

let _client: LlamaCloud | null = null;
let _pipelineId: string | null = null;

export function getLlamaClient(): LlamaCloud {
  if (!_client) {
    const apiKey = process.env.LLAMA_CLOUD_API_KEY;
    if (!apiKey) throw new Error("LLAMA_CLOUD_API_KEY is not set");
    _client = new LlamaCloud({ apiKey });
  }
  return _client;
}

/**
 * Get or create the shared "resume-index" pipeline with managed embeddings.
 * Upsert ensures idempotency — same name + project = same pipeline.
 */
export async function getResumePipelineId(): Promise<string> {
  if (_pipelineId) return _pipelineId;

  const client = getLlamaClient();

  // Get default project
  const projects = await client.projects.list();
  const project = projects[0];
  if (!project) throw new Error("No LlamaCloud project found");

  // Omit embedding_config to use LlamaCloud managed embeddings (free tier, no API key needed)
  const pipeline = await client.pipelines.upsert({
    name: "resume-index",
    project_id: project.id,
    pipeline_type: "MANAGED",
    transform_config: {
      mode: "auto",
      chunk_size: 1024,
      chunk_overlap: 128,
    },
  });

  _pipelineId = pipeline.id;
  return _pipelineId;
}
