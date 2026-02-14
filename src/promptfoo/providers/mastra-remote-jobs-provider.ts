// src/promptfoo/providers/mastra-remote-jobs-provider.ts
import "dotenv/config"; // Load .env file
import fs from "node:fs";
import path from "node:path";
import {
  remoteAiJobsFilterOnlyWorkflow,
  remoteAiJobsLast24hWorldwideEuWorkflow,
} from "../../brave/remote-ai-jobs-last-24h-worldwide-eu.js";

type PromptfooContext = {
  vars: Record<string, any>;
  prompt?: string;
};

type ProviderResult = {
  output: string; // promptfoo treats output as the model output string
};

function readJson(filePath: string): any {
  const p = path.resolve(process.cwd(), filePath);
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function stableJsonStringify(obj: any): string {
  // Stable stringify (sorted keys) to reduce diff churn.
  const seen = new WeakSet<object>();

  const normalize = (v: any): any => {
    if (v === null || v === undefined) return v;
    if (typeof v !== "object") return v;

    if (seen.has(v)) return "[Circular]";
    seen.add(v);

    if (Array.isArray(v)) return v.map(normalize);

    const keys = Object.keys(v).sort();
    const out: Record<string, any> = {};
    for (const k of keys) out[k] = normalize(v[k]);
    return out;
  };

  return JSON.stringify(normalize(obj), null, 2);
}

class MastraRemoteJobsProvider {
  id() {
    return "mastra-remote-jobs";
  }

  async callApi(
    _prompt: string,
    context: PromptfooContext,
  ): Promise<ProviderResult> {
    const vars = context?.vars ?? {};
    const mode = String(vars.mode ?? "fixture");

    if (mode === "fixture") {
      const fixtureName = String(vars.fixtureName ?? "default");

      const inputPath = `src/promptfoo/fixtures/filterInput.json`;
      const fixtureInput = readJson(inputPath);

      // Allow override of nowMs for determinism.
      if (typeof vars.nowMs === "number") fixtureInput.nowMs = vars.nowMs;

      const run = await remoteAiJobsFilterOnlyWorkflow.createRun();
      const result = await run.start({ inputData: fixtureInput });

      if (result.status !== "success" || !result.result) {
        return {
          output: stableJsonStringify({
            worldwide: [],
            europe: [],
            _error: `Workflow failed: ${result.status}`,
          }),
        };
      }

      return { output: stableJsonStringify(result.result) };
    }

    if (mode === "live") {
      const input = {
        queryHint: vars.queryHint,
        maxCandidatesPerMode: vars.maxCandidatesPerMode ?? 40,
        verifyTopNWithContext: vars.verifyTopNWithContext ?? 12,
        minConfidence: vars.minConfidence ?? 0.55,
      };

      const run = await remoteAiJobsLast24hWorldwideEuWorkflow.createRun();
      const result = await run.start({ inputData: input });

      if (result.status !== "success" || !result.result) {
        return {
          output: stableJsonStringify({
            worldwide: [],
            europe: [],
            _error: `Workflow failed: ${result.status}`,
          }),
        };
      }

      return { output: stableJsonStringify(result.result) };
    }

    // Unknown mode → fail loudly but still return JSON so schema assertion shows the problem.
    return {
      output: stableJsonStringify({
        worldwide: [],
        europe: [],
        _error: `Unknown mode '${mode}'. Use 'fixture' or 'live'.`,
      }),
    };
  }
}

export default MastraRemoteJobsProvider;
